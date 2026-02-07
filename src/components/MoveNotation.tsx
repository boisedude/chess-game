/**
 * Move Notation Component
 *
 * Compact scrollable panel showing paired algebraic notation moves.
 * Auto-scrolls to the latest move. Last move pair is highlighted.
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

  if (moveHistory.length === 0) {
    return (
      <div className="w-full max-w-md max-h-32 sm:max-h-40 overflow-y-auto rounded-lg bg-white px-3 py-1.5 shadow-lg font-mono text-xs sm:text-sm">
        <span className="text-gray-400 italic">Moves will appear here...</span>
      </div>
    )
  }

  // Pair moves: 1. e4 e5  2. Nf3 Nc6
  const pairs: { num: number; white: string; black?: string }[] = []
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moveToAlgebraic(moveHistory[i]),
      black: moveHistory[i + 1] ? moveToAlgebraic(moveHistory[i + 1]) : undefined,
    })
  }

  const lastPairIdx = pairs.length - 1

  return (
    <div
      ref={scrollRef}
      className="w-full max-w-md max-h-32 sm:max-h-40 overflow-y-auto rounded-lg bg-white px-3 py-1.5 shadow-lg font-mono text-xs sm:text-sm"
      role="log"
      aria-label="Move history"
    >
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {pairs.map((pair, idx) => (
          <span
            key={pair.num}
            className={idx === lastPairIdx ? 'bg-amber-50 rounded px-0.5' : ''}
          >
            <span className="text-gray-400">{pair.num}.</span>{' '}
            <span className="text-gray-800">{pair.white}</span>
            {pair.black && (
              <>
                {' '}
                <span className="text-gray-800">{pair.black}</span>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export const MoveNotation = React.memo(MoveNotationComponent)
