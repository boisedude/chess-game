/**
 * Chess AI Strategies
 *
 * Exports: getAIMove(state, player, difficulty) -> ValidMove | null
 * Three difficulty levels using minimax with alpha-beta pruning:
 * - Easy (Bella): depth 1, 30% random, material-only eval
 * - Medium (Coop): depth 2, 5% random, material + basic position
 * - Hard (Bentley): depth 3, alpha-beta + move ordering, full positional eval
 *
 * Key difference from checkers: needs full GameState for castling rights and en passant.
 */

import type {
  Board,
  Player,
  Difficulty,
  ValidMove,
  GameState,
  PieceType,
  CastlingRights,
  Position,
} from '@/types/chess.types'
import { BOARD_SIZE, PIECE_VALUES } from '@/types/chess.types'
import {
  getAllValidMoves,
  applyMove,
  checkGameOver,
  hashBoard,
  isSquareAttacked,
  findKing,
  updateCastlingRights,
  getNewEnPassant,
} from './chessRules'
import { getBookMove } from './openingBook'

// ============================================================
// Piece-Square Tables (from White's perspective, flipped for Black)
// Higher values = better squares for that piece
// ============================================================

const PAWN_TABLE = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 25, 25, 10,  5,  5],
  [ 0,  0,  0, 20, 20,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-20,-20, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0],
]

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
]

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
]

const ROOK_TABLE = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  5,  5,  0,  0,  0],
]

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
]

const KING_MIDGAME_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
]

const KING_ENDGAME_TABLE = [
  [-50,-30,-30,-30,-30,-30,-30,-50],
  [-30,-10,  0,  0,  0,  0,-10,-30],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,-10,  0,  0,  0,  0,-10,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
]

const PIECE_SQUARE_TABLES: Record<PieceType, number[][]> = {
  pawn: PAWN_TABLE,
  knight: KNIGHT_TABLE,
  bishop: BISHOP_TABLE,
  rook: ROOK_TABLE,
  queen: QUEEN_TABLE,
  king: KING_MIDGAME_TABLE,
}

function getPieceSquareValue(pieceType: PieceType, row: number, col: number, player: Player, isEndgame: boolean): number {
  const table = (pieceType === 'king' && isEndgame) ? KING_ENDGAME_TABLE : PIECE_SQUARE_TABLES[pieceType]
  // For White (player 1), use table as-is. For Black (player 2), flip vertically.
  const r = player === 1 ? row : 7 - row
  return table[r][col]
}

// ============================================================
// Evaluation
// ============================================================

interface EvalWeights {
  material: number
  position: number
  mobility: number
  bishopPair: number
  castlingBonus: number
  kingAttack: number
  pawnStructure: number
  rookOpenFile: number
}

const DIFFICULTY_WEIGHTS: Record<Difficulty, EvalWeights> = {
  easy: {
    material: 1,
    position: 0,
    mobility: 0,
    bishopPair: 0,
    castlingBonus: 0,
    kingAttack: 0,
    pawnStructure: 0,
    rookOpenFile: 0,
  },
  medium: {
    material: 1,
    position: 0.5,
    mobility: 0.3,
    bishopPair: 0.5,
    castlingBonus: 0.5,
    kingAttack: 0,
    pawnStructure: 0.3,
    rookOpenFile: 0.3,
  },
  hard: {
    material: 1,
    position: 1,
    mobility: 0.5,
    bishopPair: 1,
    castlingBonus: 1,
    kingAttack: 0.5,
    pawnStructure: 1,
    rookOpenFile: 1,
  },
}

/** Chance of playing a completely random move (top-level weakness). */
const RANDOM_MOVE_CHANCE: Record<Difficulty, number> = {
  easy: 0.3,
  medium: 0.05,
  hard: 0,
}

const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

function countBishops(board: Board, player: Player): number {
  let count = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c]
      if (p && p.player === player && p.type === 'bishop') count++
    }
  }
  return count
}

/** Detect endgame: total non-king material per side <= 1300 (roughly rook + minor piece). */
function isEndgame(board: Board): boolean {
  let whiteMaterial = 0
  let blackMaterial = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c]
      if (!piece || piece.type === 'king') continue
      if (piece.player === 1) whiteMaterial += PIECE_VALUES[piece.type]
      else blackMaterial += PIECE_VALUES[piece.type]
    }
  }
  return whiteMaterial <= 1300 && blackMaterial <= 1300
}

