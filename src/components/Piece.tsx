/**
 * Chess Piece Component
 *
 * One piece of the arcade's SVG set. `slide` carries the offset (in squares)
 * the piece just travelled, and plays the slide animation from there.
 */

import React from 'react'
import type { Piece as PieceType } from '@/types/chess.types'
import { PieceArt } from './PieceArt'

interface PieceProps {
  piece: PieceType
  isSelected: boolean
  slide?: { dx: number; dy: number } | null
}

export const Piece = React.memo(function Piece({ piece, isSelected, slide = null }: PieceProps) {
  const label = `${piece.player === 1 ? 'White' : 'Black'} ${piece.type}${isSelected ? ', selected' : ''}`
  return (
    <div
      className={`chess-piece ${slide ? 'animate-piece-slide' : ''}`}
      style={
        slide
          ? ({ '--slide-from-x': `${slide.dx * 108.7}%`, '--slide-from-y': `${slide.dy * 108.7}%` } as React.CSSProperties)
          : undefined
      }
      role="img"
      aria-label={label}
    >
      <PieceArt type={piece.type} player={piece.player} className="h-full w-full" />
    </div>
  )
})
