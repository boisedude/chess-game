/**
 * Cell Component
 *
 * Single board square. Pieces occupy all 64 squares (unlike checkers).
 * Light/dark colors use classic chess cream/green palette.
 */

import React from 'react'
import type { CellValue } from '@/types/chess.types'
import { Piece } from './Piece'

interface CellProps {
  row: number
  col: number
  piece: CellValue
  onClick: (row: number, col: number) => void
  isHighlighted: boolean
  isSelected: boolean
  isDark: boolean
  disabled?: boolean
  isAnimating?: boolean
  slideFromX?: number
  slideFromY?: number
  isBeingCaptured?: boolean
  isBeingPromoted?: boolean
  isInCheck?: boolean
  lastMoveFrom?: boolean
  lastMoveTo?: boolean
}

export const Cell = React.memo(function Cell({
  row,
  col,
  piece,
  onClick,
  isHighlighted,
  isSelected,
  isDark,
  disabled = false,
  isAnimating = false,
  slideFromX = 0,
  slideFromY = 0,
  isBeingCaptured = false,
  isBeingPromoted = false,
  isInCheck = false,
  lastMoveFrom = false,
  lastMoveTo = false,
}: CellProps) {
  const handleClick = () => {
    if (!disabled) onClick(row, col)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(row, col)
    }
  }

  const baseClasses = `aspect-square flex items-center justify-center transition-all duration-200 relative touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset`

  const squareClasses = isDark ? 'chess-square-dark' : 'chess-square-light'

  const stateClasses = isHighlighted
    ? 'cell-highlighted'
    : isSelected
      ? 'cell-selected'
      : ''

  const checkClasses = isInCheck ? 'king-in-check' : ''

  const lastMoveClasses =
    (lastMoveFrom || lastMoveTo) && !isSelected && !isHighlighted
      ? 'ring-2 ring-inset ring-primary/50'
      : ''

  const cursorClasses = disabled
    ? 'pointer-events-none'
    : piece !== null || isHighlighted
      ? 'cursor-pointer hover:brightness-110 active:brightness-95'
      : ''

  const columnLetter = String.fromCharCode(97 + col)
  const rowNumber = 8 - row
  const cellPosition = `${columnLetter}${rowNumber}`
  const pieceDescription = piece
    ? `${piece.player === 1 ? 'White' : 'Black'} ${piece.type}`
    : ''
  const cellDescription = piece
    ? `${cellPosition}: ${pieceDescription}${isSelected ? ', selected' : ''}`
    : isHighlighted
      ? `${cellPosition}: valid move destination`
      : `${cellPosition}: empty`

  return (
    <div
      className={`${baseClasses} ${squareClasses} ${stateClasses} ${checkClasses} ${lastMoveClasses} ${cursorClasses}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-row={row}
      data-col={col}
      role="gridcell"
      aria-label={cellDescription}
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={!disabled && (row === 7 && col === 4) ? 0 : -1}
    >
      {isHighlighted && !piece && (
        <div className="valid-move-indicator" />
      )}

      {isHighlighted && piece && (
        <div className="absolute inset-0 border-4 border-primary/70 rounded-sm pointer-events-none" />
      )}

      {piece && (
        <div
          className="w-[90%] h-[90%] relative z-10"
          style={
            isAnimating
              ? ({
                  '--slide-from-x': `${slideFromX}%`,
                  '--slide-from-y': `${slideFromY}%`,
                } as React.CSSProperties)
              : undefined
          }
        >
          <Piece
            piece={piece}
            isSelected={isSelected}
            isAnimating={isAnimating}
            isBeingCaptured={isBeingCaptured}
            isBeingPromoted={isBeingPromoted}
          />
        </div>
      )}
    </div>
  )
})
