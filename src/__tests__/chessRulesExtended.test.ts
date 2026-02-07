/**
 * Chess Rules Engine - Extended Unit Tests
 *
 * Covers specific gaps identified in review: hash correctness, initial position
 * history seeding, pawn edge cases, en passant edge cases, castling edge cases,
 * check scenarios, draw edge cases, and achievement tracking.
 */

import {
  createInitialGameState,
  getValidMovesForPiece,
  getAllValidMoves,
  applyMove,
  computeNextGameState,
  hashBoard,
  isInCheck,
  isSquareAttacked,
  countPieces,
  hasInsufficientMaterial,
} from '../lib/chessRules'
import type {
  Board,
  Player,
  ValidMove,
  GameState,
  CastlingRights,
  Position,
  PieceType,
} from '../types/chess.types'
import { BOARD_SIZE } from '../types/chess.types'

// ============================================================
// Helpers
// ============================================================

function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
}

function placePiece(
  board: Board,
  row: number,
  col: number,
  player: Player,
  type: PieceType
): void {
  board[row][col] = { player, type }
}

const ALL_CASTLING: CastlingRights = {
  whiteKingside: true,
  whiteQueenside: true,
  blackKingside: true,
  blackQueenside: true,
}

const NO_CASTLING: CastlingRights = {
  whiteKingside: false,
  whiteQueenside: false,
  blackKingside: false,
  blackQueenside: false,
}

function findMove(
  moves: ValidMove[],
  from: Position,
  to: Position,
  promotedTo?: string
): ValidMove | undefined {
  return moves.find(
    (m) =>
      m.from.row === from.row &&
      m.from.col === from.col &&
      m.to.row === to.row &&
      m.to.col === to.col &&
      (promotedTo === undefined || m.promotedTo === promotedTo)
  )
}

function hasMoveTo(moves: ValidMove[], to: Position): boolean {
  return moves.some((m) => m.to.row === to.row && m.to.col === to.col)
}

/**
 * Build a minimal GameState from a custom board for use with computeNextGameState.
 */
function buildGameState(
  board: Board,
  currentPlayer: Player,
  overrides: Partial<GameState> = {}
): GameState {
  const castlingRights = overrides.castlingRights ?? NO_CASTLING
  const enPassantSquare = overrides.enPassantSquare ?? null
  const validMoves = getAllValidMoves(board, currentPlayer, castlingRights, enPassantSquare)
  const [whiteCount, blackCount] = countPieces(board)
  const positionHash = hashBoard(board, currentPlayer, castlingRights, enPassantSquare)

  return {
    board,
    currentPlayer,
    status: 'playing',
    winner: null,
    mode: 'pvc',
    difficulty: 'medium',
    moveHistory: [],
    lastMove: undefined,
    whiteCount,
    blackCount,
    validMoves,
    castlingRights,
    enPassantSquare,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    isInCheck: isInCheck(board, currentPlayer),
    undoState: null,
    positionHistory: [positionHash],
    pendingPromotion: null,
    hadQueenCaptured: false,
    promotedPawnCount: 0,
    castledThisGame: false,
    usedEnPassant: false,
    wasDownByMaterial: false,
    ...overrides,
  }
}

// ============================================================
// 1. Hash function correctness (bug fix verification)
// ============================================================

