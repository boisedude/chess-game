/**
 * Chess engine.
 *
 * 0x88 mailbox board with make/unmake, Zobrist hashing, and an iterative
 * deepening principal variation search: transposition table, null move,
 * late move reductions, futility and late move pruning, killer and history
 * ordering, check extensions, and a capture quiescence search. Evaluation is
 * tapered between middlegame and endgame piece-square tables (PeSTO values)
 * with pawn structure, mobility, bishop pair, rook files, king shelter and
 * a mop-up term for won endings.
 *
 * The rules module stays the authority on legality for the UI. This file
 * only has to agree with it, which the tests check by perft and by fuzzing.
 *
 * Exports: findBestMove, perft, engineLegalMoves.
 */

import type { GameState, PieceType, Player, Position } from '@/types/chess.types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EngineInput = Pick<
  GameState,
  'board' | 'castlingRights' | 'enPassantSquare' | 'halfmoveClock' | 'moveHistory'
>

export interface EngineOptions {
  /** Wall-clock budget. Depth 1 always completes. Default: no limit. */
  timeMs?: number
  /** Stop after this depth. Default 64. */
  maxDepth?: number
  /**
   * When above zero, every root move is scored at maxDepth and the answer is
   * drawn at random from the moves within this many centipawns of the best.
   */
  pickMargin?: number
  /** Random source for pickMargin, injectable for tests. */
  random?: () => number
}

export interface EngineMove {
  from: Position
  to: Position
  promotedTo?: PieceType
}

