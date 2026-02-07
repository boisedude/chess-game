/**
 * Chess Rules Engine - Unit Tests
 *
 * Comprehensive tests for the chess rules engine covering board creation,
 * piece movement, special moves (castling, en passant, promotion),
 * check/checkmate/stalemate detection, draw conditions, and state transitions.
 */

import {
  createInitialBoard,
  createInitialGameState,
  findKing,
  countPieces,
  getMaterialValue,
  isSquareAttacked,
  isInCheck,
  getValidMovesForPiece,
  getAllValidMoves,
  applyMove,
  checkGameOver,
  computeNextGameState,
  hashBoard,
  hasInsufficientMaterial,
} from '../lib/chessRules'
import type { Board, CastlingRights, ValidMove, Player, Position, Piece, GameState } from '../types/chess.types'
import { BOARD_SIZE } from '../types/chess.types'

// ============================================================
// Helpers
// ============================================================

function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
}

function piece(player: Player, type: Piece['type']): Piece {
  return { player, type }
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

/** Find a move in the list matching from/to positions. */
function findMove(
  moves: ValidMove[],
  from: Position,
  to: Position,
  promotedTo?: string
): ValidMove | undefined {
  return moves.find(
    m =>
      m.from.row === from.row &&
      m.from.col === from.col &&
      m.to.row === to.row &&
      m.to.col === to.col &&
      (promotedTo === undefined || m.promotedTo === promotedTo)
  )
}

function hasMoveTo(moves: ValidMove[], to: Position): boolean {
  return moves.some(m => m.to.row === to.row && m.to.col === to.col)
}

// ============================================================
// 1. Board Creation
// ============================================================

describe('createInitialBoard', () => {
  it('creates an 8x8 board', () => {
    const board = createInitialBoard()
    expect(board).toHaveLength(BOARD_SIZE)
    board.forEach(row => expect(row).toHaveLength(BOARD_SIZE))
  })

  it('places black pieces on rows 0-1', () => {
    const board = createInitialBoard()
    // Black back rank
    expect(board[0][0]).toEqual({ player: 2, type: 'rook' })
    expect(board[0][1]).toEqual({ player: 2, type: 'knight' })
    expect(board[0][2]).toEqual({ player: 2, type: 'bishop' })
    expect(board[0][3]).toEqual({ player: 2, type: 'queen' })
    expect(board[0][4]).toEqual({ player: 2, type: 'king' })
    expect(board[0][5]).toEqual({ player: 2, type: 'bishop' })
    expect(board[0][6]).toEqual({ player: 2, type: 'knight' })
    expect(board[0][7]).toEqual({ player: 2, type: 'rook' })
    // Black pawns
    for (let col = 0; col < BOARD_SIZE; col++) {
      expect(board[1][col]).toEqual({ player: 2, type: 'pawn' })
    }
  })

  it('places white pieces on rows 6-7', () => {
    const board = createInitialBoard()
    // White pawns
    for (let col = 0; col < BOARD_SIZE; col++) {
      expect(board[6][col]).toEqual({ player: 1, type: 'pawn' })
    }
    // White back rank
    expect(board[7][0]).toEqual({ player: 1, type: 'rook' })
    expect(board[7][4]).toEqual({ player: 1, type: 'king' })
    expect(board[7][3]).toEqual({ player: 1, type: 'queen' })
  })

  it('has empty squares in rows 2-5', () => {
    const board = createInitialBoard()
    for (let row = 2; row <= 5; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        expect(board[row][col]).toBeNull()
      }
    }
  })

  it('has correct piece counts (16 per side)', () => {
    const board = createInitialBoard()
    const [white, black] = countPieces(board)
    expect(white).toBe(16)
    expect(black).toBe(16)
  })
})

// ============================================================
// 2. createInitialGameState
// ============================================================