describe('Hash function correctness', () => {
  it('produces different hashes for king vs knight on the same square', () => {
    const boardWithKing = emptyBoard()
    placePiece(boardWithKing, 4, 4, 1, 'king')
    placePiece(boardWithKing, 0, 0, 2, 'king')

    const boardWithKnight = emptyBoard()
    placePiece(boardWithKnight, 4, 4, 1, 'knight')
    placePiece(boardWithKnight, 0, 0, 2, 'king')
    // Add white king elsewhere so both boards have white kings
    placePiece(boardWithKnight, 7, 7, 1, 'king')

    const hashKing = hashBoard(boardWithKing, 1, NO_CASTLING, null)
    const hashKnight = hashBoard(boardWithKnight, 1, NO_CASTLING, null)

    expect(hashKing).not.toBe(hashKnight)
  })

  it('produces different hashes for positions differing only in king vs knight placement', () => {
    // Board A: white king on e4, white knight on d4
    const boardA = emptyBoard()
    placePiece(boardA, 4, 4, 1, 'king')
    placePiece(boardA, 4, 3, 1, 'knight')
    placePiece(boardA, 0, 0, 2, 'king')

    // Board B: white knight on e4, white king on d4
    const boardB = emptyBoard()
    placePiece(boardB, 4, 4, 1, 'knight')
    placePiece(boardB, 4, 3, 1, 'king')
    placePiece(boardB, 0, 0, 2, 'king')

    const hashA = hashBoard(boardA, 1, NO_CASTLING, null)
    const hashB = hashBoard(boardB, 1, NO_CASTLING, null)

    expect(hashA).not.toBe(hashB)
  })

  it('uses "n" for knight and "k" for king in hash encoding', () => {
    const board = emptyBoard()
    placePiece(board, 3, 3, 1, 'knight')
    placePiece(board, 5, 5, 1, 'king')
    placePiece(board, 0, 0, 2, 'king')

    const hash = hashBoard(board, 1, NO_CASTLING, null)

    // Knight should be encoded with 'n', king with 'k'
    expect(hash).toContain('1n33')  // player 1, 'n' for knight, at row 3 col 3
    expect(hash).toContain('1k55')  // player 1, 'k' for king, at row 5 col 5
  })
})

// ============================================================
// 2. Initial position history seeding (bug fix verification)
// ============================================================

describe('Initial position history seeding', () => {
  it('createInitialGameState has positionHistory with length 1', () => {
    const state = createInitialGameState()
    expect(state.positionHistory).toHaveLength(1)
  })

  it('the hash in positionHistory matches hashBoard with the initial state', () => {
    const state = createInitialGameState()
    const expectedHash = hashBoard(
      state.board,
      state.currentPlayer,
      state.castlingRights,
      state.enPassantSquare
    )
    expect(state.positionHistory[0]).toBe(expectedHash)
  })

  it('positionHistory grows with each move', () => {
    const state = createInitialGameState()
    expect(state.positionHistory).toHaveLength(1)

    const move: ValidMove = {
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const state2 = computeNextGameState(state, move)
    expect(state2.positionHistory).toHaveLength(2)
  })
})

// ============================================================
// 3. Pawn edge cases
// ============================================================

describe('Pawn edge cases', () => {
  it('black pawn promotion (row 6 to row 7) generates 4 promotion options', () => {
    const board = emptyBoard()
    placePiece(board, 6, 3, 2, 'pawn') // black pawn one row from promotion
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 7, 4, 1, 'king')

    const moves = getValidMovesForPiece(board, { row: 6, col: 3 }, NO_CASTLING, null)
    const promotions = moves.filter(
      (m) => m.isPromotion && m.to.row === 7 && m.to.col === 3
    )
    expect(promotions).toHaveLength(4)
    const promoTypes = promotions.map((m) => m.promotedTo).sort()
    expect(promoTypes).toEqual(['bishop', 'knight', 'queen', 'rook'])
  })

  it('pawn blocked one square ahead cannot double-push even from starting row', () => {
    const board = emptyBoard()
    placePiece(board, 6, 3, 1, 'pawn') // white pawn on starting row
    placePiece(board, 5, 3, 2, 'knight') // blocker one square ahead
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 4, 2, 'king')

    const moves = getValidMovesForPiece(board, { row: 6, col: 3 }, NO_CASTLING, null)
    // Pawn cannot move forward at all (blocked immediately), so no double push either
    expect(hasMoveTo(moves, { row: 5, col: 3 })).toBe(false)
    expect(hasMoveTo(moves, { row: 4, col: 3 })).toBe(false)
    // Only captures would be available if enemy pieces were diagonal
    const forwardMoves = moves.filter((m) => m.to.col === 3)
    expect(forwardMoves).toHaveLength(0)
  })

  it('pawn cannot capture its own piece diagonally', () => {
    const board = emptyBoard()
    placePiece(board, 4, 3, 1, 'pawn')
    placePiece(board, 3, 2, 1, 'knight') // own piece on capture diagonal
    placePiece(board, 3, 4, 1, 'bishop') // own piece on other capture diagonal
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 4, 2, 'king')

    const moves = getValidMovesForPiece(board, { row: 4, col: 3 }, NO_CASTLING, null)
    // Should not be able to capture own pieces
    expect(hasMoveTo(moves, { row: 3, col: 2 })).toBe(false)
    expect(hasMoveTo(moves, { row: 3, col: 4 })).toBe(false)
    // Should still be able to move forward
    expect(hasMoveTo(moves, { row: 3, col: 3 })).toBe(true)
  })

  it('black pawn blocked one square ahead cannot double-push from starting row', () => {
    const board = emptyBoard()
    placePiece(board, 1, 4, 2, 'pawn') // black pawn on starting row
    placePiece(board, 2, 4, 1, 'pawn') // blocker one square ahead
    placePiece(board, 0, 0, 2, 'king')
    placePiece(board, 7, 0, 1, 'king')

    const moves = getValidMovesForPiece(board, { row: 1, col: 4 }, NO_CASTLING, null)
    expect(hasMoveTo(moves, { row: 2, col: 4 })).toBe(false)
    expect(hasMoveTo(moves, { row: 3, col: 4 })).toBe(false)
  })
})

