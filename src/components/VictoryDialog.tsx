/**
 * Victory Dialog Component
 *
 * Game over: the character's win or lose art, a one-line result, one
 * catchphrase in the muted colour, and a single stats line.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import type { Player, GameMode, DrawReason, Move } from '@/types/chess.types'
import type { Character } from '@shared/characters'

interface VictoryDialogProps {
  open: boolean
  winner: Player | null
  whiteCount: number
  blackCount: number
  onPlayAgain: () => void
  onClose: () => void
  character: Character
  gameMode?: GameMode
  drawReason?: DrawReason
  moveHistory?: Move[]
}

const DRAW_LINES = [
  'Neither side could break through.',
  'Dead even. One more?',
  'A tie. Nobody gets the last word.',
]

const DRAW_REASON_TEXT: Record<DrawReason, string> = {
  stalemate: 'stalemate',
  fifty_move: '50-move rule',
  threefold_repetition: 'threefold repetition',
  insufficient_material: 'insufficient material',
  agreement: 'by agreement',
}

function VictoryDialogComponent({
  open,
  winner,
  whiteCount,
  blackCount,
  onPlayAgain,
  onClose,
  character,
  gameMode = 'pvc',
  drawReason,
  moveHistory = [],
}: VictoryDialogProps) {
  const isDraw = winner === null
  const isPvP = gameMode === 'pvp'
  const [catchphrase, setCatchphrase] = useState('')

  // Math.random() runs in an effect, not during render, to keep render pure
  useEffect(() => {
    if (!open) return
    if (isPvP && !isDraw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCatchphrase('')
      return
    }
    const lines = isDraw
      ? DRAW_LINES
      : winner === 1
        ? character.catchphrases.playerWins
        : character.catchphrases.characterWins
    setCatchphrase(lines[Math.floor(Math.random() * lines.length)])
  }, [open, isDraw, winner, character, isPvP])

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = character.avatar
  }

  const art = winner === 1 ? character.loseImage : winner === 2 ? character.winImage : character.playAgainImage

  const titleText = isDraw
    ? drawReason ? `Draw: ${DRAW_REASON_TEXT[drawReason]}` : 'Draw'
    : isPvP
      ? winner === 1 ? 'White won' : 'Black won'
      : winner === 1
        ? `You beat ${character.name}`
        : `${character.name} won`

  const moves = moveHistory.length
  const statsLine = `${isPvP ? 'White' : 'You'} ${whiteCount} ${whiteCount === 1 ? 'piece' : 'pieces'}, ${
    isPvP ? 'Black' : character.name
  } ${blackCount}, ${moves} ${moves === 1 ? 'move' : 'moves'}`

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm" hideClose>
        <DialogHeader className="items-center text-center sm:text-center">
          {!isPvP && (
            <img
              src={art}
              alt={character.name}
              className="mb-2 max-h-44 w-auto object-contain"
              onError={handleImageError}
            />
          )}
          <DialogTitle className="text-xl">{titleText}</DialogTitle>
          <DialogDescription>{catchphrase}</DialogDescription>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground">{statsLine}</p>

        <DialogFooter className="gap-2 sm:justify-center sm:space-x-0">
          <Button onClick={onPlayAgain} className="h-11">
            Play again
          </Button>
          <Button onClick={onClose} variant="ghost" className="h-11">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const VictoryDialog = React.memo(VictoryDialogComponent)
