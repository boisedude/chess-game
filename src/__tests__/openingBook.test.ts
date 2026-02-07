/**
 * Opening Book Unit Tests
 *
 * Directly tests getBookMove() for known positions, off-book fallback,
 * notation matching, and multi-move tree traversal.
 */

import { getBookMove } from '../lib/openingBook'
import { createInitialGameState, computeNextGameState, getAllValidMoves } from '../lib/chessRules'

// ============================================================
// Helpers
// ============================================================

/** Play a sequence of moves from the initial position, returning the final state. */
function playMoves(moves: Array<{ from: { row: number; col: number }; to: { row: number; col: number } }>) {
  let state = createInitialGameState('pvc', 'hard')
  for (const m of moves) {
    const validMove = state.validMoves.find(
      (v) => v.from.row === m.from.row && v.from.col === m.from.col &&
             v.to.row === m.to.row && v.to.col === m.to.col,
    )
    if (!validMove) throw new Error(`Invalid move: ${JSON.stringify(m)}`)
    state = computeNextGameState(state, validMove)
  }
  return state
}

// Move coordinate shortcuts
const E2E4 = { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } } // e4
const E7E5 = { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } } // e5
const D2D4 = { from: { row: 6, col: 3 }, to: { row: 4, col: 3 } } // d4
const D7D5 = { from: { row: 1, col: 3 }, to: { row: 3, col: 3 } } // d5
const G1F3 = { from: { row: 7, col: 6 }, to: { row: 5, col: 5 } } // Nf3
const B8C6 = { from: { row: 0, col: 1 }, to: { row: 2, col: 2 } } // Nc6
const C7C5 = { from: { row: 1, col: 2 }, to: { row: 3, col: 2 } } // c5
const E7E6 = { from: { row: 1, col: 4 }, to: { row: 2, col: 4 } } // e6
const C2C4 = { from: { row: 6, col: 2 }, to: { row: 4, col: 2 } } // c4
const G8F6 = { from: { row: 0, col: 6 }, to: { row: 2, col: 5 } } // Nf6

// ============================================================
// Tests
// ============================================================