// ============================================================
// 4. En passant edge cases
// ============================================================

describe('En passant edge cases', () => {
  it('en passant by black pawn captures white pawn that just double-pushed', () => {
    // Black pawn on d4 (row 4, col 3), white pawn just double-pushed to e4 (row 4, col 4)
    const board = emptyBoard()
    placePiece(board, 4, 3, 2, 'pawn') // black pawn on rank 4
    placePiece(board, 4, 4, 1, 'pawn') // white pawn that just double-pushed
    placePiece(board, 0, 0, 2, 'king')
    placePiece(board, 7, 7, 1, 'king')

    // En passant square is behind the white pawn (row 5, col 4)
    const enPassantSquare: Position = { row: 5, col: 4 }
    const moves = getValidMovesForPiece(
      board,
      { row: 4, col: 3 },
      NO_CASTLING,
      enPassantSquare
    )
    const epMove = findMove(moves, { row: 4, col: 3 }, { row: 5, col: 4 })
    expect(epMove).toBeDefined()
    expect(epMove?.isEnPassant).toBe(true)
    expect(epMove?.isCapture).toBe(true)

    // Verify the board after en passant: the white pawn at (4,4) is removed
    const newBoard = applyMove(board, epMove!)
    expect(newBoard[5][4]?.type).toBe('pawn')
    expect(newBoard[5][4]?.player).toBe(2)
    expect(newBoard[4][4]).toBeNull() // captured white pawn removed
    expect(newBoard[4][3]).toBeNull() // black pawn's original square cleared
  })

  it('pinned en passant: en passant is illegal if it exposes king to discovered check along rank', () => {
    // Setup: white king on a5 (row 3, col 0), white pawn on d5 (row 3, col 3),
    // black pawn on e5 (row 3, col 4) just double-pushed,
    // black rook on h5 (row 3, col 7).
    // En passant would remove both pawns from rank 3 (row 3),
    // exposing white king to the black rook along that rank.
    const board = emptyBoard()
    placePiece(board, 3, 0, 1, 'king')  // white king on a5
    placePiece(board, 3, 3, 1, 'pawn')  // white pawn on d5
    placePiece(board, 3, 4, 2, 'pawn')  // black pawn on e5 (just double-pushed)
    placePiece(board, 3, 7, 2, 'rook')  // black rook on h5
    placePiece(board, 0, 4, 2, 'king')  // black king somewhere safe

    const enPassantSquare: Position = { row: 2, col: 4 } // behind the black pawn
    const moves = getValidMovesForPiece(
      board,
      { row: 3, col: 3 },
      NO_CASTLING,
      enPassantSquare
    )

    // En passant should be illegal because it would expose the white king
    const epMove = findMove(moves, { row: 3, col: 3 }, { row: 2, col: 4 })
    expect(epMove).toBeUndefined()
  })
})

// ============================================================
// 5. Castling edge cases
// ============================================================