export interface EngineResult extends EngineMove {
  /** Centipawns from the mover's point of view; mate scores are near 30000. */
  score: number
  depth: number
  nodes: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAWN = 1
const KNIGHT = 2
const BISHOP = 3
const ROOK = 4
const QUEEN = 5
const KING = 6
const BLACK = 8

const MATE = 30000
const MATE_BOUND = 29000
const INF = 32000
const MAX_PLY = 96
const MOVES_PER_PLY = 256
const STACK = 2048

const FLAG_EP = 1
const FLAG_CASTLE = 2
const FLAG_DOUBLE = 3

const KNIGHT_DELTAS = [-33, -31, -18, -14, 14, 18, 31, 33]
const KING_DELTAS = [-17, -16, -15, -1, 1, 15, 16, 17]
const BISHOP_DELTAS = [-17, -15, 15, 17]
const ROOK_DELTAS = [-16, -1, 1, 16]

const TYPE_NAMES: PieceType[] = ['pawn', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king']
const TYPE_CODES: Record<PieceType, number> = {
  pawn: PAWN,
  knight: KNIGHT,
  bishop: BISHOP,
  rook: ROOK,
  queen: QUEEN,
  king: KING,
}

/** Rough values for ordering and delta pruning only. */
const ORDER_VALUE = [0, 100, 320, 330, 500, 950, 20000]

// PeSTO material and piece-square tables, a8 first (row 0 is rank 8).
const MG_VALUE = [0, 82, 337, 365, 477, 1025, 0]
const EG_VALUE = [0, 94, 281, 297, 512, 936, 0]
const PHASE_INC = [0, 0, 1, 1, 2, 4, 0]

// prettier-ignore
const MG_TABLES: number[][] = [
  [],
  [
      0,   0,   0,   0,   0,   0,  0,   0,
     98, 134,  61,  95,  68, 126, 34, -11,
     -6,   7,  26,  31,  65,  56, 25, -20,
    -14,  13,   6,  21,  23,  12, 17, -23,
    -27,  -2,  -5,  12,  17,   6, 10, -25,
    -26,  -4,  -4, -10,   3,   3, 33, -12,
    -35,  -1, -20, -23, -15,  24, 38, -22,
      0,   0,   0,   0,   0,   0,  0,   0,
  ],
  [
    -167, -89, -34, -49,  61, -97, -15, -107,
     -73, -41,  72,  36,  23,  62,   7,  -17,
     -47,  60,  37,  65,  84, 129,  73,   44,
      -9,  17,  19,  53,  37,  69,  18,   22,
     -13,   4,  16,  13,  28,  19,  21,   -8,
     -23,  -9,  12,  10,  19,  17,  25,  -16,
     -29, -53, -12,  -3,  -1,  18, -14,  -19,
    -105, -21, -58, -33, -17, -28, -19,  -23,
  ],
  [
    -29,   4, -82, -37, -25, -42,   7,  -8,
    -26,  16, -18, -13,  30,  59,  18, -47,
    -16,  37,  43,  40,  35,  50,  37,  -2,
     -4,   5,  19,  50,  37,  37,   7,  -2,
     -6,  13,  13,  26,  34,  12,  10,   4,
      0,  15,  15,  15,  14,  27,  18,  10,
      4,  15,  16,   0,   7,  21,  33,   1,
    -33,  -3, -14, -21, -13, -12, -39, -21,
  ],
  [
     32,  42,  32,  51, 63,  9,  31,  43,
     27,  32,  58,  62, 80, 67,  26,  44,
     -5,  19,  26,  36, 17, 45,  61,  16,
    -24, -11,   7,  26, 24, 35,  -8, -20,
    -36, -26, -12,  -1,  9, -7,   6, -23,
    -45, -25, -16, -17,  3,  0,  -5, -33,
    -44, -16, -20,  -9, -1, 11,  -6, -71,
    -19, -13,   1,  17, 16,  7, -37, -26,
  ],
  [
    -28,   0,  29,  12,  59,  44,  43,  45,
    -24, -39,  -5,   1, -16,  57,  28,  54,
    -13, -17,   7,   8,  29,  56,  47,  57,
    -27, -27, -16, -16,  -1,  17,  -2,   1,
     -9, -26,  -9, -10,  -2,  -4,   3,  -3,
    -14,   2, -11,  -2,  -5,   2,  14,   5,
    -35,  -8,  11,   2,   8,  15,  -3,   1,
     -1, -18,  -9,  10, -15, -25, -31, -50,
  ],
  [
    -65,  23,  16, -15, -56, -34,   2,  13,
     29,  -1, -20,  -7,  -8,  -4, -38, -29,
     -9,  24,   2, -16, -20,   6,  22, -22,
    -17, -20, -12, -27, -30, -25, -14, -36,
    -49,  -1, -27, -39, -46, -44, -33, -51,
    -14, -14, -22, -46, -44, -30, -15, -27,
      1,   7,  -8, -64, -43, -16,   9,   8,
    -15,  36,  12, -54,   8, -28,  24,  14,
  ],
]

// prettier-ignore
const EG_TABLES: number[][] = [
  [],
  [
      0,   0,   0,   0,   0,   0,   0,   0,
    178, 173, 158, 134, 147, 132, 165, 187,
     94, 100,  85,  67,  56,  53,  82,  84,
     32,  24,  13,   5,  -2,   4,  17,  17,
     13,   9,  -3,  -7,  -7,  -8,   3,  -1,
      4,   7,  -6,   1,   0,  -5,  -1,  -8,
     13,   8,   8,  10,  13,   0,   2,  -7,
      0,   0,   0,   0,   0,   0,   0,   0,
  ],
  [
    -58, -38, -13, -28, -31, -27, -63, -99,
    -25,  -8, -25,  -2,  -9, -25, -24, -52,
    -24, -20,  10,   9,  -1,  -9, -19, -41,
    -17,   3,  22,  22,  22,  11,   8, -18,
    -18,  -6,  16,  25,  16,  17,   4, -18,
    -23,  -3,  -1,  15,  10,  -3, -20, -22,
    -42, -20, -10,  -5,  -2, -20, -23, -44,
    -29, -51, -23, -15, -22, -18, -50, -64,
  ],
  [
    -14, -21, -11,  -8, -7,  -9, -17, -24,
     -8,  -4,   7, -12, -3, -13,  -4, -14,
      2,  -8,   0,  -1, -2,   6,   0,   4,
     -3,   9,  12,   9, 14,  10,   3,   2,
     -6,   3,  13,  19,  7,  10,  -3,  -9,
    -12,  -3,   8,  10, 13,   3,  -7, -15,
    -14, -18,  -7,  -1,  4,  -9, -15, -27,
    -23,  -9, -23,  -5, -9, -16,  -5, -17,
  ],
  [
    13, 10, 18, 15, 12,  12,   8,   5,
    11, 13, 13, 11, -3,   3,   8,   3,
     7,  7,  7,  5,  4,  -3,  -5,  -3,
     4,  3, 13,  1,  2,   1,  -1,   2,
     3,  5,  8,  4, -5,  -6,  -8, -11,
    -4,  0, -5, -1, -7, -12,  -8, -16,
    -6, -6,  0,  2, -9,  -9, -11,  -3,
    -9,  2,  3, -1, -5, -13,   4, -20,
  ],
  [
     -9,  22,  22,  27,  27,  19,  10,  20,
    -17,  20,  32,  41,  58,  25,  30,   0,
    -20,   6,   9,  49,  47,  35,  19,   9,
      3,  22,  24,  45,  57,  40,  57,  36,
    -18,  28,  19,  47,  31,  34,  39,  23,
    -16, -27,  15,   6,   9,  17,  10,   5,
    -22, -23, -30, -16, -16, -23, -36, -32,
    -33, -28, -22, -43,  -5, -32, -20, -41,
  ],
  [
    -74, -35, -18, -18, -11,  15,   4, -17,
    -12,  17,  14,  17,  17,  38,  23,  11,
     10,  17,  23,  15,  20,  45,  44,  13,
     -8,  22,  24,  27,  26,  33,  26,   3,
    -18,  -4,  21,  24,  27,  23,   9, -11,
    -19,  -3,  11,  21,  23,  16,   7,  -9,
    -27, -11,   4,  13,  14,   4,  -5, -17,
    -53, -34, -21, -11, -28, -14, -24, -43,
  ],
]

/** Passed pawn bonus by ranks advanced from the start square (0 to 5). */
const PASSED_MG = [0, 0, 5, 12, 25, 40, 60]
const PASSED_EG = [0, 5, 12, 28, 50, 85, 125]

// ---------------------------------------------------------------------------
// Tables built once
// ---------------------------------------------------------------------------

/** Signed (white positive) piece-square values including material, by piece * 128 + square. */
const PST_MG = new Int16Array(16 * 128)
const PST_EG = new Int16Array(16 * 128)
const Z_LO = new Int32Array(16 * 128)
const Z_HI = new Int32Array(16 * 128)
const Z_CASTLE_LO = new Int32Array(16)
const Z_CASTLE_HI = new Int32Array(16)
const Z_EP_LO = new Int32Array(8)
const Z_EP_HI = new Int32Array(8)
let Z_SIDE_LO = 0
let Z_SIDE_HI = 0
const CASTLE_MASK = new Int8Array(128).fill(15)
const LMR = new Int8Array(64 * 64)

;(function init() {
  for (let type = PAWN; type <= KING; type++) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = row * 16 + col
        const w = row * 8 + col
        const b = (7 - row) * 8 + col
        PST_MG[type * 128 + sq] = MG_VALUE[type] + MG_TABLES[type][w]
        PST_EG[type * 128 + sq] = EG_VALUE[type] + EG_TABLES[type][w]
        PST_MG[(type | BLACK) * 128 + sq] = -(MG_VALUE[type] + MG_TABLES[type][b])
        PST_EG[(type | BLACK) * 128 + sq] = -(EG_VALUE[type] + EG_TABLES[type][b])
      }
    }
  }