/** Evaluate king safety: count attacked squares around king minus pawn shield bonus. */
function evaluateKingSafety(board: Board, player: Player): number {
  const opp = (player === 1 ? 2 : 1) as Player
  const kingPos = findKing(board, player)
  if (!kingPos) return 0

  // Count how many of the 8 surrounding squares are attacked by opponent
  let attackedCount = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = kingPos.row + dr
      const c = kingPos.col + dc
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        if (isSquareAttacked(board, { row: r, col: c }, opp)) {
          attackedCount++
        }
      }
    }
  }

  // Count pawn shield: friendly pawns on the 3 squares directly in front of the king
  let pawnShield = 0
  const pawnDir = player === 1 ? -1 : 1 // White pawns are in front at lower rows
  const shieldRow = kingPos.row + pawnDir
  if (shieldRow >= 0 && shieldRow < BOARD_SIZE) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = kingPos.col + dc
      if (c >= 0 && c < BOARD_SIZE) {
        const piece = board[shieldRow][c]
        if (piece && piece.type === 'pawn' && piece.player === player) {
          pawnShield++
        }
      }
    }
  }

  // Higher exposure = worse. Pawn shield reduces exposure.
  return attackedCount - pawnShield * 2
}

/** Evaluate castling status for one side. */
function evaluateCastlingForPlayer(board: Board, player: Player, castlingRights: CastlingRights): number {
  const kingPos = findKing(board, player)
  if (!kingPos) return 0

  const backRank = player === 1 ? 7 : 0

  // King is on a castled square (g1/g8 or c1/c8)
  if (kingPos.row === backRank && (kingPos.col === 6 || kingPos.col === 2)) {
    return 30
  }

  // Still has castling rights (potential to castle)
  const hasRights = player === 1
    ? (castlingRights.whiteKingside || castlingRights.whiteQueenside)
    : (castlingRights.blackKingside || castlingRights.blackQueenside)
  if (hasRights) {
    return 15
  }

  // Lost rights and king is still on e1/e8 (never castled, rights lost by king/rook move)
  if (kingPos.row === backRank && kingPos.col === 4) {
    return -10
  }

  return 0
}

/**
 * Evaluate pawn structure for a player: penalize doubled and isolated pawns, reward passed pawns.
 * Returns score in centipawns (positive = good structure).
 */
function evaluatePawnStructure(board: Board, player: Player): number {
  const opp: Player = player === 1 ? 2 : 1
  const dir = player === 1 ? -1 : 1 // Direction pawns advance
  let score = 0

  // Build file pawn counts for both sides
  const playerPawnsPerFile: number[] = Array(BOARD_SIZE).fill(0)
  const oppPawnsPerFile: number[] = Array(BOARD_SIZE).fill(0)
  const playerPawnPositions: { row: number; col: number }[] = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (!piece || piece.type !== 'pawn') continue
      if (piece.player === player) {
        playerPawnsPerFile[col]++
        playerPawnPositions.push({ row, col })
      } else {
        oppPawnsPerFile[col]++
      }
    }
  }

  for (const pos of playerPawnPositions) {
    // Doubled pawns: more than 1 pawn on same file
    if (playerPawnsPerFile[pos.col] > 1) {
      score -= 15
    }

    // Isolated pawns: no friendly pawns on adjacent files
    const hasLeftNeighbor = pos.col > 0 && playerPawnsPerFile[pos.col - 1] > 0
    const hasRightNeighbor = pos.col < 7 && playerPawnsPerFile[pos.col + 1] > 0
    if (!hasLeftNeighbor && !hasRightNeighbor) {
      score -= 20
    }

    // Passed pawns: no opponent pawns on same or adjacent files ahead
    let isPassed = true
    for (let c = Math.max(0, pos.col - 1); c <= Math.min(7, pos.col + 1); c++) {
      // Check all squares ahead on this file group
      let r = pos.row + dir
      while (r >= 0 && r < BOARD_SIZE) {
        const p = board[r][c]
        if (p && p.type === 'pawn' && p.player === opp) {
          isPassed = false
          break
        }
        r += dir
      }
      if (!isPassed) break
    }
    if (isPassed) {
      // Bonus increases as pawn advances: rows from promotion
      const promotionRow = player === 1 ? 0 : 7
      const distFromPromotion = Math.abs(pos.row - promotionRow)
      score += 20 + (7 - distFromPromotion) * 10
    }
  }

  return score
}

/**
 * Evaluate rook placement for a player: bonus for rooks on open/semi-open files.
 * Returns score in centipawns.
 */
