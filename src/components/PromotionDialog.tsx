/**
 * Promotion Dialog Component
 *
 * 4-button grid showing queen/rook/bishop/knight Unicode symbols.
 * Cannot be dismissed - must choose a piece.
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

const PROMOTION_OPTIONS: { type: PromotionPiece; label: string }[] = [
  { type: 'queen', label: 'Queen' },
  { type: 'rook', label: 'Rook' },
  { type: 'bishop', label: 'Bishop' },
  { type: 'knight', label: 'Knight' },
]

export const PromotionDialog = React.memo(function PromotionDialog({
  open,
  player,
  onSelect,
}: PromotionDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-xs" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">Promote Pawn</DialogTitle>
          <DialogDescription className="text-center">
            Choose a piece for your promoted pawn
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 py-4">
          {PROMOTION_OPTIONS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center gap-1 rounded-lg border-2 border-transparent p-3 transition-all hover:border-amber-500 hover:bg-amber-500/10 focus:border-amber-500 focus:outline-none"
              aria-label={`Promote to ${label}`}
            >
              <span className="text-4xl sm:text-5xl">
                {PIECE_SYMBOLS[player][type]}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {label}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
})