  // Fixed seed: hashes only need to be well spread, and a fixed seed keeps runs repeatable.
  let s = 0x9e3779b9
  const rnd = () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return s | 0
  }
  for (let i = 0; i < 16 * 128; i++) {
    Z_LO[i] = rnd()
    Z_HI[i] = rnd()
  }
  for (let i = 0; i < 16; i++) {
    Z_CASTLE_LO[i] = rnd()
    Z_CASTLE_HI[i] = rnd()
  }
  for (let i = 0; i < 8; i++) {
    Z_EP_LO[i] = rnd()
    Z_EP_HI[i] = rnd()
  }
  Z_SIDE_LO = rnd()
  Z_SIDE_HI = rnd()

  // Castling bits: 1 white kingside, 2 white queenside, 4 black kingside, 8 black queenside.
  CASTLE_MASK[116] = 15 & ~3
  CASTLE_MASK[119] = 15 & ~1
  CASTLE_MASK[112] = 15 & ~2
  CASTLE_MASK[4] = 15 & ~12
  CASTLE_MASK[7] = 15 & ~4
  CASTLE_MASK[0] = 15 & ~8

  for (let d = 1; d < 64; d++) {
    for (let n = 1; n < 64; n++) {
      LMR[d * 64 + n] = Math.floor(0.6 + (Math.log(d) * Math.log(n)) / 2.3)
    }
  }
})()

// ---------------------------------------------------------------------------
// Position state (module level: one search runs at a time)
// ---------------------------------------------------------------------------

const board = new Int8Array(128)
const kingSq = new Int32Array(2)
const cnt = new Int8Array(16)
let side = 0
let castle = 0
let ep = -1
let half = 0
let hashLo = 0
let hashHi = 0
let mg = 0
let eg = 0
let phase = 0

/** History and undo stacks share one index: hp positions precede the current one. */
let hp = 0
const uCap = new Int8Array(STACK)
const uCastle = new Int8Array(STACK)
const uEp = new Int16Array(STACK)
const uHalf = new Int16Array(STACK)
const uLo = new Int32Array(STACK)
const uHi = new Int32Array(STACK)
const uMg = new Int32Array(STACK)
const uEg = new Int32Array(STACK)

function put(piece: number, sq: number): void {
  board[sq] = piece
  const i = piece * 128 + sq
  hashLo ^= Z_LO[i]
  hashHi ^= Z_HI[i]
  mg += PST_MG[i]
  eg += PST_EG[i]
  phase += PHASE_INC[piece & 7]
  cnt[piece]++
}

function take(piece: number, sq: number): void {
  board[sq] = 0
  const i = piece * 128 + sq
  hashLo ^= Z_LO[i]
  hashHi ^= Z_HI[i]
  mg -= PST_MG[i]
  eg -= PST_EG[i]
  phase -= PHASE_INC[piece & 7]
  cnt[piece]--
}

function clearPosition(): void {
  board.fill(0)
  cnt.fill(0)
  side = 0
  castle = 0
  ep = -1
  half = 0
  hashLo = 0
  hashHi = 0
  mg = 0
  eg = 0
  phase = 0
  hp = 0
  kingSq[0] = -1
  kingSq[1] = -1
}

function setCastle(rights: number): void {
  castle = rights
  hashLo ^= Z_CASTLE_LO[castle]
  hashHi ^= Z_CASTLE_HI[castle]
}

function setStartPosition(): void {
  clearPosition()
  const back = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK]
  for (let col = 0; col < 8; col++) {
    put(back[col] | BLACK, col)
    put(PAWN | BLACK, 16 + col)
    put(PAWN, 96 + col)
    put(back[col], 112 + col)
  }
  kingSq[0] = 116
  kingSq[1] = 4
  setCastle(15)
}