describe('createInitialGameState', () => {
  it('starts with White to move and status playing', () => {
    const state = createInitialGameState()
    expect(state.currentPlayer).toBe(1)
    expect(state.status).toBe('playing')
    expect(state.winner).toBeNull()
  })

  it('starts with all castling rights', () => {
    const state = createInitialGameState()
    expect(state.castlingRights).toEqual(ALL_CASTLING)
  })

  it('starts with no en passant, zero clocks, and has valid moves for White', () => {
    const state = createInitialGameState()
    expect(state.enPassantSquare).toBeNull()
    expect(state.halfmoveClock).toBe(0)
    expect(state.fullmoveNumber).toBe(1)
    expect(state.validMoves.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 3. Utility functions
// ============================================================

describe('findKing', () => {
  it('finds white king on initial board', () => {
    const board = createInitialBoard()
    expect(findKing(board, 1)).toEqual({ row: 7, col: 4 })
  })

  it('finds black king on initial board', () => {
    const board = createInitialBoard()
    expect(findKing(board, 2)).toEqual({ row: 0, col: 4 })
  })

  it('returns null when no king present', () => {
    const board = emptyBoard()
    expect(findKing(board, 1)).toBeNull()
  })
})

describe('countPieces', () => {
  it('counts correctly on an empty board', () => {
    expect(countPieces(emptyBoard())).toEqual([0, 0])
  })

  it('counts a custom position', () => {
    const board = emptyBoard()
    board[0][0] = piece(1, 'king')
    board[7][7] = piece(2, 'king')
    board[3][3] = piece(1, 'pawn')
    expect(countPieces(board)).toEqual([2, 1])
  })
})

describe('getMaterialValue', () => {
  it('returns correct material for initial position', () => {
    const board = createInitialBoard()
    // 8 pawns (800) + 2 knights (640) + 2 bishops (660) + 2 rooks (1000) + queen (900) + king (20000)
    const expected = 8 * 100 + 2 * 320 + 2 * 330 + 2 * 500 + 900 + 20000
    expect(getMaterialValue(board, 1)).toBe(expected)
    expect(getMaterialValue(board, 2)).toBe(expected)
  })

  it('returns 0 for a player with no pieces', () => {
    const board = emptyBoard()
    expect(getMaterialValue(board, 1)).toBe(0)
  })
})

// ============================================================
// 4. Piece Movement
// ============================================================

describe('Pawn movement', () => {
  it('can move one square forward', () => {
    const board = emptyBoard()
    board[6][3] = piece(1, 'pawn')
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 6, col: 3 }, NO_CASTLING, null)
    expect(hasMoveTo(moves, { row: 5, col: 3 })).toBe(true)
  })

  it('can move two squares forward from starting row', () => {
    const board = emptyBoard()
    board[6][3] = piece(1, 'pawn')
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 6, col: 3 }, NO_CASTLING, null)
    expect(hasMoveTo(moves, { row: 4, col: 3 })).toBe(true)
  })

  it('cannot move two squares if blocked', () => {
    const board = emptyBoard()
    board[6][3] = piece(1, 'pawn')
    board[5][3] = piece(2, 'pawn') // blocking
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 6, col: 3 }, NO_CASTLING, null)
    expect(moves).toHaveLength(0)
  })

  it('can capture diagonally', () => {
    const board = emptyBoard()
    board[4][3] = piece(1, 'pawn')
    board[3][2] = piece(2, 'pawn')
    board[3][4] = piece(2, 'pawn')
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 3 }, NO_CASTLING, null)
    const captureLeft = findMove(moves, { row: 4, col: 3 }, { row: 3, col: 2 })
    const captureRight = findMove(moves, { row: 4, col: 3 }, { row: 3, col: 4 })
    expect(captureLeft?.isCapture).toBe(true)
    expect(captureRight?.isCapture).toBe(true)
  })

  it('black pawn moves downward', () => {
    const board = emptyBoard()
    board[1][4] = piece(2, 'pawn')
    board[0][4] = piece(2, 'king')
    board[7][4] = piece(1, 'king')
    const moves = getValidMovesForPiece(board, { row: 1, col: 4 }, NO_CASTLING, null)
    expect(hasMoveTo(moves, { row: 2, col: 4 })).toBe(true)
    expect(hasMoveTo(moves, { row: 3, col: 4 })).toBe(true)
  })
})

describe('Knight movement', () => {
  it('moves in L-shapes from center', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'knight')
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 4 }, NO_CASTLING, null)
    // Knight on e4 should have 8 possible squares
    expect(moves).toHaveLength(8)
    expect(hasMoveTo(moves, { row: 2, col: 3 })).toBe(true)
    expect(hasMoveTo(moves, { row: 2, col: 5 })).toBe(true)
    expect(hasMoveTo(moves, { row: 6, col: 3 })).toBe(true)
    expect(hasMoveTo(moves, { row: 6, col: 5 })).toBe(true)
  })

  it('can jump over pieces', () => {
    // Initial board - knight b1 can still move even though surrounded by pieces
    const board = createInitialBoard()
    const moves = getValidMovesForPiece(board, { row: 7, col: 1 }, ALL_CASTLING, null)
    expect(moves.length).toBeGreaterThan(0)
    expect(hasMoveTo(moves, { row: 5, col: 0 })).toBe(true)
    expect(hasMoveTo(moves, { row: 5, col: 2 })).toBe(true)
  })
})

describe('Bishop movement', () => {
  it('moves diagonally', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'bishop')
    board[7][7] = piece(1, 'king')
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 4 }, NO_CASTLING, null)
    // Should have diagonal reach in all 4 directions
    expect(hasMoveTo(moves, { row: 3, col: 3 })).toBe(true) // up-left
    expect(hasMoveTo(moves, { row: 3, col: 5 })).toBe(true) // up-right
    expect(hasMoveTo(moves, { row: 5, col: 3 })).toBe(true) // down-left
    expect(hasMoveTo(moves, { row: 5, col: 5 })).toBe(true) // down-right
    // Should not move orthogonally
    expect(hasMoveTo(moves, { row: 3, col: 4 })).toBe(false)
    expect(hasMoveTo(moves, { row: 4, col: 3 })).toBe(false)
  })

  it('is blocked by own pieces', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'bishop')
    board[3][3] = piece(1, 'pawn') // blocks upper-left diagonal
    board[7][7] = piece(1, 'king')
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 4 }, NO_CASTLING, null)
    expect(hasMoveTo(moves, { row: 3, col: 3 })).toBe(false)
    expect(hasMoveTo(moves, { row: 2, col: 2 })).toBe(false)
  })
})

