/**
 * Cell Component
 *
 * Single board square. Pointer input is handled by the board (so a piece can
 * be dragged across squares); the cell handles the keyboard.
 */

import React from 'react'
import type { CellValue } from '@/types/chess.types'
import { Piece } from './Piece'

interface CellProps {
  row: number
  col: number
  piece: CellValue
  onActivate: (row: number, col: number) => void
  isHighlighted: boolean
  isSelected: boolean
  isDark: boolean
  disabled?: boolean
  slide?: { dx: number; dy: number } | null
  /** Changes with every move, so a sliding piece remounts and its animation restarts. */
  slideKey?: number
  isDragOrigin?: boolean
  isInCheck?: boolean
  isLastMove?: boolean
  isHint?: boolean
}

export const Cell = React.memo(function Cell({
  row,
  col,
  piece,
  onActivate,
  isHighlighted,
  isSelected,
  isDark,
  disabled = false,
  slide = null,
  slideKey = 0,
  isDragOrigin = false,
  isInCheck = false,
  isLastMove = false,
  isHint = false,
}: CellProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate(row, col)
    }
  }

  const classes = [
    'chess-cell',
    isDark ? 'chess-square-dark' : 'chess-square-light',
    isLastMove ? 'cell-last-move' : '',
    isSelected ? 'cell-selected' : '',
    isInCheck ? 'king-in-check' : '',
    isHint ? 'arcade-hint' : '',
    !disabled && (piece !== null || isHighlighted) ? 'cursor-pointer' : '',
  ].join(' ')

  const cellPosition = `${String.fromCharCode(97 + col)}${8 - row}`
  const pieceDescription = piece ? `${piece.player === 1 ? 'White' : 'Black'} ${piece.type}` : ''
  let cellDescription = piece
    ? `${cellPosition}: ${pieceDescription}${isSelected ? ', selected' : ''}`
    : isHighlighted
      ? `${cellPosition}: valid move destination`
      : `${cellPosition}: empty`
  if (isHint) cellDescription += ', hint'

  return (
    <div
      className={classes}
      onKeyDown={handleKeyDown}
      data-row={row}
      data-col={col}
      role="gridcell"
      aria-label={cellDescription}
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={!disabled && row === 7 && col === 4 ? 0 : -1}
    >
      {isHighlighted && <div className={piece ? 'capture-indicator' : 'valid-move-indicator'} />}

      {piece && (
        <div key={slide ? slideKey : 'still'} className={`chess-piece-slot ${isDragOrigin ? 'opacity-30' : ''}`}>
          <Piece piece={piece} isSelected={isSelected} slide={slide} />
        </div>
      )}
    </div>
  )
})
