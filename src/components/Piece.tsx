/**
 * Chess Piece Component
 *
 * Renders a chess piece using Unicode symbols. CSS classes for white/black styling.
 * Animation classes for slide, capture, and promotion.
 */

import React from 'react'
import type { Piece as PieceType } from '@/types/chess.types'
import { PIECE_SYMBOLS } from '@/types/chess.types'
import { cn } from '@/lib/utils'

interface PieceProps {
  piece: PieceType
  isSelected: boolean
  isAnimating?: boolean
  isBeingCaptured?: boolean
  isBeingPromoted?: boolean
}

export const Piece = React.memo(function Piece({
  piece,
  isSelected,
  isAnimating = false,
  isBeingCaptured = false,
  isBeingPromoted = false,
}: PieceProps) {
  const isWhite = piece.player === 1
  const symbol = PIECE_SYMBOLS[piece.player][piece.type]

  const animationClass = isBeingCaptured
    ? 'animate-piece-capture'
    : isBeingPromoted
      ? 'animate-piece-promotion'
      : isAnimating
        ? 'animate-piece-slide'
        : ''

  const pieceLabel = `${isWhite ? 'White' : 'Black'} ${piece.type}${isSelected ? ', selected' : ''}`

  const canHover = !isAnimating && !isBeingCaptured && !isBeingPromoted

  return (
    <div
      className={cn(
        'w-full h-full flex items-center justify-center cursor-pointer relative transition-transform duration-200 select-none',
        canHover && 'hover:scale-105',
        animationClass,
      )}
      style={canHover ? { transition: 'transform 0.2s ease, filter 0.2s ease' } : undefined}
      role="img"
      aria-label={pieceLabel}
    >
      <span
        className={cn(
          'text-4xl sm:text-5xl leading-none transition-[filter] duration-200',
          isWhite ? 'chess-piece-white' : 'chess-piece-black',
          canHover && 'hover:drop-shadow-lg',
        )}
        style={{ fontFamily: '"Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Color Emoji", sans-serif' }}
      >
        {symbol}
      </span>
    </div>
  )
})