describe('Rook movement', () => {
  it('moves orthogonally', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'rook')
    board[7][7] = piece(1, 'king')
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 4 }, NO_CASTLING, null)
    // Should reach all orthogonal squares
    expect(hasMoveTo(moves, { row: 0, col: 4 })).toBe(true) // up
    expect(hasMoveTo(moves, { row: 7, col: 4 })).toBe(true) // down
    expect(hasMoveTo(moves, { row: 4, col: 0 })).toBe(true) // left
    expect(hasMoveTo(moves, { row: 4, col: 7 })).toBe(true) // right
    // Should not move diagonally
    expect(hasMoveTo(moves, { row: 3, col: 3 })).toBe(false)
  })
})

describe('Queen movement', () => {
  it('combines bishop and rook movement', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'queen')
    board[7][7] = piece(1, 'king')
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 4 }, NO_CASTLING, null)
    // Orthogonal
    expect(hasMoveTo(moves, { row: 0, col: 4 })).toBe(true)
    expect(hasMoveTo(moves, { row: 4, col: 0 })).toBe(true)
    // Diagonal
    expect(hasMoveTo(moves, { row: 1, col: 1 })).toBe(true)
    expect(hasMoveTo(moves, { row: 6, col: 6 })).toBe(true)
  })
})

describe('King movement', () => {
  it('moves one square in any direction', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'king')
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 4 }, NO_CASTLING, null)
    expect(moves).toHaveLength(8)
    expect(hasMoveTo(moves, { row: 3, col: 3 })).toBe(true)
    expect(hasMoveTo(moves, { row: 3, col: 4 })).toBe(true)
    expect(hasMoveTo(moves, { row: 3, col: 5 })).toBe(true)
    expect(hasMoveTo(moves, { row: 4, col: 3 })).toBe(true)
    expect(hasMoveTo(moves, { row: 4, col: 5 })).toBe(true)
    expect(hasMoveTo(moves, { row: 5, col: 3 })).toBe(true)
    expect(hasMoveTo(moves, { row: 5, col: 4 })).toBe(true)
    expect(hasMoveTo(moves, { row: 5, col: 5 })).toBe(true)
  })

  it('cannot move into check', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'king')
    board[0][3] = piece(2, 'rook') // controls column 3
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 4, col: 4 }, NO_CASTLING, null)
    // Should not be able to move to col 3 (rook controls it)
    expect(hasMoveTo(moves, { row: 3, col: 3 })).toBe(false)
    expect(hasMoveTo(moves, { row: 4, col: 3 })).toBe(false)
    expect(hasMoveTo(moves, { row: 5, col: 3 })).toBe(false)
  })
})

// ============================================================
// 5. Castling
// ============================================================

describe('Castling', () => {
  it('allows white kingside castling', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][7] = piece(1, 'rook')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 7, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 7, col: 4 }, { row: 7, col: 6 })
    expect(castleMove).toBeDefined()
    expect(castleMove?.isCastling).toBe(true)
    expect(castleMove?.castlingSide).toBe('kingside')
  })

  it('allows white queenside castling', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][0] = piece(1, 'rook')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 7, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 7, col: 4 }, { row: 7, col: 2 })
    expect(castleMove).toBeDefined()
    expect(castleMove?.isCastling).toBe(true)
    expect(castleMove?.castlingSide).toBe('queenside')
  })

  it('moves the rook when castling kingside', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][7] = piece(1, 'rook')
    board[0][4] = piece(2, 'king')
    const move: ValidMove = {
      from: { row: 7, col: 4 }, to: { row: 7, col: 6 },
      isCapture: false, isCastling: true, castlingSide: 'kingside',
      isEnPassant: false, isPromotion: false,
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[7][6]?.type).toBe('king')
    expect(newBoard[7][5]?.type).toBe('rook')
    expect(newBoard[7][4]).toBeNull()
    expect(newBoard[7][7]).toBeNull()
  })

  it('moves the rook when castling queenside', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][0] = piece(1, 'rook')
    board[0][4] = piece(2, 'king')
    const move: ValidMove = {
      from: { row: 7, col: 4 }, to: { row: 7, col: 2 },
      isCapture: false, isCastling: true, castlingSide: 'queenside',
      isEnPassant: false, isPromotion: false,
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[7][2]?.type).toBe('king')
    expect(newBoard[7][3]?.type).toBe('rook')
    expect(newBoard[7][0]).toBeNull()
  })

  it('is blocked when pieces are between king and rook', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][7] = piece(1, 'rook')
    board[7][5] = piece(1, 'bishop') // blocks kingside
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 7, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 7, col: 4 }, { row: 7, col: 6 })
    expect(castleMove).toBeUndefined()
  })

  it('is blocked when king is in check', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][7] = piece(1, 'rook')
    board[3][4] = piece(2, 'rook') // checking the king on file e
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 7, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 7, col: 4 }, { row: 7, col: 6 })
    expect(castleMove).toBeUndefined()
  })

  it('is blocked when king passes through attacked square', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][7] = piece(1, 'rook')
    board[3][5] = piece(2, 'rook') // attacks f1 (row 7, col 5)
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 7, col: 4 }, ALL_CASTLING, null)
    const castleMove = findMove(moves, { row: 7, col: 4 }, { row: 7, col: 6 })
    expect(castleMove).toBeUndefined()
  })

  it('is not available when rights are revoked', () => {
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[7][7] = piece(1, 'rook')
    board[0][4] = piece(2, 'king')
    const noCastling: CastlingRights = { ...ALL_CASTLING, whiteKingside: false }
    const moves = getValidMovesForPiece(board, { row: 7, col: 4 }, noCastling, null)
    const castleMove = findMove(moves, { row: 7, col: 4 }, { row: 7, col: 6 })
    expect(castleMove).toBeUndefined()
  })
})

