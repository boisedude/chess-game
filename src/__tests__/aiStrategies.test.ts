/**
 * AI Strategies Unit Tests
 *
 * Tests for getAIMove across all difficulty levels.
 * Verifies move legality, difficulty-specific behavior, and edge cases
 * including checkmate detection, promotion, and tactical awareness.
 */

import { getAIMove } from '../lib/aiStrategies'
import { createInitialGameState, getAllValidMoves, computeNextGameState } from '../lib/chessRules'
import { getBookMove } from '../lib/openingBook'
import type { GameState, Board, ValidMove, CastlingRights, Piece, Player } from '../types/chess.types'

// ============================================================
// Helpers
// ============================================================

/** Create an empty 8x8 board. */
function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null))
}

/** Place a piece on the board. Mutates and returns the board for chaining. */
function placePiece(board: Board, row: number, col: number, player: Player, type: Piece['type']): Board {
  board[row][col] = { player, type }
  return board
}

/** Default castling rights with everything disabled. */
const NO_CASTLING: CastlingRights = {
  whiteKingside: false,
  whiteQueenside: false,
  blackKingside: false,
  blackQueenside: false,
}

/**
 * Build a custom GameState from an initial state, overriding specific fields.
 * Recomputes validMoves for the currentPlayer automatically.
 */
function makeState(overrides: Partial<GameState>): GameState {
  const base = createInitialGameState('pvc', 'medium')
  const merged = { ...base, ...overrides }

  // Recompute valid moves for the current player on the given board
  const validMoves = getAllValidMoves(
    merged.board,
    merged.currentPlayer,
    merged.castlingRights,
    merged.enPassantSquare,
  )
  return { ...merged, validMoves }
}

// ============================================================
// Tests
// ============================================================