/** Is `sq` attacked by a piece of colour `by` (0 white, 1 black)? */
function attacked(sq: number, by: number): boolean {
  const own = by << 3
  if (by === 0) {
    let s = sq + 15
    if (!(s & 0x88) && board[s] === PAWN) return true
    s = sq + 17
    if (!(s & 0x88) && board[s] === PAWN) return true
  } else {
    let s = sq - 15
    if (!(s & 0x88) && board[s] === (PAWN | BLACK)) return true
    s = sq - 17
    if (!(s & 0x88) && board[s] === (PAWN | BLACK)) return true
  }
  const knight = own | KNIGHT
  const king = own | KING
  for (let i = 0; i < 8; i++) {
    let s = sq + KNIGHT_DELTAS[i]
    if (!(s & 0x88) && board[s] === knight) return true
    s = sq + KING_DELTAS[i]
    if (!(s & 0x88) && board[s] === king) return true
  }
  const queen = own | QUEEN
  const bishop = own | BISHOP
  const rook = own | ROOK
  for (let i = 0; i < 4; i++) {
    let d = BISHOP_DELTAS[i]
    let s = sq + d
    while (!(s & 0x88)) {
      const p = board[s]
      if (p) {
        if (p === bishop || p === queen) return true
        break
      }
      s += d
    }
    d = ROOK_DELTAS[i]
    s = sq + d
    while (!(s & 0x88)) {
      const p = board[s]
      if (p) {
        if (p === rook || p === queen) return true
        break
      }
      s += d
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Moves: from | to << 7 | promotion << 14 | flag << 17
// ---------------------------------------------------------------------------

const moveList = new Int32Array(MAX_PLY * MOVES_PER_PLY)
const moveScore = new Int32Array(MAX_PLY * MOVES_PER_PLY)

/** Pseudo-legal moves into moveList at `base`. Returns the count. */
function generate(base: number, capturesOnly: boolean): number {
  let n = base
  const own = side << 3
  const forward = side === 0 ? -16 : 16
  const startRow = side === 0 ? 6 : 1
  const promoRow = side === 0 ? 0 : 7

  for (let row = 0; row < 8; row++) {
    for (let from = row * 16; from < row * 16 + 8; from++) {
      const p = board[from]
      if (!p || (p & BLACK) !== own) continue
      const type = p & 7

      if (type === PAWN) {
        const one = from + forward
        const promotes = one >> 4 === promoRow
        if (!board[one]) {
          if (promotes) {
            moveList[n++] = from | (one << 7) | (QUEEN << 14)
            if (!capturesOnly) {
              moveList[n++] = from | (one << 7) | (KNIGHT << 14)
              moveList[n++] = from | (one << 7) | (ROOK << 14)
              moveList[n++] = from | (one << 7) | (BISHOP << 14)
            }
          } else if (!capturesOnly) {
            moveList[n++] = from | (one << 7)
            const two = one + forward
            if (row === startRow && !board[two]) {
              moveList[n++] = from | (two << 7) | (FLAG_DOUBLE << 17)
            }
          }
        }
        for (let side2 = -1; side2 <= 1; side2 += 2) {
          const to = one + side2
          if (to & 0x88) continue
          const target = board[to]
          if (target && (target & BLACK) !== own) {
            if (promotes) {
              moveList[n++] = from | (to << 7) | (QUEEN << 14)
              if (!capturesOnly) {
                moveList[n++] = from | (to << 7) | (KNIGHT << 14)
                moveList[n++] = from | (to << 7) | (ROOK << 14)
                moveList[n++] = from | (to << 7) | (BISHOP << 14)
              }
            } else {
              moveList[n++] = from | (to << 7)
            }
          } else if (to === ep && !target) {
            moveList[n++] = from | (to << 7) | (FLAG_EP << 17)
          }
        }
        continue
      }

      if (type === KNIGHT || type === KING) {
        const deltas = type === KNIGHT ? KNIGHT_DELTAS : KING_DELTAS
        for (let i = 0; i < 8; i++) {
          const to = from + deltas[i]
          if (to & 0x88) continue
          const target = board[to]
          if (target ? (target & BLACK) !== own : !capturesOnly) moveList[n++] = from | (to << 7)
        }
        if (type === KING && !capturesOnly) {
          const kingside = side === 0 ? 1 : 4
          const queenside = side === 0 ? 2 : 8
          const home = side === 0 ? 116 : 4
          if (from === home && castle & (kingside | queenside)) {
            const enemy = side ^ 1
            const rook = own | ROOK
            if (
              castle & kingside &&
              !board[home + 1] &&
              !board[home + 2] &&
              board[home + 3] === rook &&
              !attacked(home, enemy) &&
              !attacked(home + 1, enemy)
            ) {
              moveList[n++] = from | ((home + 2) << 7) | (FLAG_CASTLE << 17)
            }
            if (
              castle & queenside &&
              !board[home - 1] &&
              !board[home - 2] &&
              !board[home - 3] &&
              board[home - 4] === rook &&
              !attacked(home, enemy) &&
              !attacked(home - 1, enemy)
            ) {
              moveList[n++] = from | ((home - 2) << 7) | (FLAG_CASTLE << 17)
            }
          }
        }
        continue
      }

      if (type !== ROOK) {
        for (let i = 0; i < 4; i++) {
          const d = BISHOP_DELTAS[i]
          let to = from + d
          while (!(to & 0x88)) {
            const target = board[to]
            if (target) {
              if ((target & BLACK) !== own) moveList[n++] = from | (to << 7)
              break
            }
            if (!capturesOnly) moveList[n++] = from | (to << 7)
            to += d
          }
        }
      }
      if (type !== BISHOP) {
        for (let i = 0; i < 4; i++) {
          const d = ROOK_DELTAS[i]
          let to = from + d
          while (!(to & 0x88)) {
            const target = board[to]
            if (target) {
              if ((target & BLACK) !== own) moveList[n++] = from | (to << 7)
              break
            }
            if (!capturesOnly) moveList[n++] = from | (to << 7)
            to += d
          }
        }
      }
    }
  }
  return n - base
}

/** Play a pseudo-legal move. Returns false (and restores) if it leaves the mover in check. */
function make(m: number): boolean {
  const from = m & 127
  const to = (m >> 7) & 127
  const promo = (m >> 14) & 7
  const flag = (m >> 17) & 3
  const p = board[from]
  const cap = board[to]

  uCap[hp] = cap
  uCastle[hp] = castle
  uEp[hp] = ep
  uHalf[hp] = half
  uLo[hp] = hashLo
  uHi[hp] = hashHi
  uMg[hp] = mg
  uEg[hp] = eg
  hp++

  if (ep >= 0) {
    hashLo ^= Z_EP_LO[ep & 7]
    hashHi ^= Z_EP_HI[ep & 7]
  }
  hashLo ^= Z_CASTLE_LO[castle]
  hashHi ^= Z_CASTLE_HI[castle]
  ep = -1
  half++

  if (cap) {
    take(cap, to)
    half = 0
  }
  take(p, from)
  if ((p & 7) === PAWN) half = 0

  if (flag === FLAG_EP) {
    const capSq = to + (side === 0 ? 16 : -16)
    take(board[capSq], capSq)
  } else if (flag === FLAG_DOUBLE) {
    ep = (from + to) >> 1
    hashLo ^= Z_EP_LO[ep & 7]
    hashHi ^= Z_EP_HI[ep & 7]
  }

  put(promo ? (side << 3) | promo : p, to)

  if (flag === FLAG_CASTLE) {
    const rook = (side << 3) | ROOK
    if (to > from) {
      take(rook, from + 3)
      put(rook, from + 1)
    } else {
      take(rook, from - 4)
      put(rook, from - 1)
    }
  }
  if ((p & 7) === KING) kingSq[side] = to

  castle &= CASTLE_MASK[from] & CASTLE_MASK[to]
  hashLo ^= Z_CASTLE_LO[castle] ^ Z_SIDE_LO
  hashHi ^= Z_CASTLE_HI[castle] ^ Z_SIDE_HI
  side ^= 1

  if (attacked(kingSq[side ^ 1], side)) {
    unmake(m)
    return false
  }
  return true
}

function unmake(m: number): void {
  const from = m & 127
  const to = (m >> 7) & 127
  const promo = (m >> 14) & 7
  const flag = (m >> 17) & 3
  side ^= 1
  hp--

  const moved = board[to]
  const p = promo ? (side << 3) | PAWN : moved
  const cap = uCap[hp]
  if (promo) {
    cnt[moved]--
    cnt[p]++
    phase -= PHASE_INC[promo]
  }
  board[from] = p
  board[to] = cap
  if (cap) {
    cnt[cap]++
    phase += PHASE_INC[cap & 7]
  }

  if (flag === FLAG_EP) {
    const pawn = ((side ^ 1) << 3) | PAWN
    board[to + (side === 0 ? 16 : -16)] = pawn
    cnt[pawn]++
  } else if (flag === FLAG_CASTLE) {
    const rook = (side << 3) | ROOK
    if (to > from) {
      board[from + 1] = 0
      board[from + 3] = rook
    } else {
      board[from - 1] = 0
      board[from - 4] = rook
    }
  }
  if ((p & 7) === KING) kingSq[side] = from

  castle = uCastle[hp]
  ep = uEp[hp]
  half = uHalf[hp]
  hashLo = uLo[hp]
  hashHi = uHi[hp]
  mg = uMg[hp]
  eg = uEg[hp]
}

function makeNull(): void {
  uCastle[hp] = castle
  uEp[hp] = ep
  uHalf[hp] = half
  uLo[hp] = hashLo
  uHi[hp] = hashHi
  uMg[hp] = mg
  uEg[hp] = eg
  hp++
  if (ep >= 0) {
    hashLo ^= Z_EP_LO[ep & 7]
    hashHi ^= Z_EP_HI[ep & 7]
  }
  ep = -1
  half = 0
  hashLo ^= Z_SIDE_LO
  hashHi ^= Z_SIDE_HI
  side ^= 1
}

function unmakeNull(): void {
  side ^= 1
  hp--
  ep = uEp[hp]
  half = uHalf[hp]
  hashLo = uLo[hp]
  hashHi = uHi[hp]
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

const wPawnMax = new Int8Array(10)
const bPawnMin = new Int8Array(10)
const wPawnCnt = new Int8Array(10)
const bPawnCnt = new Int8Array(10)

function slideCount(from: number, deltas: number[], own: number): number {
  let n = 0
  for (let i = 0; i < 4; i++) {
    const d = deltas[i]
    let to = from + d
    while (!(to & 0x88)) {
      const target = board[to]
      if (target) {
        if ((target & BLACK) !== own) n++
        break
      }
      n++
      to += d
    }
  }
  return n
}

function kingShelter(colour: number): number {
  const k = kingSq[colour]
  const row = k >> 4
  if (colour === 0 ? row < 6 : row > 1) return 0
  const pawn = (colour << 3) | PAWN
  const forward = colour === 0 ? -16 : 16
  let score = 0
  for (let dc = -1; dc <= 1; dc++) {
    const near = k + forward + dc
    if (near & 0x88) continue
    if (board[near] === pawn) score += 12
    else {
      const far = near + forward
      if (!(far & 0x88) && board[far] === pawn) score += 5
      else score -= 8
    }
  }
  return score
}

/** Static evaluation in centipawns from the side to move's point of view. */
function evaluate(): number {
  let m = mg
  let e = eg

  wPawnMax.fill(-1)
  bPawnMin.fill(8)
  wPawnCnt.fill(0)
  bPawnCnt.fill(0)
  for (let row = 1; row < 7; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row * 16 + col]
      if (p === PAWN) {
        wPawnCnt[col + 1]++
        if (row > wPawnMax[col + 1]) wPawnMax[col + 1] = row
      } else if (p === (PAWN | BLACK)) {
        bPawnCnt[col + 1]++
        if (row < bPawnMin[col + 1]) bPawnMin[col + 1] = row
      }
    }
  }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = row * 16 + col
      const p = board[sq]
      if (!p) continue
      const type = p & 7
      const own = p & BLACK
      const sign = own ? -1 : 1
      const f = col + 1

      if (type === PAWN) {
        if (own === 0) {
          if (bPawnMin[f - 1] >= row && bPawnMin[f] >= row && bPawnMin[f + 1] >= row) {
            m += PASSED_MG[6 - row]
            e += PASSED_EG[6 - row]
          }
          if (wPawnCnt[f - 1] === 0 && wPawnCnt[f + 1] === 0) {
            m -= 12
            e -= 8
          }
        } else {
          if (wPawnMax[f - 1] <= row && wPawnMax[f] <= row && wPawnMax[f + 1] <= row) {
            m -= PASSED_MG[row - 1]
            e -= PASSED_EG[row - 1]
          }
          if (bPawnCnt[f - 1] === 0 && bPawnCnt[f + 1] === 0) {
            m += 12
            e += 8
          }
        }
      } else if (type === KNIGHT) {
        let n = 0
        for (let i = 0; i < 8; i++) {
          const to = sq + KNIGHT_DELTAS[i]
          if (to & 0x88) continue
          const target = board[to]
          if (!target || (target & BLACK) !== own) n++
        }
        m += sign * 4 * (n - 4)
        e += sign * 4 * (n - 4)
      } else if (type === BISHOP) {
        const n = slideCount(sq, BISHOP_DELTAS, own)
        m += sign * 4 * (n - 6)
        e += sign * 4 * (n - 6)
      } else if (type === ROOK) {
        const n = slideCount(sq, ROOK_DELTAS, own)
        m += sign * 2 * (n - 7)
        e += sign * 4 * (n - 7)
        const mine = own ? bPawnCnt[f] : wPawnCnt[f]
        const theirs = own ? wPawnCnt[f] : bPawnCnt[f]
        if (mine === 0) {
          m += sign * (theirs === 0 ? 22 : 11)
          e += sign * (theirs === 0 ? 10 : 5)
        }
      } else if (type === QUEEN) {
        const n = slideCount(sq, BISHOP_DELTAS, own) + slideCount(sq, ROOK_DELTAS, own)
        m += sign * (n - 14)
        e += sign * 2 * (n - 14)
      }
    }
  }

  for (let f = 1; f <= 8; f++) {
    if (wPawnCnt[f] > 1) {
      m -= 10 * (wPawnCnt[f] - 1)
      e -= 20 * (wPawnCnt[f] - 1)
    }
    if (bPawnCnt[f] > 1) {
      m += 10 * (bPawnCnt[f] - 1)
      e += 20 * (bPawnCnt[f] - 1)
    }
  }

  if (cnt[BISHOP] >= 2) {
    m += 25
    e += 45
  }
  if (cnt[BISHOP | BLACK] >= 2) {
    m -= 25
    e -= 45
  }

  m += kingShelter(0) - kingShelter(1)

  // Mop-up: with a decisive edge and little material left, drive the losing
  // king to the edge and bring the winning king up, so won endings finish.
  if (phase <= 10 && (e > 350 || e < -350)) {
    const winner = e > 0 ? 0 : 1
    const lk = kingSq[winner ^ 1]
    const wk = kingSq[winner]
    const lr = lk >> 4
    const lc = lk & 7
    const centre = Math.max(3 - lr, lr - 4) + Math.max(3 - lc, lc - 4)
    const apart = Math.abs((wk >> 4) - lr) + Math.abs((wk & 7) - lc)
    const bonus = 12 * centre + 5 * (14 - apart)
    e += winner === 0 ? bonus : -bonus
  }

  const ph = phase > 24 ? 24 : phase
  let score = ((m * ph + e * (24 - ph)) / 24) | 0
  // Fade the score as the fifty-move counter runs, so a winning side makes progress
  // (a pawn move or a capture) instead of shuffling toward a draw.
  if (half > 20) score = ((score * (120 - half)) / 100) | 0
  return (side === 0 ? score : -score) + 10
}

