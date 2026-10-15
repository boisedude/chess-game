/**
 * Board Component
 *
 * Renders the 8x8 chess board with rank labels (1-8) and file labels (a-h).
 * Classic chess board styling with cream/green squares.
 */

import React, { useCallback } from 'react'
import type { Board as BoardType, Move, Position } from '@/types/chess.types'
import { BOARD_SIZE } from '@/types/chess.types'
import { Cell } from './Cell'

const FILE_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANK_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

interface BoardProps {
  board: BoardType
  onSquareClick: (row: number, col: number) => void
  isHighlighted: (row: number, col: number) => boolean
  isPieceSelected: (row: number, col: number) => boolean
  disabled?: boolean
  lastMove?: Move
  animatingPiece?: {
    from: Position
    to: Position
  } | null
  capturedPiece?: Position | null
  promotedPiece?: Position | null
  isInCheck?: boolean
  checkSquare?: Position | null
}

export const Board = React.memo(function Board({
  board,
  onSquareClick,
  isHighlighted,
  isPieceSelected,
  disabled = false,
  lastMove,
  animatingPiece,
  capturedPiece,
  promotedPiece,
  isInCheck = false,
  checkSquare,
}: BoardProps) {
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const arrowKeys: Record<string, { dRow: number; dCol: number }> = {
        ArrowUp: { dRow: -1, dCol: 0 },
        ArrowDown: { dRow: 1, dCol: 0 },
        ArrowLeft: { dRow: 0, dCol: -1 },
        ArrowRight: { dRow: 0, dCol: 1 },
      }
      const direction = arrowKeys[e.key]
      if (!direction) return

      const active = document.activeElement as HTMLElement | null
      if (!active) return

      const currentRow = Number(active.getAttribute('data-row'))
      const currentCol = Number(active.getAttribute('data-col'))
      if (isNaN(currentRow) || isNaN(currentCol)) return

      const nextRow = currentRow + direction.dRow
      const nextCol = currentCol + direction.dCol
      if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) return

      e.preventDefault()
      const target = e.currentTarget.querySelector<HTMLElement>(
        `[data-row="${nextRow}"][data-col="${nextCol}"]`
      )
      target?.focus()
    },
    []
  )

  return (
    <div className="arcade-board board-frame">
      <div className="contents">
        <div className="flex">
          {/* Rank labels (left side) */}
          <div className="flex flex-col justify-around pr-1 sm:pr-2">
            {RANK_LABELS.map(label => (
              <div key={label} className="text-xs sm:text-sm font-semibold text-[#d9c3a0] flex items-center justify-center h-full">
                {label}
              </div>
            ))}
          </div>

          {/* Board grid */}
          <div className="flex-1">
            <div className="board-inner">
              <div
                className="grid grid-cols-8 gap-0 aspect-square"
                role="grid"
                aria-label="Chess game board"
                onKeyDown={handleGridKeyDown}
              >
                {board.map((row, rowIndex) => (
                  <div key={rowIndex} role="row" className="contents">
                  {row.map((cell, colIndex) => {
                    const isDark = (rowIndex + colIndex) % 2 === 1

                    const isAnimatingTo =
                      animatingPiece &&
                      animatingPiece.to.row === rowIndex &&
                      animatingPiece.to.col === colIndex

                    const isBeingCaptured =
                      capturedPiece &&
                      capturedPiece.row === rowIndex &&
                      capturedPiece.col === colIndex

                    const isBeingPromoted =
                      promotedPiece &&
                      promotedPiece.row === rowIndex &&
                      promotedPiece.col === colIndex

                    const isCellInCheck =
                      isInCheck &&
                      checkSquare &&
                      checkSquare.row === rowIndex &&
                      checkSquare.col === colIndex

                    let slideFromX = 0
                    let slideFromY = 0
                    if (isAnimatingTo && animatingPiece) {
                      const cellSize = 100 / 8
                      slideFromX = (animatingPiece.from.col - animatingPiece.to.col) * cellSize
                      slideFromY = (animatingPiece.from.row - animatingPiece.to.row) * cellSize
                    }

                    return (
                      <Cell
                        key={`${rowIndex}-${colIndex}`}
                        row={rowIndex}
                        col={colIndex}
                        piece={cell}
                        onClick={onSquareClick}
                        isHighlighted={!disabled && isHighlighted(rowIndex, colIndex)}
                        isSelected={!disabled && isPieceSelected(rowIndex, colIndex)}
                        isDark={isDark}
                        disabled={disabled}
                        isAnimating={isAnimatingTo || false}
                        slideFromX={slideFromX}
                        slideFromY={slideFromY}
                        isBeingCaptured={isBeingCaptured || false}
                        isBeingPromoted={isBeingPromoted || false}
                        isInCheck={isCellInCheck || false}
                        lastMoveFrom={
                          lastMove?.from.row === rowIndex && lastMove?.from.col === colIndex
                        }
                        lastMoveTo={
                          lastMove?.to.row === rowIndex && lastMove?.to.col === colIndex
                        }
                      />
                    )
                  })}
                  </div>
                ))}
              </div>
            </div>

            {/* File labels (bottom) */}
            <div className="grid grid-cols-8 gap-0 mt-1 sm:mt-2 text-center text-xs sm:text-sm text-[#d9c3a0] font-semibold">
              {FILE_LABELS.map(label => (
                <div key={label}>{label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