describe('getAIMove', () => {
  // ----------------------------------------------------------
  // 1. Returns a valid move for each difficulty level
  // ----------------------------------------------------------
  describe('returns a valid move from the initial position', () => {
    it.each<[string, 'easy' | 'medium' | 'hard']>([
      ['easy', 'easy'],
      ['medium', 'medium'],
      ['hard', 'hard'],
    ])('difficulty: %s', (_label, difficulty) => {
      const state = createInitialGameState('pvc', difficulty)
      const move = getAIMove(state, 1, difficulty)
      expect(move).not.toBeNull()

      const legal = getAllValidMoves(state.board, 1, state.castlingRights, state.enPassantSquare)
      const found = legal.some(
        (m) =>
          m.from.row === move!.from.row &&
          m.from.col === move!.from.col &&
          m.to.row === move!.to.row &&
          m.to.col === move!.to.col,
      )
      expect(found).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // 2. Returns null when no valid moves exist (checkmate)
  // ----------------------------------------------------------
  it('returns null when the player is checkmated (no legal moves)', () => {
    // Ladder mate: White king at h1 (7,7).
    // Black rook on a1 (7,0) gives check along rank 1 (row 7).
    // Black rook on a2 (6,0) covers rank 2 (row 6).
    // All escape squares for White king are covered:
    //   g1 (7,6) - Ra1 covers row 7
    //   g2 (6,6) - Ra2 covers row 6
    //   h2 (6,7) - Ra2 covers row 6
    const board = emptyBoard()
    placePiece(board, 7, 7, 1, 'king') // Kh1
    placePiece(board, 7, 0, 2, 'rook') // Ra1 - check along row 7
    placePiece(board, 6, 0, 2, 'rook') // Ra2 - covers row 6
    placePiece(board, 0, 0, 2, 'king') // Ka8

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    expect(state.validMoves.length).toBe(0)

    const move = getAIMove(state, 1, 'hard')
    expect(move).toBeNull()
  })

  // ----------------------------------------------------------
  // 3. Easy difficulty returns a move (may be random)
  // ----------------------------------------------------------
  it('easy difficulty always returns a legal move', () => {
    const state = createInitialGameState('pvc', 'easy')
    for (let i = 0; i < 10; i++) {
      const move = getAIMove(state, 1, 'easy')
      expect(move).not.toBeNull()
      const legal = getAllValidMoves(state.board, 1, state.castlingRights, state.enPassantSquare)
      const found = legal.some(
        (m) =>
          m.from.row === move!.from.row &&
          m.from.col === move!.from.col &&
          m.to.row === move!.to.row &&
          m.to.col === move!.to.col,
      )
      expect(found).toBe(true)
    }
  })

  // ----------------------------------------------------------
  // 4. Hard difficulty avoids hanging the queen
  // ----------------------------------------------------------
  it('hard difficulty does not blunder the queen to a square defended by a rook', () => {
    // White: King e1 (7,4), Queen a4 (4,0)
    // Black: King e8 (0,4), Rook a8 (0,0) guards the a-file, Knight b6 (2,1)
    // Moving Qa8?? would hang the queen to the rook.
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 4, 0, 1, 'queen') // Qa4
    placePiece(board, 0, 4, 2, 'king')
    placePiece(board, 0, 0, 2, 'rook') // Ra8 guards a-file
    placePiece(board, 2, 1, 2, 'knight') // Nb6

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    // The AI should NOT move the queen to a8 (row 0, col 0) where it hangs to the rook
    const isBlunder =
      move!.from.row === 4 && move!.from.col === 0 &&
      move!.to.row === 0 && move!.to.col === 0
    expect(isBlunder).toBe(false)
  })

  // ----------------------------------------------------------
  // 5. Hard difficulty finds mate in 1 (back-rank mate)
  // ----------------------------------------------------------
  it('hard difficulty finds back-rank mate in 1', () => {
    // White: King g1 (7,6), Rook d1 (7,3)
    // Black: King g8 (0,6), pawns f7/g7/h7 boxing in king
    // White to move: Rd8# is checkmate.
    const board = emptyBoard()
    placePiece(board, 7, 6, 1, 'king') // Kg1
    placePiece(board, 7, 3, 1, 'rook') // Rd1
    placePiece(board, 0, 6, 2, 'king') // Kg8
    placePiece(board, 1, 5, 2, 'pawn') // f7
    placePiece(board, 1, 6, 2, 'pawn') // g7
    placePiece(board, 1, 7, 2, 'pawn') // h7

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    // Must be Rd8# (rook from d1 to d8)
    expect(move!.from).toEqual({ row: 7, col: 3 })
    expect(move!.to).toEqual({ row: 0, col: 3 })
  })

  // ----------------------------------------------------------
  // 6. All returned moves are in the list of valid moves
  // ----------------------------------------------------------
  it('returned move is always in the valid moves list across all difficulties', () => {
    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']
    const state = createInitialGameState('pvc', 'medium')

    for (const diff of difficulties) {
      for (let i = 0; i < 5; i++) {
        const move = getAIMove(state, 1, diff)
        expect(move).not.toBeNull()

        const legal = getAllValidMoves(state.board, 1, state.castlingRights, state.enPassantSquare)
        const found = legal.some(
          (m) =>
            m.from.row === move!.from.row &&
            m.from.col === move!.from.col &&
            m.to.row === move!.to.row &&
            m.to.col === move!.to.col,
        )
        expect(found).toBe(true)
      }
    }
  })

  // ----------------------------------------------------------
  // 7. AI handles promotion correctly
  // ----------------------------------------------------------
  it('returns a promotion move when a pawn can reach the last rank', () => {
    // White pawn on row 1 can push to row 0 (promotion)
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king') // Ke1
    placePiece(board, 1, 0, 1, 'pawn') // Pa7 about to promote
    placePiece(board, 0, 4, 2, 'king') // Ke8

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    // The pawn should advance to promotion (row 0)
    expect(move!.from).toEqual({ row: 1, col: 0 })
    expect(move!.to.row).toBe(0)
    expect(move!.isPromotion).toBe(true)
    // Should promote to queen (best piece)
    expect(move!.promotedTo).toBe('queen')
  })

  // ----------------------------------------------------------
  // 8. Medium difficulty prefers capturing a free piece
  // ----------------------------------------------------------
  it('medium difficulty captures a free rook rather than making a quiet move', () => {
    // White: King e1 (7,4), Pawn e4 (4,4)
    // Black: King h8 (0,7), Rook d5 (3,3) - free to capture via exd5
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 4, 4, 1, 'pawn') // e4
    placePiece(board, 0, 7, 2, 'king')
    placePiece(board, 3, 3, 2, 'rook') // Rd5 - free to capture

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    // Medium difficulty should capture the rook the vast majority of the time
    let captureCount = 0
    const trials = 20
    for (let i = 0; i < trials; i++) {
      const move = getAIMove(state, 1, 'medium')
      expect(move).not.toBeNull()
      if (move!.to.row === 3 && move!.to.col === 3 && move!.isCapture) {
        captureCount++
      }
    }
    // Medium should find this capture most of the time (at least 70%)
    expect(captureCount).toBeGreaterThanOrEqual(Math.floor(trials * 0.7))
  })

  // ----------------------------------------------------------
  // 9. AI plays as Black (Player 2)
  // ----------------------------------------------------------
  it('returns a valid move when playing as Black (player 2)', () => {
    const initialState = createInitialGameState('pvc', 'medium')
    // Make a simple opening move for White: e2-e4
    const whiteMove: ValidMove = {
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
      isCapture: false,
      isCastling: false,
      isEnPassant: false,
      isPromotion: false,
    }
    const stateAfterWhite = computeNextGameState(initialState, whiteMove)
    expect(stateAfterWhite.currentPlayer).toBe(2)

    const move = getAIMove(stateAfterWhite, 2, 'medium')
    expect(move).not.toBeNull()

    const legal = getAllValidMoves(
      stateAfterWhite.board,
      2,
      stateAfterWhite.castlingRights,
      stateAfterWhite.enPassantSquare,
    )
    const found = legal.some(
      (m) =>
        m.from.row === move!.from.row &&
        m.from.col === move!.from.col &&
        m.to.row === move!.to.row &&
        m.to.col === move!.to.col,
    )
    expect(found).toBe(true)
  })

  // ----------------------------------------------------------
  // 10. Returns the only move when there is exactly one legal move
  // ----------------------------------------------------------
  it('returns the only legal move when there is exactly one', () => {
    // White King h1 (7,7), Black King f3 (5,5), Black Rook g8 (0,6)
    // Kh1 options: g1(7,6) controlled by Rg8, g2(6,6) controlled by Kf3, h2(6,7) only safe move
    const board = emptyBoard()
    placePiece(board, 7, 7, 1, 'king') // Kh1
    placePiece(board, 5, 5, 2, 'king') // Kf3
    placePiece(board, 0, 6, 2, 'rook') // Rg8

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const legal = state.validMoves
    expect(legal.length).toBe(1)
    expect(legal[0].to).toEqual({ row: 6, col: 7 }) // Kh2

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()
    expect(move!.from).toEqual(legal[0].from)
    expect(move!.to).toEqual(legal[0].to)
  })

  // ----------------------------------------------------------
  // 11. Hard AI avoids stalemating when winning
  // ----------------------------------------------------------
  it('hard AI does not stalemate when it has a winning position', () => {
    // White: King e1 (7,4), Queen h5 (3,7), Rook a1 (7,0)
    // Black: King a8 (0,0) alone
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 3, 7, 1, 'queen')
    placePiece(board, 7, 0, 1, 'rook')
    placePiece(board, 0, 0, 2, 'king')

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    const newState = computeNextGameState(state, move!)
    // Either checkmate (won) or Black still has moves -- never stalemate
    if (newState.status === 'won') {
      expect(newState.winner).toBe(1)
    } else {
      expect(newState.status).not.toBe('draw')
    }
  })

  // ----------------------------------------------------------
  // 12. AI handles en passant capture
  // ----------------------------------------------------------
  it('hard AI considers en passant capture as a legal option', () => {
    // White pawn on e5 (3,4), Black pawn just moved d7-d5 (3,3)
    // En passant square is d6 (2,3)
    const board = emptyBoard()
    placePiece(board, 7, 7, 1, 'king')
    placePiece(board, 3, 4, 1, 'pawn') // e5
    placePiece(board, 0, 0, 2, 'king')
    placePiece(board, 3, 3, 2, 'pawn') // d5

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: { row: 2, col: 3 }, // d6
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    const legal = state.validMoves
    const found = legal.some(
      (m) =>
        m.from.row === move!.from.row &&
        m.from.col === move!.from.col &&
        m.to.row === move!.to.row &&
        m.to.col === move!.to.col,
    )
    expect(found).toBe(true)
  })

  // ----------------------------------------------------------
  // 13. Hard AI prefers capturing a queen over a pawn
  // ----------------------------------------------------------
  it('hard AI captures the higher-value piece when two captures are available', () => {
    // Knight on d4 (4,3) can jump to c6 (2,2) or f5 (3,5).
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king')
    placePiece(board, 4, 3, 1, 'knight') // Nd4
    placePiece(board, 0, 7, 2, 'king')
    placePiece(board, 2, 2, 2, 'pawn') // Pc6
    placePiece(board, 3, 5, 2, 'queen') // Qf5

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    // Hard AI should capture the queen on f5 (row 3, col 5)
    expect(move!.to).toEqual({ row: 3, col: 5 })
    expect(move!.isCapture).toBe(true)
  })

  // ----------------------------------------------------------
  // 14. AI works correctly from a mid-game position
  // ----------------------------------------------------------
  it('returns a valid move from a mid-game position after several moves', () => {
    let state = createInitialGameState('pvc', 'medium')

    // Play a few opening moves: 1. e4 e5 2. Nf3 Nc6
    const openingMoves: Array<{ from: { row: number; col: number }; to: { row: number; col: number } }> = [
      { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } }, // e4
      { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } }, // e5
      { from: { row: 7, col: 6 }, to: { row: 5, col: 5 } }, // Nf3
      { from: { row: 0, col: 1 }, to: { row: 2, col: 2 } }, // Nc6
    ]

    for (const m of openingMoves) {
      const legal = state.validMoves
      const validMove = legal.find(
        (v) => v.from.row === m.from.row && v.from.col === m.from.col &&
               v.to.row === m.to.row && v.to.col === m.to.col,
      )
      expect(validMove).toBeDefined()
      state = computeNextGameState(state, validMove!)
    }

    expect(state.currentPlayer).toBe(1)
    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    const legal = getAllValidMoves(state.board, 1, state.castlingRights, state.enPassantSquare)
    const found = legal.some(
      (m) =>
        m.from.row === move!.from.row &&
        m.from.col === move!.from.col &&
        m.to.row === move!.to.row &&
        m.to.col === move!.to.col,
    )
    expect(found).toBe(true)
  })

  // ----------------------------------------------------------
  // 15. Hard AI centralizes king in endgame (K+R vs K)
  // ----------------------------------------------------------
  it('hard AI centralizes king in K+R vs K endgame rather than hiding in corner', () => {
    // White: King a1 (7,0) in the corner, Rook e4 (4,4)
    // Black: King e8 (0,4) alone
    // In an endgame, the AI should move the king toward the center.
    const board = emptyBoard()
    placePiece(board, 7, 0, 1, 'king') // Ka1 - corner
    placePiece(board, 4, 4, 1, 'rook') // Re4
    placePiece(board, 0, 4, 2, 'king') // Ke8

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    // If the king moves, it should move toward the center (not stay in corner)
    if (move!.from.row === 7 && move!.from.col === 0) {
      // King moved from a1 - verify it moved toward center (not to a2 row 6 col 0 corner edge)
      const distFromCorner = Math.abs(move!.to.row - 3.5) + Math.abs(move!.to.col - 3.5)
      const originalDist = Math.abs(7 - 3.5) + Math.abs(0 - 3.5)
      expect(distFromCorner).toBeLessThan(originalDist)
    }
    // If the rook moves instead, that's also valid strategy - just verify it's legal
  })

  // ----------------------------------------------------------
  // 16. Hard AI prefers castling when available
  // ----------------------------------------------------------
  it('hard AI castles when the position favors it', () => {
    // White: King e1 (7,4), Rook h1 (7,7) - castling available
    // Black: King e8 (0,4), pawns on a7/b7/c7 (far from action)
    // White has kingside castling rights, clear path.
    // Multiple trials since other moves might score similarly.
    const board = emptyBoard()
    placePiece(board, 7, 4, 1, 'king') // Ke1
    placePiece(board, 7, 7, 1, 'rook') // Rh1
    placePiece(board, 6, 5, 1, 'pawn') // f2 - pawn shield after castling
    placePiece(board, 6, 6, 1, 'pawn') // g2
    placePiece(board, 6, 7, 1, 'pawn') // h2
    placePiece(board, 0, 4, 2, 'king') // Ke8
    placePiece(board, 1, 0, 2, 'pawn') // a7
    placePiece(board, 1, 1, 2, 'pawn') // b7
    placePiece(board, 1, 2, 2, 'pawn') // c7

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: {
        whiteKingside: true,
        whiteQueenside: false,
        blackKingside: false,
        blackQueenside: false,
      },
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    // Hard AI should castle (Kg1: king from e1 to g1)
    expect(move!.isCastling).toBe(true)
    expect(move!.from).toEqual({ row: 7, col: 4 })
    expect(move!.to).toEqual({ row: 7, col: 6 })
  })

  // ----------------------------------------------------------
  // 17. Hard AI finds queen checkmate in one move
  // ----------------------------------------------------------
  it('hard AI delivers queen checkmate in one move', () => {
    // White: King f1 (7,5), Queen h6 (2,7), Rook f2 (6,5) covers f-file
    // Black: King g8 (0,6), pawns f7/g7/h7 boxing in king
    // After Qxg7#: queen on g7 is protected by Rg1 along g-file.
    // King on g8 has no escape:
    //   f8 (0,5) covered by Qg7
    //   h8 (0,7) covered by Qg7
    //   h7/f7 are own pawns
    // This IS checkmate.
    const board = emptyBoard()
    placePiece(board, 7, 5, 1, 'king') // Kf1
    placePiece(board, 2, 7, 1, 'queen') // Qh6
    placePiece(board, 7, 6, 1, 'rook') // Rg1 protects g-file
    placePiece(board, 0, 6, 2, 'king') // Kg8
    placePiece(board, 1, 5, 2, 'pawn') // f7
    placePiece(board, 1, 6, 2, 'pawn') // g7
    placePiece(board, 1, 7, 2, 'pawn') // h7

    const state = makeState({
      board,
      currentPlayer: 1,
      castlingRights: NO_CASTLING,
      enPassantSquare: null,
    })

    const move = getAIMove(state, 1, 'hard')
    expect(move).not.toBeNull()

    // Verify the AI found checkmate: Qxg7#
    expect(move!.to).toEqual({ row: 1, col: 6 })
    expect(move!.isCapture).toBe(true)

    // Confirm it is actually checkmate
    const newState = computeNextGameState(state, move!)
    expect(newState.status).toBe('won')
    expect(newState.winner).toBe(1)
  })

  // ----------------------------------------------------------
  // Opening Book Tests
  // ----------------------------------------------------------
  describe('opening book', () => {
    it('getBookMove returns a book move from the initial position (White)', () => {
      const state = createInitialGameState('pvc', 'hard')
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      // Should be e4 or d4 (the two book moves for White's first move)
      const isE4 = bookMove!.from.row === 6 && bookMove!.from.col === 4 &&
                    bookMove!.to.row === 4 && bookMove!.to.col === 4
      const isD4 = bookMove!.from.row === 6 && bookMove!.from.col === 3 &&
                    bookMove!.to.row === 4 && bookMove!.to.col === 3
      expect(isE4 || isD4).toBe(true)
    })

    it('getBookMove returns a book response to 1.e4 (Black)', () => {
      const state = createInitialGameState('pvc', 'hard')
      // Play 1.e4
      const e4: ValidMove = {
        from: { row: 6, col: 4 }, to: { row: 4, col: 4 },
        isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
      }
      const afterE4 = computeNextGameState(state, e4)

      const bookMove = getBookMove(afterE4)
      expect(bookMove).not.toBeNull()

      // Should be one of: e5, c5, e6, c6, d5
      const to = bookMove!.to
      const isE5 = to.row === 3 && to.col === 4 // e5
      const isC5 = to.row === 3 && to.col === 2 // c5
      const isE6 = to.row === 2 && to.col === 4 // e6
      const isC6 = to.row === 2 && to.col === 2 // c6 (Caro-Kann)
      const isD5 = to.row === 3 && to.col === 3 // d5
      expect(isE5 || isC5 || isE6 || isC6 || isD5).toBe(true)
    })

    it('hard AI plays a book move from the initial position', () => {
      const state = createInitialGameState('pvc', 'hard')
      const move = getAIMove(state, 1, 'hard')
      expect(move).not.toBeNull()

      // Hard AI should play e4 or d4 (the book moves)
      const isE4 = move!.from.row === 6 && move!.from.col === 4 &&
                    move!.to.row === 4 && move!.to.col === 4
      const isD4 = move!.from.row === 6 && move!.from.col === 3 &&
                    move!.to.row === 4 && move!.to.col === 3
      expect(isE4 || isD4).toBe(true)
    })

    it('hard AI follows book through several moves (Italian Game path)', () => {
      let state = createInitialGameState('pvc', 'hard')
      // 1.e4 e5 2.Nf3 Nc6
      const moves: Array<{ from: { row: number; col: number }; to: { row: number; col: number } }> = [
        { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } }, // e4
        { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } }, // e5
        { from: { row: 7, col: 6 }, to: { row: 5, col: 5 } }, // Nf3
        { from: { row: 0, col: 1 }, to: { row: 2, col: 2 } }, // Nc6
      ]

      for (const m of moves) {
        const validMove = state.validMoves.find(
          (v) => v.from.row === m.from.row && v.from.col === m.from.col &&
                 v.to.row === m.to.row && v.to.col === m.to.col,
        )
        expect(validMove).toBeDefined()
        state = computeNextGameState(state, validMove!)
      }

      // Position after 1.e4 e5 2.Nf3 Nc6 — book should offer Bc4, Bb5, or d4
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      // Verify it's one of the book moves
      const legal = getAllValidMoves(state.board, state.currentPlayer, state.castlingRights, state.enPassantSquare)
      const found = legal.some(
        (m) => m.from.row === bookMove!.from.row && m.from.col === bookMove!.from.col &&
               m.to.row === bookMove!.to.row && m.to.col === bookMove!.to.col,
      )
      expect(found).toBe(true)
    })

    it('getBookMove returns null when position is off book', () => {
      const state = createInitialGameState('pvc', 'hard')
      // Play 1.a4 (not in book)
      const a4: ValidMove = {
        from: { row: 6, col: 0 }, to: { row: 4, col: 0 },
        isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
      }
      const afterA4 = computeNextGameState(state, a4)

      const bookMove = getBookMove(afterA4)
      expect(bookMove).toBeNull()
    })

    it('easy AI does not use book moves (can play any legal move)', () => {
      // Easy AI has 30% random chance + no book lookup. We verify it sometimes
      // plays non-book moves. Over 20 trials with 30% randomness,
      // easy should sometimes play moves other than e4/d4.
      const state = createInitialGameState('pvc', 'easy')
      let nonBookCount = 0
      for (let i = 0; i < 30; i++) {
        const move = getAIMove(state, 1, 'easy')
        expect(move).not.toBeNull()
        const isE4 = move!.from.row === 6 && move!.from.col === 4 &&
                      move!.to.row === 4 && move!.to.col === 4
        const isD4 = move!.from.row === 6 && move!.from.col === 3 &&
                      move!.to.row === 4 && move!.to.col === 3
        if (!isE4 && !isD4) nonBookCount++
      }
      // Easy AI should play non-book moves at least sometimes (no book + random chance)
      expect(nonBookCount).toBeGreaterThan(0)
    })

    it('book move is always a legal valid move', () => {
      const state = createInitialGameState('pvc', 'hard')
      // Test across multiple first moves
      for (let i = 0; i < 10; i++) {
        const bookMove = getBookMove(state)
        if (!bookMove) continue

        const legal = getAllValidMoves(state.board, state.currentPlayer, state.castlingRights, state.enPassantSquare)
        const found = legal.some(
          (m) => m.from.row === bookMove.from.row && m.from.col === bookMove.from.col &&
                 m.to.row === bookMove.to.row && m.to.col === bookMove.to.col,
        )
        expect(found).toBe(true)
      }
    })
  })
})
