/**
 * Victory Dialog Component
 *
 * Displays game result (checkmate/stalemate/draw) with character-specific messages,
 * styled gradient king circles, and captured piece summary.
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
import type { Player, GameMode, DrawReason, Move, PieceType } from '@/types/chess.types'
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

const PVP_DRAW_MESSAGES = [
  'A perfectly balanced game! Neither side can break through.',
  'The game ends in a draw. A rematch is in order!',
  'Stalemate! Both players showed incredible defense.',
]

const PVP_WIN_MESSAGES: Record<string, string[]> = {
  white: [
    'White delivers checkmate!',
    'A brilliant victory for White!',
    'White outplayed Black masterfully!',
  ],
  black: [
    'Black delivers checkmate!',
    'A brilliant victory for Black!',
    'Black outplayed White masterfully!',
  ],
}

const DRAW_REASON_TEXT: Record<DrawReason, string> = {
  stalemate: 'Stalemate',
  fifty_move: '50-Move Rule',
  threefold_repetition: 'Threefold Repetition',
  insufficient_material: 'Insufficient Material',
  agreement: 'By Agreement',
}

const MATERIAL_VALUES: Record<PieceType, number> = {
  pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0,
}

const PIECE_ORDER: PieceType[] = ['queen', 'rook', 'bishop', 'knight', 'pawn']

const CAPTURED_SYMBOLS: Record<Player, Record<PieceType, string>> = {
  1: { king: '\u2654', queen: '\u2655', rook: '\u2656', bishop: '\u2657', knight: '\u2658', pawn: '\u2659' },
  2: { king: '\u265A', queen: '\u265B', rook: '\u265C', bishop: '\u265D', knight: '\u265E', pawn: '\u265F' },
}

function getCapturedPieces(moveHistory: Move[]) {
  const byWhite: PieceType[] = []
  const byBlack: PieceType[] = []
  for (const move of moveHistory) {
    if (move.captured) {
      if (move.player === 1) byWhite.push(move.captured)
      else byBlack.push(move.captured)
    }
  }
  const sort = (arr: PieceType[]) => [...arr].sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b))
  const whitePoints = byWhite.reduce((s, p) => s + MATERIAL_VALUES[p], 0)
  const blackPoints = byBlack.reduce((s, p) => s + MATERIAL_VALUES[p], 0)
  return {
    capturedByWhite: sort(byWhite),
    capturedByBlack: sort(byBlack),
    advantage: whitePoints - blackPoints,
  }
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
  const [victoryMessage, setVictoryMessage] = useState('')
  const isPvP = gameMode === 'pvp'

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = character.avatar
  }

  useEffect(() => {
    if (open) {
      let message: string
      if (isPvP) {
        if (isDraw) {
          message = PVP_DRAW_MESSAGES[Math.floor(Math.random() * PVP_DRAW_MESSAGES.length)]
        } else {
          const colorKey = winner === 1 ? 'white' : 'black'
          const msgs = PVP_WIN_MESSAGES[colorKey]
          message = msgs[Math.floor(Math.random() * msgs.length)]
        }
      } else {
        if (isDraw) {
          const drawMessages = [
            `A draw! ${character.name} is impressed with your defensive skills!`,
            `Neither side could break through. ${character.name} wants a rematch!`,
            'A perfectly played game by both sides. Rematch?',
          ]
          message = drawMessages[Math.floor(Math.random() * drawMessages.length)]
        } else if (winner === 1) {
          const messages = character.catchphrases.playerWins
          message = messages[Math.floor(Math.random() * messages.length)]
        } else {
          const messages = character.catchphrases.characterWins
          message = messages[Math.floor(Math.random() * messages.length)]
        }
      }
      const timer = setTimeout(() => setVictoryMessage(message), 0)
      return () => clearTimeout(timer)
    }
  }, [open, isDraw, winner, character, isPvP])

  const titleText = isDraw
    ? drawReason ? `Draw - ${DRAW_REASON_TEXT[drawReason]}` : 'Draw!'
    : isPvP
      ? winner === 1 ? 'White Wins!' : 'Black Wins!'
      : winner === 1
        ? `Checkmate! You Beat ${character.name}!`
        : `${character.name} Wins by Checkmate!`

  const { capturedByWhite, capturedByBlack, advantage } = getCapturedPieces(moveHistory)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {titleText}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {victoryMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {!isPvP && (
            <div className="flex items-center justify-center py-2">
              {winner === 1 ? (
                <img src={character.loseImage} alt={`${character.name} loses`} className="max-h-40 w-auto object-contain" onError={handleImageError} />
              ) : winner === 2 ? (
                <img src={character.winImage} alt={`${character.name} wins`} className="max-h-40 w-auto object-contain" onError={handleImageError} />
              ) : (
                <img src={character.playAgainImage} alt={character.name} className="max-h-40 w-auto object-contain" onError={handleImageError} />
              )}
            </div>
          )}

          {/* Styled king circles */}
          <div className="flex items-center justify-center gap-6 py-4">
            {winner === 1 ? (
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-100 to-white ring-4 ring-yellow-400 animate-pulse motion-reduce:animate-none flex items-center justify-center shadow-lg">
                  <span className="text-5xl">&#9812;</span>
                </div>
                <span className="absolute -top-3 -right-2 text-3xl">&#128081;</span>
              </div>
            ) : winner === 2 ? (
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 ring-4 ring-yellow-400 animate-pulse motion-reduce:animate-none flex items-center justify-center shadow-lg">
                  <span className="text-5xl">&#9818;</span>
                </div>
                <span className="absolute -top-3 -right-2 text-3xl">&#128081;</span>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-100 to-white ring-2 ring-gray-300 flex items-center justify-center shadow-md">
                  <span className="text-3xl">&#9812;</span>
                </div>
                <span className="text-4xl">&#129309;</span>
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 ring-2 ring-gray-300 flex items-center justify-center shadow-md">
                  <span className="text-3xl">&#9818;</span>
                </div>
              </div>
            )}
          </div>

          {/* Score rows with mini gradient circles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gray-100 to-white ring-1 ring-gray-300 flex items-center justify-center">
                  <span className="text-xs">&#9812;</span>
                </div>
                <span className="font-medium">{isPvP ? 'White' : 'You (White)'}</span>
              </div>
              <div className="flex items-center gap-2">
                {capturedByWhite.length > 0 && (
                  <span className="text-sm opacity-70">
                    {capturedByWhite.map((p, i) => <span key={i}>{CAPTURED_SYMBOLS[2][p]}</span>)}
                    {advantage > 0 && <span className="text-xs font-semibold ml-1">+{advantage}</span>}
                  </span>
                )}
                <span className={`text-xl font-bold ${winner === 1 ? 'text-green-600' : ''}`}>
                  {whiteCount}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 ring-1 ring-gray-300 flex items-center justify-center">
                  <span className="text-xs text-white">&#9818;</span>
                </div>
                <span className="font-medium">{isPvP ? 'Black' : `${character.name} (Black)`}</span>
              </div>
              <div className="flex items-center gap-2">
                {capturedByBlack.length > 0 && (
                  <span className="text-sm opacity-70">
                    {capturedByBlack.map((p, i) => <span key={i}>{CAPTURED_SYMBOLS[1][p]}</span>)}
                    {advantage < 0 && <span className="text-xs font-semibold ml-1">+{-advantage}</span>}
                  </span>
                )}
                <span className={`text-xl font-bold ${winner === 2 ? 'text-green-600' : ''}`}>
                  {blackCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={onPlayAgain} className="w-full sm:w-auto">Play Again</Button>
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const VictoryDialog = React.memo(VictoryDialogComponent)