function evaluateRookFiles(board: Board, player: Player): number {
  let score = 0

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (!piece || piece.type !== 'rook' || piece.player !== player) continue

      let hasOwnPawn = false
      let hasOppPawn = false
      for (let r = 0; r < BOARD_SIZE; r++) {
        const p = board[r][col]
        if (p && p.type === 'pawn') {
          if (p.player === player) hasOwnPawn = true
          else hasOppPawn = true
        }
      }

      if (!hasOwnPawn && !hasOppPawn) {
        score += 25 // Open file
      } else if (!hasOwnPawn) {
        score += 15 // Semi-open file
      }
    }
  }

  return score
}

/** Evaluate board position from the perspective of the given player. */
function evaluateBoard(
  board: Board,
  player: Player,
  castlingRights: CastlingRights,
  enPassantSquare: Position | null,
  weights: EvalWeights
): number {
  const opp = (player === 1 ? 2 : 1) as Player
  let score = 0

  const endgame = isEndgame(board)

  // Material + Position
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (!piece) continue

      const materialValue = PIECE_VALUES[piece.type] * weights.material
      const positionValue = getPieceSquareValue(piece.type, row, col, piece.player, endgame) * weights.position

      if (piece.player === player) {
        score += materialValue + positionValue
      } else {
        score -= materialValue + positionValue
      }
    }
  }

  // Bishop pair bonus
  if (weights.bishopPair > 0) {
    if (countBishops(board, player) >= 2) score += 50 * weights.bishopPair
    if (countBishops(board, opp) >= 2) score -= 50 * weights.bishopPair
  }

  // Castling bonus (reward having castled, potential to castle, or penalize lost rights)
  if (weights.castlingBonus > 0) {
    score += evaluateCastlingForPlayer(board, player, castlingRights) * weights.castlingBonus
    score -= evaluateCastlingForPlayer(board, opp, castlingRights) * weights.castlingBonus
  }

  // King safety (attacked squares around king minus pawn shield)
  if (weights.kingAttack > 0) {
    const playerExposure = evaluateKingSafety(board, player)
    const oppExposure = evaluateKingSafety(board, opp)
    score += (oppExposure - playerExposure) * 15 * weights.kingAttack
  }

  // Mobility (number of legal moves)
  if (weights.mobility > 0) {
    const playerMoves = getAllValidMoves(board, player, castlingRights, enPassantSquare)
    const oppMoves = getAllValidMoves(board, opp, castlingRights, enPassantSquare)
    score += (playerMoves.length - oppMoves.length) * 10 * weights.mobility
  }

  // Pawn structure (doubled, isolated, passed pawns)
  if (weights.pawnStructure > 0) {
    score += evaluatePawnStructure(board, player) * weights.pawnStructure
    score -= evaluatePawnStructure(board, opp) * weights.pawnStructure
  }

  // Rook on open/semi-open files
  if (weights.rookOpenFile > 0) {
    score += evaluateRookFiles(board, player) * weights.rookOpenFile
    score -= evaluateRookFiles(board, opp) * weights.rookOpenFile
  }

  return score
}

// ============================================================
// Move Ordering (for alpha-beta efficiency)
// ============================================================

function orderMoves(board: Board, moves: ValidMove[], _player: Player): ValidMove[] {
  return moves.sort((a, b) => {
    let scoreA = 0
    let scoreB = 0

    // Prioritize captures (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
    if (a.isCapture) {
      const victimA = board[a.to.row][a.to.col]
      const attackerA = board[a.from.row][a.from.col]
      if (victimA && attackerA) {
        scoreA += (PIECE_VALUES[victimA.type] * 10 - PIECE_VALUES[attackerA.type]) + 10000
      } else {
        scoreA += 5000 // en passant
      }
    }
    if (b.isCapture) {
      const victimB = board[b.to.row][b.to.col]
      const attackerB = board[b.from.row][b.from.col]
      if (victimB && attackerB) {
        scoreB += (PIECE_VALUES[victimB.type] * 10 - PIECE_VALUES[attackerB.type]) + 10000
      } else {
        scoreB += 5000
      }
    }

    // Prioritize promotions
    if (a.isPromotion) scoreA += 9000
    if (b.isPromotion) scoreB += 9000

    // Prioritize castling
    if (a.isCastling) scoreA += 500
    if (b.isCastling) scoreB += 500

    return scoreB - scoreA
  })
}

// ============================================================
// Transposition Table
// ============================================================

const enum TTFlag {
  EXACT = 0,
  LOWER_BOUND = 1,
  UPPER_BOUND = 2,
}

