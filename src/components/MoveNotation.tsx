/**
 * Move Notation Component
 *
 * A single muted line of paired algebraic moves under the board.
 * Scrolls to the latest move when it grows past two lines.
 */

import React, { useRef, useEffect } from 'react'
import type { Move } from '@/types/chess.types'
import { moveToAlgebraic } from '@/lib/moveNotation'

interface MoveNotationProps {
  moveHistory: Move[]
}

function MoveNotationComponent({ moveHistory }: MoveNotationProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [moveHistory.length])

  if (moveHistory.length === 0) return null

  // Pair moves: 1. e4 e5  2. Nf3 Nc6
  const pairs: { num: number; white: string; black?: string }[] = []
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moveToAlgebraic(moveHistory[i]),
      black: moveHistory[i + 1] ? moveToAlgebraic(moveHistory[i + 1]) : undefined,
    })
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-10 w-full max-w-[min(640px,calc(100dvw-2rem))] overflow-y-auto font-mono text-xs leading-5 text-muted-foreground"
      role="log"
      aria-label="Move history"
    >
      {pairs.map((pair) => (
        <span key={pair.num} className="mr-3 inline-block whitespace-nowrap">
          {pair.num}. {pair.white}
          {pair.black ? ` ${pair.black}` : ''}
        </span>
      ))}
    </div>
  )
}

export const MoveNotation = React.memo(MoveNotationComponent)