function insufficientMaterial(): boolean {
  if (cnt[PAWN] + cnt[PAWN | BLACK] + cnt[ROOK] + cnt[ROOK | BLACK] + cnt[QUEEN] + cnt[QUEEN | BLACK] > 0) {
    return false
  }
  return cnt[KNIGHT] + cnt[KNIGHT | BLACK] + cnt[BISHOP] + cnt[BISHOP | BLACK] <= 1
}

function isRepetition(): boolean {
  const stop = hp - half
  for (let i = hp - 2; i >= stop && i >= 0; i -= 2) {
    if (uLo[i] === hashLo && uHi[i] === hashHi) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const TT_BITS = 20
const TT_SIZE = 1 << TT_BITS
const TT_MASK = TT_SIZE - 1
const TT_EXACT = 1
const TT_LOWER = 2
const TT_UPPER = 3
let ttKey: Int32Array | null = null
let ttMove: Int32Array
let ttScore: Int16Array
let ttDepth: Int8Array
let ttFlag: Int8Array

const killers = new Int32Array(MAX_PLY * 2)
const history = new Int32Array(16 * 128)

let nodes = 0
let deadline = Infinity
let stopped = false
let rootBest = 0
let rootScore = 0

function ensureTables(): void {
  if (ttKey) return
  ttKey = new Int32Array(TT_SIZE)
  ttMove = new Int32Array(TT_SIZE)
  ttScore = new Int16Array(TT_SIZE)
  ttDepth = new Int8Array(TT_SIZE)
  ttFlag = new Int8Array(TT_SIZE)
}

function scoreMoves(base: number, count: number, hashMove: number, ply: number): void {
  const k1 = killers[ply * 2]
  const k2 = killers[ply * 2 + 1]
  for (let i = base; i < base + count; i++) {
    const m = moveList[i]
    if (m === hashMove) {
      moveScore[i] = 1 << 30
      continue
    }
    const from = m & 127
    const to = (m >> 7) & 127
    const promo = (m >> 14) & 7
    const victim = board[to] & 7
    if (victim || promo === QUEEN || (m >> 17 & 3) === FLAG_EP) {
      const v = victim ? ORDER_VALUE[victim] : promo ? 0 : 100
      moveScore[i] = (1 << 24) + v * 16 - (board[from] & 7) + (promo === QUEEN ? 9000 : 0)
    } else if (m === k1) {
      moveScore[i] = (1 << 22) + 1
    } else if (m === k2) {
      moveScore[i] = 1 << 22
    } else {
      moveScore[i] = history[board[from] * 128 + to]
    }
  }
}

/** Selection sort step: bring the best remaining move to index i. */
function pickMove(i: number, end: number): number {
  let best = i
  let bestScore = moveScore[i]
  for (let j = i + 1; j < end; j++) {
    if (moveScore[j] > bestScore) {
      bestScore = moveScore[j]
      best = j
    }
  }
  if (best !== i) {
    const m = moveList[best]
    moveList[best] = moveList[i]
    moveList[i] = m
    moveScore[best] = moveScore[i]
    moveScore[i] = bestScore
  }
  return moveList[i]
}

function checkClock(): void {
  if ((nodes & 2047) === 0 && Date.now() > deadline) stopped = true
}

function quiesce(alpha: number, beta: number, ply: number): number {
  nodes++
  checkClock()
  if (stopped) return 0

  const stand = evaluate()
  if (ply >= MAX_PLY - 1) return stand
  if (stand >= beta) return stand
  if (stand > alpha) alpha = stand
  let best = stand

  const base = ply * MOVES_PER_PLY
  const count = generate(base, true)
  scoreMoves(base, count, 0, ply)
  const enemy = side ^ 1

  for (let i = base; i < base + count; i++) {
    const m = pickMove(i, base + count)
    const to = (m >> 7) & 127
    const promo = (m >> 14) & 7
    const victim = board[to] & 7
    if (!promo) {
      const gain = victim ? ORDER_VALUE[victim] : 100
      if (stand + gain + 200 < alpha) continue
      // A piece taking something cheaper on a pawn-guarded square loses material.
      const attacker = board[m & 127] & 7
      if (victim && ORDER_VALUE[attacker] > ORDER_VALUE[victim] + 50) {
        const pawn = (enemy << 3) | PAWN
        const back = enemy === 0 ? 16 : -16
        const a = to + back - 1
        const b = to + back + 1
        if ((!(a & 0x88) && board[a] === pawn) || (!(b & 0x88) && board[b] === pawn)) continue
      }
    }
    if (!make(m)) continue
    const score = -quiesce(-beta, -alpha, ply + 1)
    unmake(m)
    if (stopped) return 0
    if (score > best) {
      best = score
      if (score > alpha) {
        alpha = score
        if (score >= beta) break
      }
    }
  }
  return best
}

function search(depth: number, alpha: number, beta: number, ply: number, canNull: boolean): number {
  const pv = beta - alpha > 1
  if (ply > 0) {
    if (half >= 100 || insufficientMaterial() || isRepetition()) return 0
    if (alpha < -MATE + ply) alpha = -MATE + ply
    if (beta > MATE - ply - 1) beta = MATE - ply - 1
    if (alpha >= beta) return alpha
  }

  const inCheck = attacked(kingSq[side], side ^ 1)
  if (inCheck) depth++
  if (depth <= 0) return quiesce(alpha, beta, ply)

  nodes++
  checkClock()
  if (stopped) return 0
  if (ply >= MAX_PLY - 1) return evaluate()

  const idx = hashLo & TT_MASK
  let hashMove = 0
  if (ttKey![idx] === hashHi && ttFlag[idx] !== 0) {
    hashMove = ttMove[idx]
    if (!pv && ply > 0 && ttDepth[idx] >= depth) {
      let s = ttScore[idx]
      if (s > MATE_BOUND) s -= ply
      else if (s < -MATE_BOUND) s += ply
      const flag = ttFlag[idx]
      if (flag === TT_EXACT) return s
      if (flag === TT_LOWER && s >= beta) return s
      if (flag === TT_UPPER && s <= alpha) return s
    }
  }
  if (ply === 0 && rootBest) hashMove = rootBest

  let staticEval = -INF
  if (!inCheck) {
    staticEval = evaluate()
    if (!pv && beta < MATE_BOUND && beta > -MATE_BOUND) {
      if (depth <= 6 && staticEval - 85 * depth >= beta) return staticEval
      const own = side << 3
      if (
        canNull &&
        depth >= 3 &&
        staticEval >= beta &&
        cnt[own | KNIGHT] + cnt[own | BISHOP] + cnt[own | ROOK] + cnt[own | QUEEN] > 0
      ) {
        const r = 3 + ((depth / 5) | 0)
        makeNull()
        const score = -search(depth - 1 - r, -beta, -beta + 1, ply + 1, false)
        unmakeNull()
        if (stopped) return 0
        if (score >= beta) return score > MATE_BOUND ? beta : score
      }
    }
  }

  const base = ply * MOVES_PER_PLY
  const count = generate(base, false)
  scoreMoves(base, count, hashMove, ply)

  const alphaStart = alpha
  let best = -INF
  let bestMove = 0
  let legal = 0
  let quiets = 0

  for (let i = base; i < base + count; i++) {
    const m = pickMove(i, base + count)
    const from = m & 127
    const to = (m >> 7) & 127
    const quiet = !board[to] && !((m >> 14) & 7) && ((m >> 17) & 3) !== FLAG_EP
    const mover = board[from]

    if (!make(m)) continue
    legal++
    if (quiet) quiets++

    // Shallow quiet moves that cannot plausibly raise alpha are skipped, unless they give check.
    if (quiet && !pv && !inCheck && legal > 1 && best > -MATE_BOUND && depth <= 4) {
      const late = quiets > 4 + depth * depth
      const futile = depth <= 3 && staticEval + 90 * depth + 60 <= alpha
      if ((late || futile) && !attacked(kingSq[side], side ^ 1)) {
        unmake(m)
        continue
      }
    }

    let score: number
    if (legal === 1) {
      score = -search(depth - 1, -beta, -alpha, ply + 1, true)
    } else {
      let r = 0
      if (depth >= 3 && legal > 3 && quiet && !inCheck) {
        r = LMR[(depth > 63 ? 63 : depth) * 64 + (legal > 63 ? 63 : legal)]
        if (pv) r--
        if (m === killers[ply * 2] || m === killers[ply * 2 + 1]) r--
        if (r > 0 && attacked(kingSq[side], side ^ 1)) r = 0
        if (r < 0) r = 0
        if (r > depth - 2) r = depth - 2
      }
      score = -search(depth - 1 - r, -alpha - 1, -alpha, ply + 1, true)
      if (r > 0 && score > alpha && !stopped) {
        score = -search(depth - 1, -alpha - 1, -alpha, ply + 1, true)
      }
      if (score > alpha && score < beta && !stopped) {
        score = -search(depth - 1, -beta, -alpha, ply + 1, true)
      }
    }
    unmake(m)
    if (stopped) return 0

    if (score > best) {
      best = score
      bestMove = m
      if (score > alpha) {
        alpha = score
        if (ply === 0) {
          rootBest = m
          rootScore = score
        }
        if (score >= beta) {
          if (quiet) {
            if (killers[ply * 2] !== m) {
              killers[ply * 2 + 1] = killers[ply * 2]
              killers[ply * 2] = m
            }
            const h = mover * 128 + to
            history[h] += depth * depth
            if (history[h] > 1 << 20) {
              for (let j = 0; j < history.length; j++) history[j] >>= 1
            }
          }
          break
        }
      }
    }
  }

  if (legal === 0) return inCheck ? -MATE + ply : 0

  let stored = best
  if (stored > MATE_BOUND) stored += ply
  else if (stored < -MATE_BOUND) stored -= ply
  ttKey![idx] = hashHi
  ttMove[idx] = bestMove
  ttScore[idx] = stored
  ttDepth[idx] = depth > 127 ? 127 : depth
  ttFlag[idx] = best >= beta ? TT_LOWER : best > alphaStart ? TT_EXACT : TT_UPPER
  return best
}

// ---------------------------------------------------------------------------
// Boundary with the game's types
// ---------------------------------------------------------------------------

function toSquare(pos: Position): number {
  return pos.row * 16 + pos.col
}

function toEngineMove(m: number): EngineMove {
  const from = m & 127
  const to = (m >> 7) & 127
  const promo = (m >> 14) & 7
  const move: EngineMove = {
    from: { row: from >> 4, col: from & 7 },
    to: { row: to >> 4, col: to & 7 },
  }
  if (promo) move.promotedTo = TYPE_NAMES[promo]
  return move
}

/** Legal moves of the side to move, at ply 0's buffer. Returns them as an array. */
function legalMoves(): number[] {
  const count = generate(0, false)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const m = moveList[i]
    if (make(m)) {
      unmake(m)
      out.push(m)
    }
  }
  return out
}

function loadBoard(input: EngineInput, player: Player): void {
  clearPosition()
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = input.board[row][col]
      if (!piece) continue
      const code = TYPE_CODES[piece.type] | (piece.player === 2 ? BLACK : 0)
      put(code, row * 16 + col)
      if (piece.type === 'king') kingSq[piece.player - 1] = row * 16 + col
    }
  }
  side = player === 1 ? 0 : 1
  if (side === 1) {
    hashLo ^= Z_SIDE_LO
    hashHi ^= Z_SIDE_HI
  }
  const c = input.castlingRights
  let rights = 0
  if (c.whiteKingside && board[116] === KING && board[119] === ROOK) rights |= 1
  if (c.whiteQueenside && board[116] === KING && board[112] === ROOK) rights |= 2
  if (c.blackKingside && board[4] === (KING | BLACK) && board[7] === (ROOK | BLACK)) rights |= 4
  if (c.blackQueenside && board[4] === (KING | BLACK) && board[0] === (ROOK | BLACK)) rights |= 8
  setCastle(rights)
  if (input.enPassantSquare) {
    ep = toSquare(input.enPassantSquare)
    hashLo ^= Z_EP_LO[ep & 7]
    hashHi ^= Z_EP_HI[ep & 7]
  }
  half = input.halfmoveClock
}