describe('Castling edge cases', () => {
  it('allows black kingside castling', () => {
    const board = emptyBoard()
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 0, 7, 2, 'rook')
    placePiece(board, 7, 4, 1, 'king')

    const moves = getValidMovesForPiece(board, { row: 0, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 0, col: 4 }, { row: 0, col: 6 })
    expect(castleMove).toBeDefined()
    expect(castleMove?.isCastling).toBe(true)
    expect(castleMove?.castlingSide).toBe('kingside')
  })

  it('moves the rook correctly during black kingside castling', () => {
    const board = emptyBoard()
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 0, 7, 2, 'rook')
    placePiece(board, 7, 4, 1, 'king')

    const move: ValidMove = {
      from: { row: 0, col: 4 },
      to: { row: 0, col: 6 },
      isCapture: false,
      isCastling: true,
      castlingSide: 'kingside',
      isEnPassant: false,
      isPromotion: false,
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[0][6]?.type).toBe('king')
    expect(newBoard[0][6]?.player).toBe(2)
    expect(newBoard[0][5]?.type).toBe('rook')
    expect(newBoard[0][5]?.player).toBe(2)
    expect(newBoard[0][4]).toBeNull()
    expect(newBoard[0][7]).toBeNull()
  })

  it('allows black queenside castling', () => {
    const board = emptyBoard()
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 0, 0, 2, 'rook')
    placePiece(board, 7, 4, 1, 'king')

    const moves = getValidMovesForPiece(board, { row: 0, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 0, col: 4 }, { row: 0, col: 2 })
    expect(castleMove).toBeDefined()
    expect(castleMove?.isCastling).toBe(true)
    expect(castleMove?.castlingSide).toBe('queenside')
  })

  it('moves the rook correctly during black queenside castling', () => {
    const board = emptyBoard()
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 0, 0, 2, 'rook')
    placePiece(board, 7, 4, 1, 'king')

    const move: ValidMove = {
      from: { row: 0, col: 4 },
      to: { row: 0, col: 2 },
      isCapture: false,
      isCastling: true,
      castlingSide: 'queenside',
      isEnPassant: false,
      isPromotion: false,
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[0][2]?.type).toBe('king')
    expect(newBoard[0][2]?.player).toBe(2)
    expect(newBoard[0][3]?.type).toBe('rook')
    expect(newBoard[0][3]?.player).toBe(2)
    expect(newBoard[0][0]).toBeNull()
    expect(newBoard[0][4]).toBeNull()
  })

  it('revokes castling rights when rook is captured (not just moved)', () => {
    // White rook on h1, black bishop captures it.
    // After the capture, white kingside castling should be revoked.
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 7, 7, 1, 'rook')  // h1 rook
    placePiece(board, 7, 0, 1, 'rook')  // a1 rook
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 5, 5, 2, 'bishop') // can capture h1 rook at (7,7)

    const state = buildGameState(board, 2, { castlingRights: ALL_CASTLING })

    // Black bishop captures white h1 rook
    const captureMove: ValidMove = {
      from: { row: 5, col: 5 },
      to: { row: 7, col: 7 },
      isCapture: true,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const nextState = computeNextGameState(state, captureMove)
    // White kingside castling should be revoked because the rook was captured
    expect(nextState.castlingRights.whiteKingside).toBe(false)
    // White queenside should still be available (a1 rook untouched)
    expect(nextState.castlingRights.whiteQueenside).toBe(true)
  })

  it('queenside castling allowed even if b1 is attacked by opponent', () => {
    // For white: b1 = row 7, col 1. The king only passes through d1 and c1.
    // b1 being attacked should NOT block queenside castling.
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 7, 0, 1, 'rook')
    placePiece(board, 0, 4, 2, 'king')
    // Black rook on b8 attacks the entire b-file including b1, but NOT c1 or d1
    placePiece(board, 0, 1, 2, 'rook')

    // Verify b1 is indeed attacked but c1 and d1 are not
    expect(isSquareAttacked(board, { row: 7, col: 1 }, 2)).toBe(true)
    expect(isSquareAttacked(board, { row: 7, col: 2 }, 2)).toBe(false)
    expect(isSquareAttacked(board, { row: 7, col: 3 }, 2)).toBe(false)

    const moves = getValidMovesForPiece(board, { row: 7, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 7, col: 4 }, { row: 7, col: 2 })
    expect(castleMove).toBeDefined()
    expect(castleMove?.isCastling).toBe(true)
    expect(castleMove?.castlingSide).toBe('queenside')
  })

  it('queenside castling for black allowed even if b8 is attacked by opponent', () => {
    // For black: b8 = row 0, col 1. The king only passes through d8 and c8.
    const board = emptyBoard()
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 0, 0, 2, 'rook')
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 7, 1, 1, 'rook') // white rook on b1 attacks b8

    const moves = getValidMovesForPiece(board, { row: 0, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 0, col: 4 }, { row: 0, col: 2 })
    expect(castleMove).toBeDefined()
    expect(castleMove?.isCastling).toBe(true)
    expect(castleMove?.castlingSide).toBe('queenside')
  })
})