describe('getBookMove', () => {
  // ----------------------------------------------------------
  // Root position
  // ----------------------------------------------------------
  describe('from initial position (White to move)', () => {
    it('returns e4 or d4', () => {
      const state = createInitialGameState('pvc', 'hard')
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      const isE4 = bookMove!.from.row === 6 && bookMove!.from.col === 4 &&
                    bookMove!.to.row === 4 && bookMove!.to.col === 4
      const isD4 = bookMove!.from.row === 6 && bookMove!.from.col === 3 &&
                    bookMove!.to.row === 4 && bookMove!.to.col === 3
      expect(isE4 || isD4).toBe(true)
    })

    it('returns a legal valid move', () => {
      const state = createInitialGameState('pvc', 'hard')
      const bookMove = getBookMove(state)!
      const legal = getAllValidMoves(state.board, state.currentPlayer, state.castlingRights, state.enPassantSquare)
      const found = legal.some(
        (m) => m.from.row === bookMove.from.row && m.from.col === bookMove.from.col &&
               m.to.row === bookMove.to.row && m.to.col === bookMove.to.col,
      )
      expect(found).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // Black responses to 1.e4
  // ----------------------------------------------------------
  describe('Black responses to 1.e4', () => {
    it('responds with one of e5, c5, e6, c6, d5', () => {
      const state = playMoves([E2E4])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      const to = bookMove!.to
      const isE5 = to.row === 3 && to.col === 4
      const isC5 = to.row === 3 && to.col === 2
      const isE6 = to.row === 2 && to.col === 4
      const isC6 = to.row === 2 && to.col === 2 // Caro-Kann
      const isD5 = to.row === 3 && to.col === 3
      expect(isE5 || isC5 || isE6 || isC6 || isD5).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // Black responses to 1.d4
  // ----------------------------------------------------------
  describe('Black responses to 1.d4', () => {
    it('responds with d5 or Nf6', () => {
      const state = playMoves([D2D4])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      const to = bookMove!.to
      const from = bookMove!.from
      const isD5 = to.row === 3 && to.col === 3
      const isNf6 = from.row === 0 && from.col === 6 && to.row === 2 && to.col === 5
      expect(isD5 || isNf6).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // Multi-move traversal: Italian/Ruy Lopez/Scotch
  // ----------------------------------------------------------
  describe('deep tree traversal after 1.e4 e5 2.Nf3 Nc6', () => {
    it('responds with Bc4, Bb5, or d4', () => {
      const state = playMoves([E2E4, E7E5, G1F3, B8C6])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      const piece = state.board[bookMove!.from.row][bookMove!.from.col]
      expect(piece).not.toBeNull()

      // Bc4: bishop from f1 (7,5) to c4 (4,2)
      // Bb5: bishop from f1 (7,5) to b5 (3,1)
      // d4: pawn from d2 (6,3) to d4 (4,3)
      const isBc4 = bookMove!.from.row === 7 && bookMove!.from.col === 5 &&
                     bookMove!.to.row === 4 && bookMove!.to.col === 2
      const isBb5 = bookMove!.from.row === 7 && bookMove!.from.col === 5 &&
                     bookMove!.to.row === 3 && bookMove!.to.col === 1
      const isD4 = bookMove!.from.row === 6 && bookMove!.from.col === 3 &&
                    bookMove!.to.row === 4 && bookMove!.to.col === 3
      expect(isBc4 || isBb5 || isD4).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // Sicilian Defense path
  // ----------------------------------------------------------
  describe('Sicilian Defense: 1.e4 c5 2.Nf3', () => {
    it('responds with d6, Nc6, or e6', () => {
      const state = playMoves([E2E4, C7C5, G1F3])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      const to = bookMove!.to
      const from = bookMove!.from
      // d6: pawn d7 (1,3) to d6 (2,3)
      const isD6 = from.row === 1 && from.col === 3 && to.row === 2 && to.col === 3
      // Nc6: knight b8 (0,1) to c6 (2,2)
      const isNc6 = from.row === 0 && from.col === 1 && to.row === 2 && to.col === 2
      // e6: pawn e7 (1,4) to e6 (2,4)
      const isE6 = from.row === 1 && from.col === 4 && to.row === 2 && to.col === 4
      expect(isD6 || isNc6 || isE6).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // Queen's Gambit path
  // ----------------------------------------------------------
  describe("Queen's Gambit: 1.d4 d5 2.c4", () => {
    it('responds with e6, dxc4, or c6', () => {
      const state = playMoves([D2D4, D7D5, C2C4])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      const to = bookMove!.to
      const from = bookMove!.from
      // e6: pawn e7 (1,4) to e6 (2,4)
      const isE6 = from.row === 1 && from.col === 4 && to.row === 2 && to.col === 4
      // dxc4: pawn d5 (3,3) captures c4 (4,2)
      const isDxc4 = from.row === 3 && from.col === 3 && to.row === 4 && to.col === 2 && bookMove!.isCapture
      // c6: pawn c7 (1,2) to c6 (2,2)
      const isC6 = from.row === 1 && from.col === 2 && to.row === 2 && to.col === 2
      expect(isE6 || isDxc4 || isC6).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // King's Indian path
  // ----------------------------------------------------------
  describe("King's Indian: 1.d4 Nf6 2.c4 g6", () => {
    it('responds with Nc3', () => {
      const G7G6 = { from: { row: 1, col: 6 }, to: { row: 2, col: 6 } }
      const state = playMoves([D2D4, G8F6, C2C4, G7G6])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      // Nc3: knight b1 (7,1) to c3 (5,2)
      expect(bookMove!.from).toEqual({ row: 7, col: 1 })
      expect(bookMove!.to).toEqual({ row: 5, col: 2 })
    })
  })

  // ----------------------------------------------------------
  // Off-book positions
  // ----------------------------------------------------------
  describe('off-book positions', () => {
    it('returns null after 1.a4 (not in book)', () => {
      const A2A4 = { from: { row: 6, col: 0 }, to: { row: 4, col: 0 } }
      const state = playMoves([A2A4])
      expect(getBookMove(state)).toBeNull()
    })

    it('returns null after 1.e4 a5 (not in book)', () => {
      const A7A5 = { from: { row: 1, col: 0 }, to: { row: 3, col: 0 } }
      const state = playMoves([E2E4, A7A5])
      expect(getBookMove(state)).toBeNull()
    })

    it('returns null after 1.g4 (not in book)', () => {
      const G2G4 = { from: { row: 6, col: 6 }, to: { row: 4, col: 6 } }
      const state = playMoves([G2G4])
      expect(getBookMove(state)).toBeNull()
    })
  })

  // ----------------------------------------------------------
  // Book moves beyond leaf nodes
  // ----------------------------------------------------------
  it('returns null when the book runs out of depth', () => {
    // Play deep into a line until we exhaust the book
    // French Defense: 1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.Bg5 — after Bg5, book has no children
    const B1C3 = { from: { row: 7, col: 1 }, to: { row: 5, col: 2 } } // Nc3
    const C1G5 = { from: { row: 7, col: 2 }, to: { row: 3, col: 6 } } // Bg5
    const state = playMoves([E2E4, E7E6, D2D4, D7D5, B1C3, G8F6, C1G5])
    // This position is a leaf node in the book — no further moves
    expect(getBookMove(state)).toBeNull()
  })

  // ----------------------------------------------------------
  // Random selection covers multiple options
  // ----------------------------------------------------------
  it('selects from multiple book moves over many trials', () => {
    const state = createInitialGameState('pvc', 'hard')
    const seen = new Set<string>()

    for (let i = 0; i < 50; i++) {
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()
      seen.add(`${bookMove!.to.row},${bookMove!.to.col}`)
    }

    // With 2 options (e4 and d4), we should see both over 50 trials
    expect(seen.size).toBe(2)
  })

  // ----------------------------------------------------------
  // Capture notation matching (Scandinavian: exd5)
  // ----------------------------------------------------------
  describe('capture notation matching', () => {
    it('handles Scandinavian exd5 correctly', () => {
      // 1.e4 d5 — White should respond with exd5
      const state = playMoves([E2E4, D7D5])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      // exd5: pawn e4 (4,4) captures d5 (3,3)
      expect(bookMove!.from).toEqual({ row: 4, col: 4 })
      expect(bookMove!.to).toEqual({ row: 3, col: 3 })
      expect(bookMove!.isCapture).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // Nimzo-Indian path with knight move
  // ----------------------------------------------------------
  describe('Nimzo-Indian: 1.d4 Nf6 2.c4 e6 3.Nc3', () => {
    it('responds with Bb4', () => {
      const B1C3 = { from: { row: 7, col: 1 }, to: { row: 5, col: 2 } } // Nc3
      const state = playMoves([D2D4, G8F6, C2C4, E7E6, B1C3])
      const bookMove = getBookMove(state)
      expect(bookMove).not.toBeNull()

      // Bb4: bishop f8 (0,5) to b4 (4,1)
      expect(bookMove!.from).toEqual({ row: 0, col: 5 })
      expect(bookMove!.to).toEqual({ row: 4, col: 1 })
    })
  })

  // ----------------------------------------------------------
  // Mode/difficulty don't affect book lookup
  // ----------------------------------------------------------
  it('works regardless of game mode or difficulty setting', () => {
    for (const mode of ['pvc', 'pvp'] as const) {
      for (const diff of ['easy', 'medium', 'hard'] as const) {
        const state = createInitialGameState(mode, diff)
        const bookMove = getBookMove(state)
        expect(bookMove).not.toBeNull()
      }
    }
  })
})