// ============================================================
// 6. En Passant
// ============================================================

describe('En passant', () => {
  it('allows en passant capture', () => {
    const board = emptyBoard()
    board[3][3] = piece(1, 'pawn') // white pawn on rank 5
    board[3][4] = piece(2, 'pawn') // black pawn just did double push
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const enPassantSquare: Position = { row: 2, col: 4 } // behind the black pawn
    const moves = getValidMovesForPiece(board, { row: 3, col: 3 }, NO_CASTLING, enPassantSquare)
    const epMove = findMove(moves, { row: 3, col: 3 }, { row: 2, col: 4 })
    expect(epMove).toBeDefined()
    expect(epMove?.isEnPassant).toBe(true)
    expect(epMove?.isCapture).toBe(true)
  })

  it('removes the captured pawn on en passant', () => {
    const board = emptyBoard()
    board[3][3] = piece(1, 'pawn')
    board[3][4] = piece(2, 'pawn')
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const move: ValidMove = {
      from: { row: 3, col: 3 }, to: { row: 2, col: 4 },
      isCapture: true, isCastling: false, isEnPassant: true, isPromotion: false,
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[2][4]?.type).toBe('pawn')
    expect(newBoard[2][4]?.player).toBe(1)
    expect(newBoard[3][4]).toBeNull() // captured pawn removed
    expect(newBoard[3][3]).toBeNull() // original position cleared
  })

  it('is not available without en passant square', () => {
    const board = emptyBoard()
    board[3][3] = piece(1, 'pawn')
    board[3][4] = piece(2, 'pawn')
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 3, col: 3 }, NO_CASTLING, null)
    const epMove = moves.find(m => m.isEnPassant)
    expect(epMove).toBeUndefined()
  })
})

// ============================================================
// 7. Pawn Promotion
// ============================================================

describe('Pawn promotion', () => {
  it('generates all 4 promotion options when reaching last rank', () => {
    const board = emptyBoard()
    board[1][3] = piece(1, 'pawn') // one row from promotion
    board[7][4] = piece(1, 'king')
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 1, col: 3 }, NO_CASTLING, null)
    const promotions = moves.filter(m => m.isPromotion && m.to.row === 0 && m.to.col === 3)
    expect(promotions).toHaveLength(4)
    const promoTypes = promotions.map(m => m.promotedTo).sort()
    expect(promoTypes).toEqual(['bishop', 'knight', 'queen', 'rook'])
  })

  it('generates promotion with capture', () => {
    const board = emptyBoard()
    board[1][3] = piece(1, 'pawn')
    board[0][2] = piece(2, 'rook') // capturable
    board[7][4] = piece(1, 'king')
    board[0][4] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 1, col: 3 }, NO_CASTLING, null)
    const capturePromotions = moves.filter(m => m.isPromotion && m.isCapture && m.to.col === 2)
    expect(capturePromotions).toHaveLength(4)
    expect(capturePromotions[0].isCapture).toBe(true)
  })

  it('applies promotion correctly on the board', () => {
    const board = emptyBoard()
    board[1][3] = piece(1, 'pawn')
    board[7][4] = piece(1, 'king')
    board[0][0] = piece(2, 'king')
    const move: ValidMove = {
      from: { row: 1, col: 3 }, to: { row: 0, col: 3 },
      isCapture: false, isCastling: false, isEnPassant: false,
      isPromotion: true, promotedTo: 'queen',
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[0][3]).toEqual({ player: 1, type: 'queen' })
    expect(newBoard[1][3]).toBeNull()
  })
})

// ============================================================
// 8. Check Detection
// ============================================================

