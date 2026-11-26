/**
 * Board Component
 *
 * The 8x8 board with rank and file labels. It owns two pieces of presentation
 * the game hook does not need to know about:
 * - the slide: when a new move arrives, the moved piece animates from its
 *   origin square (and the rook too, when castling);
 * - dragging: a piece can be picked up and dropped on a square, which reaches
 *   the game as the same two square activations a pair of clicks would.
 */

import React, { useCallback, useState } from 'react'
import type { Board as BoardType, Move, Position } from '@/types/chess.types'
import { BOARD_SIZE } from '@/types/chess.types'
import { Cell } from './Cell'
import { PieceArt } from './PieceArt'

const FILE_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANK_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const
/** Pointer travel, in pixels, before a press becomes a drag. */
const DRAG_THRESHOLD = 6

interface BoardProps {
  board: BoardType
  onSquareClick: (row: number, col: number) => void
  isHighlighted: (row: number, col: number) => boolean
  isPieceSelected: (row: number, col: number) => boolean
  disabled?: boolean
  lastMove?: Move
  /** Number of moves played; a rise means lastMove is new and should slide. */
  moveCount: number
  isInCheck?: boolean
  checkSquare?: Position | null
  /** Suggested move to mark on the board. */
  hint?: { from: Position; to: Position } | null
}

interface Drag {
  row: number
  col: number
  startX: number
  startY: number
  x: number
  y: number
  size: number
  active: boolean
}

function squareAt(x: number, y: number): Position | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-row][data-col]')
  if (!el) return null
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) }
}

function same(a: Position | undefined | null, row: number, col: number): boolean {
  return !!a && a.row === row && a.col === col
}

export const Board = React.memo(function Board({
  board,
  onSquareClick,
  isHighlighted,
  isPieceSelected,
  disabled = false,
  lastMove,
  moveCount,
  isInCheck = false,
  checkSquare,
  hint = null,
}: BoardProps) {
  const [drag, setDrag] = useState<Drag | null>(null)
  // The move a drag just delivered: the piece is already where it was dropped, so it must not slide.
  const [dropped, setDropped] = useState<{ from: Position; to: Position } | null>(null)

  // Decide once per new move whether it slides (React's derive-state-from-props pattern).
  const [seenCount, setSeenCount] = useState(moveCount)
  const [slideMove, setSlideMove] = useState<Move | null>(null)
  if (moveCount !== seenCount) {
    setSeenCount(moveCount)
    const isNew = moveCount > seenCount && !!lastMove
    const wasDropped =
      isNew && !!dropped && same(dropped.from, lastMove.from.row, lastMove.from.col) && same(dropped.to, lastMove.to.row, lastMove.to.col)
    setSlideMove(isNew && !wasDropped ? lastMove : null)
    setDropped(null)
  }

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
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
    e.currentTarget.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${nextCol}"]`)?.focus()
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]')
    if (!cell) return
    const row = Number(cell.dataset.row)
    const col = Number(cell.dataset.col)
    onSquareClick(row, col)
    if (board[row][col]) {
      e.currentTarget.setPointerCapture(e.pointerId)
      setDrag({
        row,
        col,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        size: cell.getBoundingClientRect().width,
        active: false,
      })
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const far = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD
    // Only a piece the game accepted as selected can be carried.
    const active = drag.active || (far && isPieceSelected(drag.row, drag.col))
    if (active) setDrag({ ...drag, x: e.clientX, y: e.clientY, active })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    setDrag(null)
    if (!drag.active) return
    const target = squareAt(e.clientX, e.clientY)
    if (!target || same(target, drag.row, drag.col)) return
    if (isHighlighted(target.row, target.col)) {
      setDropped({ from: { row: drag.row, col: drag.col }, to: target })
    }
    onSquareClick(target.row, target.col)
  }

  // The rook's hop when the last move castled.
  const rookSlide =
    slideMove?.isCastling && slideMove.castlingSide
      ? {
          row: slideMove.to.row,
          col: slideMove.castlingSide === 'kingside' ? 5 : 3,
          fromCol: slideMove.castlingSide === 'kingside' ? 7 : 0,
        }
      : null

  const carried = drag?.active ? board[drag.row][drag.col] : null

  return (
    <div className="arcade-board board-frame">
      <div className="board-layout">
        <div className="board-ranks" aria-hidden="true">
          {RANK_LABELS.map(label => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div
          className="board-grid"
          role="grid"
          aria-label="Chess game board"
          tabIndex={-1}
          onKeyDown={handleGridKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag(null)}
        >
          {board.map((row, rowIndex) => (
            <div key={rowIndex} role="row" className="contents">
              {row.map((cell, colIndex) => {
                let slide: { dx: number; dy: number } | null = null
                if (slideMove && same(slideMove.to, rowIndex, colIndex)) {
                  slide = { dx: slideMove.from.col - colIndex, dy: slideMove.from.row - rowIndex }
                } else if (rookSlide && rookSlide.row === rowIndex && rookSlide.col === colIndex) {
                  slide = { dx: rookSlide.fromCol - colIndex, dy: 0 }
                }
                return (
                  <Cell
                    key={`${rowIndex}-${colIndex}`}
                    row={rowIndex}
                    col={colIndex}
                    piece={cell}
                    onActivate={onSquareClick}
                    isHighlighted={!disabled && isHighlighted(rowIndex, colIndex)}
                    isSelected={!disabled && isPieceSelected(rowIndex, colIndex)}
                    isDark={(rowIndex + colIndex) % 2 === 1}
                    disabled={disabled}
                    slide={slide}
                    slideKey={moveCount}
                    isDragOrigin={!!drag?.active && drag.row === rowIndex && drag.col === colIndex}
                    isInCheck={isInCheck && same(checkSquare, rowIndex, colIndex)}
                    isLastMove={same(lastMove?.from, rowIndex, colIndex) || same(lastMove?.to, rowIndex, colIndex)}
                    isHint={!!hint && (same(hint.from, rowIndex, colIndex) || same(hint.to, rowIndex, colIndex))}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div className="board-files" aria-hidden="true">
          {FILE_LABELS.map(label => (
            <div key={label}>{label}</div>
          ))}
        </div>
      </div>

      {drag?.active && carried && (
        <div
          className="chess-drag-piece"
          style={{ width: drag.size, height: drag.size, left: drag.x - drag.size / 2, top: drag.y - drag.size / 2 }}
        >
          <PieceArt type={carried.type} player={carried.player} className="h-full w-full" />
        </div>
      )}
    </div>
  )
})