// ============================================================
// 6. Check scenarios
// ============================================================

describe('Check scenarios', () => {
  it('double check: king must move (cannot block both attackers)', () => {
    // White king on e1 (7,4), black rook on e8 (0,4) checks along e-file,
    // black bishop on b4 (4,1) checks diagonally.
    // White has a rook that could block one check, but not both.
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')   // white king on e1
    placePiece(board, 0, 4, 2, 'rook')   // black rook checks along e-file
    placePiece(board, 4, 1, 2, 'bishop') // black bishop checks diagonally (b4 to e1)
    placePiece(board, 0, 0, 2, 'king')   // black king
    placePiece(board, 7, 2, 1, 'rook')   // white rook could block one but not both

    // Verify the king is indeed in check
    expect(isInCheck(board, 1)).toBe(true)

    const moves = getAllValidMoves(board, 1, NO_CASTLING, null)

    // All moves must be king moves - cannot block or capture both attackers with one piece
    const nonKingMoves = moves.filter((m) => {
      const movingPiece = board[m.from.row][m.from.col]
      return movingPiece?.type !== 'king'
    })
    expect(nonKingMoves).toHaveLength(0)

    // King should still have some legal moves
    expect(moves.length).toBeGreaterThan(0)
    moves.forEach((m) => {
      const movingPiece = board[m.from.row][m.from.col]
      expect(movingPiece?.type).toBe('king')
    })
  })

  it("Fool's Mate (1.f3 e5 2.g4 Qh4#) results in checkmate", () => {
    const state = createInitialGameState()

    // 1. f3 (white pawn f2 to f3: row 6 col 5 -> row 5 col 5)
    const f3: ValidMove = {
      from: { row: 6, col: 5 },
      to: { row: 5, col: 5 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const state2 = computeNextGameState(state, f3)

    // 1... e5 (black pawn e7 to e5: row 1 col 4 -> row 3 col 4)
    const e5: ValidMove = {
      from: { row: 1, col: 4 },
      to: { row: 3, col: 4 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const state3 = computeNextGameState(state2, e5)

    // 2. g4 (white pawn g2 to g4: row 6 col 6 -> row 4 col 6)
    const g4: ValidMove = {
      from: { row: 6, col: 6 },
      to: { row: 4, col: 6 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const state4 = computeNextGameState(state3, g4)

    // 2... Qh4# (black queen d8 to h4: row 0 col 3 -> row 4 col 7)
    const qh4: ValidMove = {
      from: { row: 0, col: 3 },
      to: { row: 4, col: 7 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const state5 = computeNextGameState(state4, qh4)

    // Verify checkmate
    expect(state5.status).toBe('won')
    expect(state5.winner).toBe(2) // Black wins
    expect(state5.isInCheck).toBe(true)
    expect(state5.validMoves).toHaveLength(0)
  })

  it('interposing a piece to block check resolves it', () => {
    // White king on e1 (7,4), black rook on e8 (0,4) gives check along e-file.
    // White bishop on c1 (7,2) can interpose on e3 (5,4)? No, bishop goes diag.
    // Let's use: white rook on a4 can block on e4.
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')  // white king on e1
    placePiece(board, 0, 4, 2, 'rook')  // black rook checks along e-file
    placePiece(board, 4, 0, 1, 'rook')  // white rook on a4 can go to e4
    placePiece(board, 0, 0, 2, 'king')  // black king

    expect(isInCheck(board, 1)).toBe(true)

    const moves = getAllValidMoves(board, 1, NO_CASTLING, null)

    // White rook should be able to block on e4 (row 4, col 4)
    const blockMove = findMove(moves, { row: 4, col: 0 }, { row: 4, col: 4 })
    expect(blockMove).toBeDefined()

    // Verify the block resolves check
    const newBoard = applyMove(board, blockMove!)
    expect(isInCheck(newBoard, 1)).toBe(false)
  })
})

// ============================================================
// 7. Draw edge cases
// ============================================================

describe('Draw edge cases', () => {
  it('50-move clock resets on capture (not just pawn move)', () => {
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 4, 4, 1, 'rook')
    placePiece(board, 3, 3, 2, 'knight') // target for capture

    const state = buildGameState(board, 1, {
      halfmoveClock: 90, // close to 50-move limit
    })

    // White rook captures black knight
    const captureMove: ValidMove = {
      from: { row: 4, col: 4 },
      to: { row: 3, col: 3 },
      isCapture: true,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const nextState = computeNextGameState(state, captureMove)
    expect(nextState.halfmoveClock).toBe(0)
  })

  it('K+N+N vs K is NOT insufficient material', () => {
    // While K+N+N vs K cannot force checkmate, it is not technically classified
    // as insufficient material in the same way K+N vs K is, because checkmate is possible
    // (albeit only with cooperation). The engine should NOT declare this insufficient.
    const board = emptyBoard()
    placePiece(board, 0, 0, 1, 'king')
    placePiece(board, 2, 2, 1, 'knight')
    placePiece(board, 3, 3, 1, 'knight')
    placePiece(board, 7, 7, 2, 'king')

    expect(hasInsufficientMaterial(board)).toBe(false)
  })

  it('3-fold repetition via actual move sequence', () => {
    const state = createInitialGameState()

    // We'll move knights back and forth to reach the same position 3 times.
    // Position 0 (initial): start
    // After White Nf3, Black Nf6, White Ng1, Black Ng8 -> back to start position (occurrence 2)
    // Repeat once more -> occurrence 3 triggers draw.

    // Move 1: White knight g1 to f3 (row 7 col 6 -> row 5 col 5)
    const wNf3: ValidMove = {
      from: { row: 7, col: 6 },
      to: { row: 5, col: 5 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    // Move 2: Black knight g8 to f6 (row 0 col 6 -> row 2 col 5)
    const bNf6: ValidMove = {
      from: { row: 0, col: 6 },
      to: { row: 2, col: 5 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    // Move 3: White knight f3 back to g1 (row 5 col 5 -> row 7 col 6)
    const wNg1: ValidMove = {
      from: { row: 5, col: 5 },
      to: { row: 7, col: 6 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    // Move 4: Black knight f6 back to g8 (row 2 col 5 -> row 0 col 6)
    const bNg8: ValidMove = {
      from: { row: 2, col: 5 },
      to: { row: 0, col: 6 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }

    // First cycle: 1. Nf3 Nf6 2. Ng1 Ng8 -> back to initial (2nd occurrence)
    let s = computeNextGameState(state, wNf3)
    s = computeNextGameState(s, bNf6)
    s = computeNextGameState(s, wNg1)
    s = computeNextGameState(s, bNg8)

    // Should still be playing after 2nd occurrence
    expect(s.status).toBe('playing')

    // Second cycle: 3. Nf3 Nf6 4. Ng1 Ng8 -> back to initial (3rd occurrence)
    s = computeNextGameState(s, wNf3)
    s = computeNextGameState(s, bNf6)
    s = computeNextGameState(s, wNg1)
    s = computeNextGameState(s, bNg8)

    // Now the position has occurred 3 times -> draw by threefold repetition
    expect(s.status).toBe('draw')
    expect(s.drawReason).toBe('threefold_repetition')
    expect(s.winner).toBeNull()
  })
})

// ============================================================
// 8. Achievement tracking in computeNextGameState
// ============================================================

describe('Achievement tracking in computeNextGameState', () => {
  it('hadQueenCaptured flag is set when a queen is captured', () => {
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 4, 4, 1, 'rook')
    placePiece(board, 4, 0, 2, 'queen') // target queen
    placePiece(board, 0, 4, 2, 'king')

    const state = buildGameState(board, 1)
    expect(state.hadQueenCaptured).toBe(false)

    // White rook captures black queen
    const captureMove: ValidMove = {
      from: { row: 4, col: 4 },
      to: { row: 4, col: 0 },
      isCapture: true,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const nextState = computeNextGameState(state, captureMove)
    expect(nextState.hadQueenCaptured).toBe(true)
  })

  it('hadQueenCaptured flag remains true after subsequent non-queen captures', () => {
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 4, 4, 1, 'rook')
    placePiece(board, 4, 0, 2, 'queen')
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 2, 4, 2, 'pawn')

    const state = buildGameState(board, 1, { hadQueenCaptured: true })

    // Rook captures pawn (not a queen)
    const captureMove: ValidMove = {
      from: { row: 4, col: 4 },
      to: { row: 2, col: 4 },
      isCapture: true,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const nextState = computeNextGameState(state, captureMove)
    expect(nextState.hadQueenCaptured).toBe(true) // should remain true
  })

  it('promotedPawnCount increments on promotion', () => {
    const board = emptyBoard()
    placePiece(board, 1, 3, 1, 'pawn') // white pawn about to promote
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 0, 2, 'king')

    const state = buildGameState(board, 1)
    expect(state.promotedPawnCount).toBe(0)

    const promoteMove: ValidMove = {
      from: { row: 1, col: 3 },
      to: { row: 0, col: 3 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: true,
      promotedTo: 'queen',
    }
    const nextState = computeNextGameState(state, promoteMove)
    expect(nextState.promotedPawnCount).toBe(1)
  })

  it('promotedPawnCount increments on each subsequent promotion', () => {
    const board = emptyBoard()
    placePiece(board, 1, 3, 1, 'pawn')
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 0, 2, 'king')

    const state = buildGameState(board, 1, { promotedPawnCount: 2 })

    const promoteMove: ValidMove = {
      from: { row: 1, col: 3 },
      to: { row: 0, col: 3 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: true,
      promotedTo: 'rook',
    }
    const nextState = computeNextGameState(state, promoteMove)
    expect(nextState.promotedPawnCount).toBe(3)
  })

  it('castledThisGame flag is set on castling', () => {
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 7, 7, 1, 'rook')
    placePiece(board, 0, 4, 2, 'king')

    const state = buildGameState(board, 1, { castlingRights: ALL_CASTLING })
    expect(state.castledThisGame).toBe(false)

    const castleMove: ValidMove = {
      from: { row: 7, col: 4 },
      to: { row: 7, col: 6 },
      isCapture: false,
      isCastling: true,
      castlingSide: 'kingside',
      isEnPassant: false,
      isPromotion: false,
    }
    const nextState = computeNextGameState(state, castleMove)
    expect(nextState.castledThisGame).toBe(true)
  })

  it('usedEnPassant flag is set on en passant capture', () => {
    const board = emptyBoard()
    placePiece(board, 3, 3, 1, 'pawn')  // white pawn on d5
    placePiece(board, 3, 4, 2, 'pawn')  // black pawn on e5 (just double-pushed)
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 4, 2, 'king')

    const enPassantSquare: Position = { row: 2, col: 4 }
    const state = buildGameState(board, 1, { enPassantSquare })
    expect(state.usedEnPassant).toBe(false)

    const epMove: ValidMove = {
      from: { row: 3, col: 3 },
      to: { row: 2, col: 4 },
      isCapture: true,
      isCastling: false,
      isEnPassant: true,
      isPromotion: false,
    }
    const nextState = computeNextGameState(state, epMove)
    expect(nextState.usedEnPassant).toBe(true)
  })

  it('usedEnPassant flag remains true after subsequent non-EP captures', () => {
    const board = emptyBoard()
    placePiece(board, 4, 4, 1, 'rook')
    placePiece(board, 4, 0, 2, 'pawn')
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 4, 2, 'king')

    const state = buildGameState(board, 1, { usedEnPassant: true })

    const captureMove: ValidMove = {
      from: { row: 4, col: 4 },
      to: { row: 4, col: 0 },
      isCapture: true,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const nextState = computeNextGameState(state, captureMove)
    expect(nextState.usedEnPassant).toBe(true)
  })

  it('achievement flags are independent and can all be set simultaneously', () => {
    // Set up a position where castling has occurred, EP used, queen captured, pawn promoted
    const board = emptyBoard()
    placePiece(board, 1, 3, 1, 'pawn') // about to promote
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 0, 0, 2, 'king')

    const state = buildGameState(board, 1, {
      hadQueenCaptured: true,
      castledThisGame: true,
      usedEnPassant: true,
      promotedPawnCount: 1,
    })

    // Promote the pawn (increments promotedPawnCount further)
    const promoteMove: ValidMove = {
      from: { row: 1, col: 3 },
      to: { row: 0, col: 3 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: true,
      promotedTo: 'queen',
    }
    const nextState = computeNextGameState(state, promoteMove)
    expect(nextState.hadQueenCaptured).toBe(true)
    expect(nextState.castledThisGame).toBe(true)
    expect(nextState.usedEnPassant).toBe(true)
    expect(nextState.promotedPawnCount).toBe(2)
  })
})