interface TTEntry {
  depth: number
  score: number
  flag: TTFlag
}

const MAX_TT_SIZE = 100000
let transpositionTable: Map<string, TTEntry> = new Map()

/** Clear the transposition table between moves. */
function clearTT(): void {
  transpositionTable = new Map()
}

// ============================================================
// Quiescence Search
// ============================================================

const MAX_QUIESCENCE_DEPTH = 8

/**
 * Quiescence search: after main search reaches depth 0, continue searching
 * captures only until a quiet position is reached. Prevents horizon effect.
 */
function quiescence(
  board: Board,
  alpha: number,
  beta: number,
  player: Player,
  isMaximizing: boolean,
  castlingRights: CastlingRights,
  enPassantSquare: Position | null,
  weights: EvalWeights,
  qDepth: number,
): number {
  // Stand-pat: the static evaluation serves as a lower bound
  const standPat = evaluateBoard(board, player, castlingRights, enPassantSquare, weights)

  if (qDepth >= MAX_QUIESCENCE_DEPTH) return standPat

  if (isMaximizing) {
    if (standPat >= beta) return beta
    if (standPat > alpha) alpha = standPat
  } else {
    if (standPat <= alpha) return alpha
    if (standPat < beta) beta = standPat
  }

  const currentPlayer = isMaximizing ? player : (player === 1 ? 2 : 1) as Player
  let moves = getAllValidMoves(board, currentPlayer, castlingRights, enPassantSquare)

  // Only search captures and promotions
  moves = moves.filter((m) => m.isCapture || m.isPromotion)
  moves = orderMoves(board, moves, currentPlayer)

  if (isMaximizing) {
    for (const move of moves) {
      const newBoard = applyMove(board, move)
      const newCastling = updateCastlingRights(castlingRights, board, move)
      const newEnPassant = getNewEnPassant(board, move)

      const score = quiescence(
        newBoard, alpha, beta, player, false,
        newCastling, newEnPassant, weights, qDepth + 1,
      )
      if (score > alpha) alpha = score
      if (alpha >= beta) return beta
    }
    return alpha
  } else {
    for (const move of moves) {
      const newBoard = applyMove(board, move)
      const newCastling = updateCastlingRights(castlingRights, board, move)
      const newEnPassant = getNewEnPassant(board, move)

      const score = quiescence(
        newBoard, alpha, beta, player, true,
        newCastling, newEnPassant, weights, qDepth + 1,
      )
      if (score < beta) beta = score
      if (alpha >= beta) return alpha
    }
    return beta
  }
}

