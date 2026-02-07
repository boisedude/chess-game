/**
 * Move Notation Tests
 *
 * Tests for algebraic notation conversion.
 */

import { moveToAlgebraic } from '../lib/moveNotation'
import type { Move } from '../types/chess.types'

function makeMoveBase(): Move {
  return {
    from: { row: 6, col: 4 },
    to: { row: 4, col: 4 },
    player: 1,
    piece: 'pawn',
    isCapture: false,
    isCastling: false,
    isEnPassant: false,
    isPromotion: false,
    isCheck: false,
    isCheckmate: false,
  }
}

describe('moveToAlgebraic', () => {
  describe('pawn moves', () => {
    it('converts e2-e4 to e4', () => {
      const move: Move = { ...makeMoveBase(), from: { row: 6, col: 4 }, to: { row: 4, col: 4 } }
      expect(moveToAlgebraic(move)).toBe('e4')
    })

    it('converts d7-d5 to d5', () => {
      const move: Move = { ...makeMoveBase(), from: { row: 1, col: 3 }, to: { row: 3, col: 3 }, player: 2 }
      expect(moveToAlgebraic(move)).toBe('d5')
    })
  })

  describe('piece moves', () => {
    it('converts knight move to Nf3', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 6 },
        to: { row: 5, col: 5 },
        piece: 'knight',
      }
      expect(moveToAlgebraic(move)).toBe('Nf3')
    })

    it('converts bishop move to Bc4', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 5 },
        to: { row: 4, col: 2 },
        piece: 'bishop',
      }
      expect(moveToAlgebraic(move)).toBe('Bc4')
    })

    it('converts rook move to Ra1', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 3 },
        to: { row: 7, col: 0 },
        piece: 'rook',
      }
      expect(moveToAlgebraic(move)).toBe('Ra1')
    })

    it('converts queen move to Qd4', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 3 },
        to: { row: 4, col: 3 },
        piece: 'queen',
      }
      expect(moveToAlgebraic(move)).toBe('Qd4')
    })

    it('converts king move to Ke2', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 4 },
        to: { row: 6, col: 4 },
        piece: 'king',
      }
      expect(moveToAlgebraic(move)).toBe('Ke2')
    })
  })

  describe('captures', () => {
    it('converts knight capture to Nxe5', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 5, col: 5 },
        to: { row: 3, col: 4 },
        piece: 'knight',
        isCapture: true,
        captured: 'pawn',
      }
      expect(moveToAlgebraic(move)).toBe('Nxe5')
    })

    it('converts pawn capture to exd5 (includes source file)', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 4, col: 4 },
        to: { row: 3, col: 3 },
        piece: 'pawn',
        isCapture: true,
        captured: 'pawn',
      }
      expect(moveToAlgebraic(move)).toBe('exd5')
    })
  })

  describe('castling', () => {
    it('converts kingside castling to O-O', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 4 },
        to: { row: 7, col: 6 },
        piece: 'king',
        isCastling: true,
        castlingSide: 'kingside',
      }
      expect(moveToAlgebraic(move)).toBe('O-O')
    })

    it('converts queenside castling to O-O-O', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 4 },
        to: { row: 7, col: 2 },
        piece: 'king',
        isCastling: true,
        castlingSide: 'queenside',
      }
      expect(moveToAlgebraic(move)).toBe('O-O-O')
    })

    it('adds + for castling with check', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 4 },
        to: { row: 7, col: 6 },
        piece: 'king',
        isCastling: true,
        castlingSide: 'kingside',
        isCheck: true,
      }
      expect(moveToAlgebraic(move)).toBe('O-O+')
    })
  })

  describe('promotion', () => {
    it('converts pawn promotion to e8=Q', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 1, col: 4 },
        to: { row: 0, col: 4 },
        piece: 'pawn',
        isPromotion: true,
        promotedTo: 'queen',
      }
      expect(moveToAlgebraic(move)).toBe('e8=Q')
    })

    it('converts promotion with check to e8=Q+', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 1, col: 4 },
        to: { row: 0, col: 4 },
        piece: 'pawn',
        isPromotion: true,
        promotedTo: 'queen',
        isCheck: true,
      }
      expect(moveToAlgebraic(move)).toBe('e8=Q+')
    })

    it('converts promotion with checkmate to e8=Q#', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 1, col: 4 },
        to: { row: 0, col: 4 },
        piece: 'pawn',
        isPromotion: true,
        promotedTo: 'queen',
        isCheckmate: true,
      }
      expect(moveToAlgebraic(move)).toBe('e8=Q#')
    })

    it('converts promotion to knight', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 1, col: 4 },
        to: { row: 0, col: 4 },
        piece: 'pawn',
        isPromotion: true,
        promotedTo: 'knight',
      }
      expect(moveToAlgebraic(move)).toBe('e8=N')
    })

    it('converts capture-promotion to exd8=Q', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 1, col: 4 },
        to: { row: 0, col: 3 },
        piece: 'pawn',
        isCapture: true,
        captured: 'rook',
        isPromotion: true,
        promotedTo: 'queen',
      }
      expect(moveToAlgebraic(move)).toBe('exd8=Q')
    })
  })

  describe('check and checkmate', () => {
    it('adds + for check', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 3 },
        to: { row: 1, col: 7 },
        piece: 'queen',
        isCheck: true,
      }
      expect(moveToAlgebraic(move)).toBe('Qh7+')
    })

    it('adds # for checkmate', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 7, col: 3 },
        to: { row: 1, col: 7 },
        piece: 'queen',
        isCheckmate: true,
      }
      expect(moveToAlgebraic(move)).toBe('Qh7#')
    })
  })

  describe('en passant', () => {
    it('shows en passant as normal pawn capture', () => {
      const move: Move = {
        ...makeMoveBase(),
        from: { row: 3, col: 4 },
        to: { row: 2, col: 3 },
        piece: 'pawn',
        isCapture: true,
        captured: 'pawn',
        isEnPassant: true,
      }
      expect(moveToAlgebraic(move)).toBe('exd6')
    })
  })
})