/**
 * Load the position. The game's move list is replayed from the start so the
 * search knows which positions have already occurred and can see repetition
 * draws. If the replay does not land on the given board (a restored or
 * hand-built position), the board is loaded directly with no history.
 */
function loadPosition(input: EngineInput, player: Player): void {
  loadBoard(input, player)
  const targetLo = hashLo
  const targetHi = hashHi
  const history = input.moveHistory
  if (!history || history.length === 0 || history.length > STACK - MAX_PLY - 8) return

  setStartPosition()
  let ok = true
  for (const played of history) {
    const from = toSquare(played.from)
    const to = toSquare(played.to)
    const promo = played.isPromotion && played.promotedTo ? TYPE_CODES[played.promotedTo] : 0
    const count = generate(0, false)
    let found = false
    for (let i = 0; i < count; i++) {
      const m = moveList[i]
      if ((m & 127) === from && ((m >> 7) & 127) === to && ((m >> 14) & 7) === promo && make(m)) {
        found = true
        break
      }
    }
    if (!found) {
      ok = false
      break
    }
  }
  if (!ok || hashLo !== targetLo || hashHi !== targetHi) {
    loadBoard(input, player)
    return
  }
  half = input.halfmoveClock
}

/** Legal moves as the engine sees them, for agreement tests against the rules module. */
export function engineLegalMoves(input: EngineInput, player: Player): EngineMove[] {
  loadBoard(input, player)
  return legalMoves().map(toEngineMove)
}