// ============================================================
// Minimax with Alpha-Beta Pruning + TT + Quiescence
// ============================================================

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  player: Player,
  castlingRights: CastlingRights,
  enPassantSquare: Position | null,
  halfmoveClock: number,
  positionHistory: string[],
  weights: EvalWeights,
  useOrdering: boolean,
  useQuiescence: boolean,
): number {
  // Check game over
  const currentPlayer = isMaximizing ? player : (player === 1 ? 2 : 1) as Player
  const gameOver = checkGameOver(board, currentPlayer, castlingRights, enPassantSquare, halfmoveClock, positionHistory)
  if (gameOver.isOver) {
    if (gameOver.winner === player) return 100000 + depth * 100
    if (gameOver.winner === (player === 1 ? 2 : 1)) return -100000 - depth * 100
    return 0 // Draw
  }

  // Transposition table lookup
  const ttKey = hashBoard(board, currentPlayer, castlingRights, enPassantSquare)
  if (useOrdering) { // Only use TT for hard difficulty (which uses ordering)
    const ttEntry = transpositionTable.get(ttKey)
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === TTFlag.EXACT) return ttEntry.score
      if (ttEntry.flag === TTFlag.LOWER_BOUND && ttEntry.score > alpha) alpha = ttEntry.score
      if (ttEntry.flag === TTFlag.UPPER_BOUND && ttEntry.score < beta) beta = ttEntry.score
      if (alpha >= beta) return ttEntry.score
    }
  }

  if (depth === 0) {
    if (useQuiescence) {
      return quiescence(board, alpha, beta, player, isMaximizing, castlingRights, enPassantSquare, weights, 0)
    }
    return evaluateBoard(board, player, castlingRights, enPassantSquare, weights)
  }

  let moves = getAllValidMoves(board, currentPlayer, castlingRights, enPassantSquare)

  if (useOrdering) {
    moves = orderMoves(board, moves, currentPlayer)
  }

  const origAlpha = alpha
  let bestScore: number

  if (isMaximizing) {
    bestScore = -Infinity
    for (const move of moves) {
      const newBoard = applyMove(board, move)
      const newCastling = updateCastlingRights(castlingRights, board, move)
      const newEnPassant = getNewEnPassant(board, move)
      const piece = board[move.from.row][move.from.col]
      const newHalfmove = (piece && piece.type === 'pawn') || move.isCapture ? 0 : halfmoveClock + 1
      const hash = hashBoard(newBoard, (currentPlayer === 1 ? 2 : 1) as Player, newCastling, newEnPassant)

      const evalScore = minimax(
        newBoard, depth - 1, alpha, beta, false, player,
        newCastling, newEnPassant, newHalfmove, [...positionHistory, hash],
        weights, useOrdering, useQuiescence,
      )
      bestScore = Math.max(bestScore, evalScore)
      alpha = Math.max(alpha, evalScore)
      if (beta <= alpha) break
    }
  } else {
    bestScore = Infinity
    for (const move of moves) {
      const newBoard = applyMove(board, move)
      const newCastling = updateCastlingRights(castlingRights, board, move)
      const newEnPassant = getNewEnPassant(board, move)
      const piece = board[move.from.row][move.from.col]
      const newHalfmove = (piece && piece.type === 'pawn') || move.isCapture ? 0 : halfmoveClock + 1
      const hash = hashBoard(newBoard, (currentPlayer === 1 ? 2 : 1) as Player, newCastling, newEnPassant)

      const evalScore = minimax(
        newBoard, depth - 1, alpha, beta, true, player,
        newCastling, newEnPassant, newHalfmove, [...positionHistory, hash],
        weights, useOrdering, useQuiescence,
      )
      bestScore = Math.min(bestScore, evalScore)
      beta = Math.min(beta, evalScore)
      if (beta <= alpha) break
    }
  }

  // Store in transposition table
  if (useOrdering && transpositionTable.size < MAX_TT_SIZE) {
    let flag: TTFlag
    if (bestScore <= origAlpha) flag = TTFlag.UPPER_BOUND
    else if (bestScore >= beta) flag = TTFlag.LOWER_BOUND
    else flag = TTFlag.EXACT
    transpositionTable.set(ttKey, { depth, score: bestScore, flag })
  }

  return bestScore
}

// ============================================================
// Public API
// ============================================================

/** Get AI move for the given game state. Returns null if no moves available. */
export function getAIMove(state: GameState, player: Player, difficulty: Difficulty): ValidMove | null {
  const moves = getAllValidMoves(state.board, player, state.castlingRights, state.enPassantSquare)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  // Opening book lookup for medium and hard
  if (difficulty !== 'easy') {
    // Medium follows book faithfully for the first 3 full moves (6 half-moves),
    // then has a 30% chance of skipping on subsequent moves.
    const skipBook = difficulty === 'medium' && state.moveHistory.length >= 6 && Math.random() < 0.3
    if (!skipBook) {
      const bookMove = getBookMove(state)
      if (bookMove) return bookMove
    }
  }

  const weights = DIFFICULTY_WEIGHTS[difficulty]
  const depth = DIFFICULTY_DEPTH[difficulty]
  const useOrdering = difficulty === 'hard'
  const useQuiescence = difficulty === 'hard'

  // Clear transposition table between top-level calls
  clearTT()

  // Random move chance for easy/medium
  const randomChance = RANDOM_MOVE_CHANCE[difficulty]
  if (randomChance > 0 && Math.random() < randomChance) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  let bestMove = moves[0]
  let bestScore = -Infinity

  const orderedMoves = useOrdering ? orderMoves(state.board, [...moves], player) : moves

  for (const move of orderedMoves) {
    const newBoard = applyMove(state.board, move)
    const newCastling = updateCastlingRights(state.castlingRights, state.board, move)
    const newEnPassant = getNewEnPassant(state.board, move)
    const piece = state.board[move.from.row][move.from.col]
    const newHalfmove = (piece && piece.type === 'pawn') || move.isCapture ? 0 : state.halfmoveClock + 1
    const hash = hashBoard(newBoard, (player === 1 ? 2 : 1) as Player, newCastling, newEnPassant)

    const score = minimax(
      newBoard, depth - 1, -Infinity, Infinity, false, player,
      newCastling, newEnPassant, newHalfmove, [...state.positionHistory, hash],
      weights, useOrdering, useQuiescence,
    )

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}