describe('isSquareAttacked', () => {
  it('detects pawn attack', () => {
    const board = emptyBoard()
    board[5][3] = piece(1, 'pawn') // white pawn attacks row 4, cols 2 and 4
    expect(isSquareAttacked(board, { row: 4, col: 2 }, 1)).toBe(true)
    expect(isSquareAttacked(board, { row: 4, col: 4 }, 1)).toBe(true)
    expect(isSquareAttacked(board, { row: 4, col: 3 }, 1)).toBe(false) // forward is not attack
  })

  it('detects knight attack', () => {
    const board = emptyBoard()
    board[4][4] = piece(2, 'knight')
    expect(isSquareAttacked(board, { row: 2, col: 3 }, 2)).toBe(true)
    expect(isSquareAttacked(board, { row: 3, col: 3 }, 2)).toBe(false)
  })

  it('detects rook attack along file', () => {
    const board = emptyBoard()
    board[0][3] = piece(2, 'rook')
    expect(isSquareAttacked(board, { row: 5, col: 3 }, 2)).toBe(true)
    expect(isSquareAttacked(board, { row: 5, col: 4 }, 2)).toBe(false)
  })

  it('detects bishop attack along diagonal', () => {
    const board = emptyBoard()
    board[0][0] = piece(1, 'bishop')
    expect(isSquareAttacked(board, { row: 3, col: 3 }, 1)).toBe(true)
    expect(isSquareAttacked(board, { row: 3, col: 4 }, 1)).toBe(false)
  })

  it('detects queen attack', () => {
    const board = emptyBoard()
    board[4][4] = piece(2, 'queen')
    // Diagonal
    expect(isSquareAttacked(board, { row: 2, col: 2 }, 2)).toBe(true)
    // Orthogonal
    expect(isSquareAttacked(board, { row: 4, col: 0 }, 2)).toBe(true)
  })
})

describe('isInCheck', () => {
  it('returns false on the initial board', () => {
    const board = createInitialBoard()
    expect(isInCheck(board, 1)).toBe(false)
    expect(isInCheck(board, 2)).toBe(false)
  })

  it('detects check by a rook', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'king')
    board[4][0] = piece(2, 'rook') // same row
    board[0][0] = piece(2, 'king')
    expect(isInCheck(board, 1)).toBe(true)
  })

  it('detects check by a knight', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'king')
    board[2][3] = piece(2, 'knight') // L-shape attack
    board[0][0] = piece(2, 'king')
    expect(isInCheck(board, 1)).toBe(true)
  })
})

// ============================================================
// 9. Checkmate Detection
// ============================================================

describe('Checkmate detection', () => {
  it('detects back rank mate', () => {
    // White king on g1, pawns on f2, g2, h2, black rook delivers on e1
    const board = emptyBoard()
    board[7][6] = piece(1, 'king')  // Kg1
    board[6][5] = piece(1, 'pawn')  // f2
    board[6][6] = piece(1, 'pawn')  // g2
    board[6][7] = piece(1, 'pawn')  // h2
    board[7][0] = piece(2, 'rook')  // Ra1 - delivers mate
    board[0][0] = piece(2, 'king')
    const result = checkGameOver(board, 1, NO_CASTLING, null, 0, [])
    expect(result.isOver).toBe(true)
    expect(result.winner).toBe(2) // Black wins
  })

  it('detects ladder mate with two rooks', () => {
    // Black king on h8, white rook on h1 checks along h-file,
    // white rook on g2 covers g-file so king cannot escape
    const board = emptyBoard()
    board[0][7] = piece(2, 'king')   // Kh8
    board[7][7] = piece(1, 'rook')   // Rh1 - delivers check along h-file
    board[6][6] = piece(1, 'rook')   // Rg2 - covers g-file
    board[7][0] = piece(1, 'king')   // Ka1
    // King on h8 is checked by Rh1. Escapes: g8 (covered by Rg2), g7 (covered by Rg2). No escape.
    const result = checkGameOver(board, 2, NO_CASTLING, null, 0, [])
    expect(result.isOver).toBe(true)
    expect(result.winner).toBe(1) // White wins
  })
})

// ============================================================
// 10. Stalemate Detection
// ============================================================

describe('Stalemate detection', () => {
  it('detects stalemate when king has no legal moves and is not in check', () => {
    // Classic stalemate: Black king on a8, white queen on b6, white king on c6
    // King on h8, White queen on g6, white king on f6 - simpler setup
    const board = emptyBoard()
    board[0][7] = piece(2, 'king')   // Kh8
    board[1][6] = piece(1, 'queen')  // Qg7 would be check. Use Qf6 maybe.
    // Actually: K on a8, White Q on b6, White K somewhere safe
    // a8 king: can go to a7, b8, b7
    // If Qb6: covers a7 (diagonal), b7 (adjacent), b8 (along b-file)
    // So a8 king can't go anywhere. And queen on b6 doesn't check a8.
    // Wait, does Qb6 attack a8? b6 to a8: that's not a valid queen move (not same row/col/diagonal).
    // b6 diagonals: a7, c7, a5, c5, ... Qb6 attacks a7 (diagonal), b7 (file), b8 (file).
    // King on a8 can try: a7 (attacked by Q), b8 (attacked by Q on b-file), b7 (attacked by Q).
    // King is not in check (Q on b6 does not attack a8). So stalemate!
    const board2 = emptyBoard()
    board2[0][0] = piece(2, 'king')  // Ka8
    board2[2][1] = piece(1, 'queen') // Qb6
    board2[7][7] = piece(1, 'king')
    const result = checkGameOver(board2, 2, NO_CASTLING, null, 0, [])
    expect(result.isOver).toBe(true)
    expect(result.winner).toBeNull()
    expect(result.drawReason).toBe('stalemate')
  })
})

