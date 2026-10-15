/**
 * Promotion Dialog Component
 *
 * Four piece choices as a plain row. Cannot be dismissed: a piece must be chosen.
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import type { Player, PromotionPiece } from '@/types/chess.types'
import { PIECE_SYMBOLS } from '@/types/chess.types'

interface PromotionDialogProps {
  open: boolean
  player: Player
  onSelect: (piece: PromotionPiece) => void
}

const PROMOTION_OPTIONS: { type: PromotionPiece; label: string; points: number }[] = [
  { type: 'queen', label: 'Queen', points: 9 },
  { type: 'rook', label: 'Rook', points: 5 },
  { type: 'bishop', label: 'Bishop', points: 3 },
  { type: 'knight', label: 'Knight', points: 3 },
]

export const PromotionDialog = React.memo(function PromotionDialog({
  open,
  player,
  onSelect,
}: PromotionDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-sm"
        hideClose
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Promote your pawn</DialogTitle>
          <DialogDescription>Choose the piece it becomes.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {PROMOTION_OPTIONS.map(({ type, label, points }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex min-h-11 flex-col items-center gap-0.5 rounded-md border border-border p-2 transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Promote to ${label} (${points} points)`}
            >
              <span className="text-4xl leading-none" style={{ fontFamily: '"Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif' }}>
                {PIECE_SYMBOLS[player][type]}
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
})