function perftInner(depth: number, ply: number): number {
  const base = ply * MOVES_PER_PLY
  const count = generate(base, false)
  let total = 0
  for (let i = base; i < base + count; i++) {
    const m = moveList[i]
    if (!make(m)) continue
    total += depth <= 1 ? 1 : perftInner(depth - 1, ply + 1)
    unmake(m)
  }
  return total
}

/** Count leaf positions at `depth`, the standard move generator check. */
export function perft(input: EngineInput, player: Player, depth: number): number {
  loadBoard(input, player)
  return depth <= 0 ? 1 : perftInner(depth, 0)
}

/** Search the position for `player` and return the chosen move, or null if there is none. */
export function findBestMove(input: EngineInput, player: Player, options: EngineOptions = {}): EngineResult | null {
  ensureTables()
  loadPosition(input, player)

  const rootMoves = legalMoves()
  if (rootMoves.length === 0) return null

  const maxDepth = Math.max(1, Math.min(options.maxDepth ?? 64, 64))
  const start = Date.now()
  const budget = options.timeMs ?? Infinity
  killers.fill(0)
  for (let i = 0; i < history.length; i++) history[i] >>= 3
  nodes = 0
  stopped = false
  rootBest = 0
  rootScore = 0

  let best = rootMoves[0]
  let bestScore = 0
  let reached = 0

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Depth 1 runs without a clock so there is always a searched answer.
    deadline = depth === 1 ? Infinity : start + budget
    let alpha = -INF
    let beta = INF
    let window = 30
    if (depth >= 4) {
      alpha = bestScore - window
      beta = bestScore + window
    }
    let score = 0
    for (;;) {
      score = search(depth, alpha, beta, 0, false)
      if (stopped) break
      if (score <= alpha) {
        alpha = Math.max(-INF, alpha - window)
        window *= 3
      } else if (score >= beta) {
        beta = Math.min(INF, beta + window)
        window *= 3
      } else break
      if (window > 1200) {
        alpha = -INF
        beta = INF
      }
    }
    if (stopped) {
      // A move that beat the previous best before time ran out is still an improvement.
      if (rootBest && rootBest !== best && rootScore > bestScore) {
        best = rootBest
        bestScore = rootScore
      }
      break
    }
    if (rootBest) best = rootBest
    bestScore = score
    reached = depth
    if (score > MATE_BOUND || score < -MATE_BOUND) {
      if (depth >= MATE - Math.abs(score) + 1) break
    }
    if (rootMoves.length === 1) break
    if (Date.now() - start > budget * 0.55) break
  }
  stopped = false
  deadline = Infinity

  const margin = options.pickMargin ?? 0
  if (margin > 0 && rootMoves.length > 1) {
    const random = options.random ?? Math.random
    const scored: { m: number; s: number }[] = []
    let top = -INF
    for (const m of rootMoves) {
      if (!make(m)) continue
      const s = -search(reached - 1, -INF, INF, 1, true)
      unmake(m)
      scored.push({ m, s })
      if (s > top) top = s
    }
    const close = scored.filter((x) => x.s >= top - margin)
    const pick = close[Math.floor(random() * close.length)] ?? close[0]
    best = pick.m
    bestScore = pick.s
  }

  return { ...toEngineMove(best), score: bestScore, depth: reached, nodes }
}