// ============================================================
// 11. Draw Conditions
// ============================================================

describe('Draw conditions', () => {
  describe('50-move rule', () => {
    it('triggers draw at 100 half-moves', () => {
      const board = emptyBoard()
      board[0][0] = piece(2, 'king')
      board[7][7] = piece(1, 'king')
      board[4][4] = piece(1, 'rook') // so game is not insufficient material
      const result = checkGameOver(board, 1, NO_CASTLING, null, 100, [])
      expect(result.isOver).toBe(true)
      expect(result.winner).toBeNull()
      expect(result.drawReason).toBe('fifty_move')
    })

    it('does not trigger at 99 half-moves', () => {
      const board = emptyBoard()
      board[0][0] = piece(2, 'king')
      board[7][7] = piece(1, 'king')
      board[4][4] = piece(1, 'rook')
      const result = checkGameOver(board, 1, NO_CASTLING, null, 99, [])
      expect(result.isOver).toBe(false)
    })
  })

  describe('3-fold repetition', () => {
    it('triggers draw on third occurrence of the same position', () => {
      const board = emptyBoard()
      board[0][0] = piece(2, 'king')
      board[7][7] = piece(1, 'king')
      board[4][4] = piece(1, 'rook')
      const hash = hashBoard(board, 1, NO_CASTLING, null)
      // Position has already appeared 3 times in history
      const history = [hash, 'other', hash, 'other2', hash]
      const result = checkGameOver(board, 1, NO_CASTLING, null, 0, history)
      expect(result.isOver).toBe(true)
      expect(result.winner).toBeNull()
      expect(result.drawReason).toBe('threefold_repetition')
    })

    it('does not trigger with only 2 occurrences', () => {
      const board = emptyBoard()
      board[0][0] = piece(2, 'king')
      board[7][7] = piece(1, 'king')
      board[4][4] = piece(1, 'rook')
      const hash = hashBoard(board, 1, NO_CASTLING, null)
      const history = [hash, 'other', hash]
      const result = checkGameOver(board, 1, NO_CASTLING, null, 0, history)
      expect(result.isOver).toBe(false)
    })
  })

  describe('Insufficient material', () => {
    it('K vs K is insufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[7][7] = piece(2, 'king')
      expect(hasInsufficientMaterial(board)).toBe(true)
    })

    it('K+N vs K is insufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[0][1] = piece(1, 'knight')
      board[7][7] = piece(2, 'king')
      expect(hasInsufficientMaterial(board)).toBe(true)
    })

    it('K+B vs K is insufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[2][2] = piece(1, 'bishop')
      board[7][7] = piece(2, 'king')
      expect(hasInsufficientMaterial(board)).toBe(true)
    })

    it('K vs K+N is insufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[7][7] = piece(2, 'king')
      board[5][5] = piece(2, 'knight')
      expect(hasInsufficientMaterial(board)).toBe(true)
    })

    it('K+B vs K+B on same color squares is insufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[2][2] = piece(1, 'bishop') // (2+2)%2 = 0
      board[7][7] = piece(2, 'king')
      board[4][4] = piece(2, 'bishop') // (4+4)%2 = 0, same color
      expect(hasInsufficientMaterial(board)).toBe(true)
    })

    it('K+B vs K+B on different color squares is sufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[2][2] = piece(1, 'bishop') // (2+2)%2 = 0
      board[7][7] = piece(2, 'king')
      board[4][3] = piece(2, 'bishop') // (4+3)%2 = 1, different color
      expect(hasInsufficientMaterial(board)).toBe(false)
    })

    it('K+R vs K is sufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[0][1] = piece(1, 'rook')
      board[7][7] = piece(2, 'king')
      expect(hasInsufficientMaterial(board)).toBe(false)
    })

    it('K+P vs K is sufficient', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[3][3] = piece(1, 'pawn')
      board[7][7] = piece(2, 'king')
      expect(hasInsufficientMaterial(board)).toBe(false)
    })

    it('triggers insufficient material draw via checkGameOver', () => {
      const board = emptyBoard()
      board[0][0] = piece(1, 'king')
      board[7][7] = piece(2, 'king')
      const result = checkGameOver(board, 1, NO_CASTLING, null, 0, [])
      expect(result.isOver).toBe(true)
      expect(result.drawReason).toBe('insufficient_material')
    })
  })
})

// ============================================================
// 12. computeNextGameState
// ============================================================

