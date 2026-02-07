/**
 * Move Notation Utility
 *
 * Converts Move objects to standard algebraic notation strings.
 * Handles piece prefixes, captures, castling, promotion, check, and checkmate.
 */

import type { Move } from '@/types/chess.types'

const COL_LETTERS = 'abcdefgh'

const PIECE_PREFIX: Record<string, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
}

function toSquare(row: number, col: number): string {
  return COL_LETTERS[col] + (8 - row)
}

export function moveToAlgebraic(move: Move): string {
  // Castling
  if (move.isCastling) {
    const base = move.castlingSide === 'queenside' ? 'O-O-O' : 'O-O'
    if (move.isCheckmate) return base + '#'
    if (move.isCheck) return base + '+'
    return base
  }

  let notation = ''

  // Piece prefix (pawns have no prefix)
  if (move.piece !== 'pawn') {
    notation += PIECE_PREFIX[move.piece] || ''
    // Disambiguation when multiple same-type pieces can reach the same square
    if (move.disambiguation) {
      notation += move.disambiguation
    }
  }

  // Pawn captures include source file
  if (move.piece === 'pawn' && move.isCapture) {
    notation += COL_LETTERS[move.from.col]
  }

  // Capture marker
  if (move.isCapture) {
    notation += 'x'
  }

  // Destination square
  notation += toSquare(move.to.row, move.to.col)

  // Promotion
  if (move.isPromotion && move.promotedTo) {
    notation += '=' + (PIECE_PREFIX[move.promotedTo] || '')
  }

  // Check / checkmate
  if (move.isCheckmate) {
    notation += '#'
  } else if (move.isCheck) {
    notation += '+'
  }

  return notation
}