describe('computeNextGameState', () => {
  it('switches the current player after a move', () => {
    const state = createInitialGameState()
    const move: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 }, // e4
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const next = computeNextGameState(state, move)
    expect(next.currentPlayer).toBe(2)
  })

  it('sets en passant square after pawn double push', () => {
    const state = createInitialGameState()
    const move: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const next = computeNextGameState(state, move)
    expect(next.enPassantSquare).toEqual({ row: 5, col: 4 })
  })

  it('clears en passant square on non-double-push', () => {
    const state = createInitialGameState()
    // First do a double push to create en passant
    const move1: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state2 = computeNextGameState(state, move1)
    // Then black moves a knight (not a double push)
    const move2: ValidMove = {
      from: { row: 0, col: 1 }, to: { row: 2, col: 2 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state3 = computeNextGameState(state2, move2)
    expect(state3.enPassantSquare).toBeNull()
  })

  it('resets halfmove clock on pawn move', () => {
    const state = createInitialGameState()
    // First make some non-pawn move to increment clock
    // Actually, initial clock is 0 and a pawn move resets it to 0, so let's test
    // that a knight move increments it first
    const knightMove: ValidMove = {
      from: { row: 7, col: 1 }, to: { row: 5, col: 2 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state2 = computeNextGameState(state, knightMove)
    expect(state2.halfmoveClock).toBe(1)

    // Black knight move
    const knightMove2: ValidMove = {
      from: { row: 0, col: 1 }, to: { row: 2, col: 2 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state3 = computeNextGameState(state2, knightMove2)
    expect(state3.halfmoveClock).toBe(2)

    // Pawn move resets
    const pawnMove: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state4 = computeNextGameState(state3, pawnMove)
    expect(state4.halfmoveClock).toBe(0)
  })

  it('increments fullmove number after black moves', () => {
    const state = createInitialGameState()
    const whiteMove: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state2 = computeNextGameState(state, whiteMove)
    expect(state2.fullmoveNumber).toBe(1) // Still 1 after white's move

    const blackMove: ValidMove = {
      from: { row: 1, col: 4 }, to: { row: 3, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state3 = computeNextGameState(state2, blackMove)
    expect(state3.fullmoveNumber).toBe(2) // Increments after black's move
  })

  it('revokes castling rights when king moves', () => {
    const state = createInitialGameState()
    // Move pawns to open path for king
    const pawnMove: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state2 = computeNextGameState(state, pawnMove)
    const blackPawnMove: ValidMove = {
      from: { row: 1, col: 4 }, to: { row: 3, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state3 = computeNextGameState(state2, blackPawnMove)
    // King moves forward
    const kingMove: ValidMove = {
      from: { row: 7, col: 4 }, to: { row: 6, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state4 = computeNextGameState(state3, kingMove)
    expect(state4.castlingRights.whiteKingside).toBe(false)
    expect(state4.castlingRights.whiteQueenside).toBe(false)
    // Black castling unaffected
    expect(state4.castlingRights.blackKingside).toBe(true)
    expect(state4.castlingRights.blackQueenside).toBe(true)
  })

  it('revokes castling rights when rook moves', () => {
    const state = createInitialGameState()
    // Move pawn to open a-file for rook
    const pawnMove: ValidMove = {
      from: { row: 6, col: 0 }, to: { row: 4, col: 0 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state2 = computeNextGameState(state, pawnMove)
    const blackMove: ValidMove = {
      from: { row: 1, col: 4 }, to: { row: 3, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state3 = computeNextGameState(state2, blackMove)
    // Move a1 rook (row 7, col 0)
    const rookMove: ValidMove = {
      from: { row: 7, col: 0 }, to: { row: 5, col: 0 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const state4 = computeNextGameState(state3, rookMove)
    expect(state4.castlingRights.whiteQueenside).toBe(false)
    expect(state4.castlingRights.whiteKingside).toBe(true) // h1 rook unaffected
  })

  it('updates piece counts after a capture', () => {
    // Set up a position where white can capture
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')
    board[6][3] = piece(1, 'pawn')
    board[5][4] = piece(2, 'pawn') // target
    board[0][4] = piece(2, 'king')
    // We need a custom state to test capture
    const state: GameState = {
      ...createInitialGameState(),
      board,
      whiteCount: 2,
      blackCount: 2,
      validMoves: getAllValidMoves(board, 1, NO_CASTLING, null),
      castlingRights: NO_CASTLING,
    }
    const captureMove: ValidMove = {
      from: { row: 6, col: 3 }, to: { row: 5, col: 4 },
      isCapture: true, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    // Only proceed if the pawn can actually capture there
    // Pawn on d2 captures on e3 - that's diagonal. Let's verify: from (6,3) to (5,4) is diagonal capture. Yes.
    const next = computeNextGameState(state, captureMove)
    expect(next.blackCount).toBe(1) // lost a pawn
    expect(next.whiteCount).toBe(2) // unchanged
  })

  it('records the move in moveHistory', () => {
    const state = createInitialGameState()
    const move: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const next = computeNextGameState(state, move)
    expect(next.moveHistory).toHaveLength(1)
    expect(next.moveHistory[0].piece).toBe('pawn')
    expect(next.moveHistory[0].player).toBe(1)
    expect(next.moveHistory[0].from).toEqual({ row: 6, col: 4 })
    expect(next.moveHistory[0].to).toEqual({ row: 4, col: 4 })
  })
})

// ============================================================
// 13. hashBoard
// ============================================================

describe('hashBoard', () => {
  it('produces identical hashes for identical positions', () => {
    const board = createInitialBoard()
    const hash1 = hashBoard(board, 1, ALL_CASTLING, null)
    const hash2 = hashBoard(board, 1, ALL_CASTLING, null)
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different players to move', () => {
    const board = createInitialBoard()
    const hash1 = hashBoard(board, 1, ALL_CASTLING, null)
    const hash2 = hashBoard(board, 2, ALL_CASTLING, null)
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different castling rights', () => {
    const board = createInitialBoard()
    const hash1 = hashBoard(board, 1, ALL_CASTLING, null)
    const noCastling = { ...ALL_CASTLING, whiteKingside: false }
    const hash2 = hashBoard(board, 1, noCastling, null)
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different en passant squares', () => {
    const board = createInitialBoard()
    const hash1 = hashBoard(board, 1, ALL_CASTLING, null)
    const hash2 = hashBoard(board, 1, ALL_CASTLING, { row: 5, col: 4 })
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different board positions', () => {
    const board1 = createInitialBoard()
    const board2 = createInitialBoard()
    // Move a piece on board2
    board2[4][4] = board2[6][4]
    board2[6][4] = null
    const hash1 = hashBoard(board1, 1, ALL_CASTLING, null)
    const hash2 = hashBoard(board2, 1, ALL_CASTLING, null)
    expect(hash1).not.toBe(hash2)
  })
})

// ============================================================
// 14. getAllValidMoves - initial position
// ============================================================

describe('getAllValidMoves', () => {
  it('white has 20 moves in the starting position', () => {
    const board = createInitialBoard()
    const moves = getAllValidMoves(board, 1, ALL_CASTLING, null)
    // 16 pawn moves (8 pawns x 2 squares each) + 4 knight moves (2 knights x 2 moves each) = 20
    expect(moves).toHaveLength(20)
  })

  it('a pinned piece cannot move to expose the king', () => {
    // White king on e1, white bishop on d2, black rook on c3 (pins bishop along c3-e1 diagonal? no)
    // Better: White king on e1 (7,4), white rook on e4 (4,4), black rook on e2 (5,4) - no, rook blocks.
    // Pin: Wk e1 (7,4), Wb d2 (6,3), Br a5 (3,0) - bishop pinned along a5-e1 diagonal
    const board = emptyBoard()
    board[7][4] = piece(1, 'king')  // e1
    board[6][3] = piece(1, 'bishop') // d2 - pinned
    board[3][0] = piece(2, 'bishop') // a5 - pins along diagonal
    board[0][0] = piece(2, 'king')
    const moves = getValidMovesForPiece(board, { row: 6, col: 3 }, NO_CASTLING, null)
    // The bishop on d2 is pinned along the a5-e1 diagonal (d2 is on that diagonal).
    // It can only move along the pin line: to c3, b4, or e3 (but e3 blocks the diagonal from a5)
    // Actually it can move along the pin direction: towards a5 or towards e1 on that diagonal.
    // Squares along pin: (5,2)=c3, (4,1)=b4, (3,0)=a5(capture). Also no squares toward e1 since king is there.
    // So bishop can move to c3, b4, or capture on a5.
    expect(moves.length).toBeGreaterThan(0)
    // But it should NOT be able to move off the pin diagonal
    expect(hasMoveTo(moves, { row: 5, col: 4 })).toBe(false) // e3 - off the diagonal
    expect(hasMoveTo(moves, { row: 4, col: 5 })).toBe(false) // f4 - off the diagonal
  })
})

// ============================================================
// 15. applyMove - basic application
// ============================================================

describe('applyMove', () => {
  it('moves a piece from source to destination', () => {
    const board = createInitialBoard()
    const move: ValidMove = {
      from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
      isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[4][4]).toEqual({ player: 1, type: 'pawn' })
    expect(newBoard[6][4]).toBeNull()
    // Original board unchanged
    expect(board[6][4]).toEqual({ player: 1, type: 'pawn' })
  })

  it('captures replace the target piece', () => {
    const board = emptyBoard()
    board[4][4] = piece(1, 'queen')
    board[2][2] = piece(2, 'knight')
    const move: ValidMove = {
      from: { row: 4, col: 4 }, to: { row: 2, col: 2 },
      isCapture: true, isCastling: false, isEnPassant: false, isPromotion: false,
    }
    const newBoard = applyMove(board, move)
    expect(newBoard[2][2]).toEqual({ player: 1, type: 'queen' })
    expect(newBoard[4][4]).toBeNull()
  })
})
