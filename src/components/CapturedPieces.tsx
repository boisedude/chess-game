/**
 * Captured Pieces Display
 *
 * Shows captured pieces for each side derived from moveHistory,
 * sorted by value (Q, R, B, N, P), as a muted row under each side of the score strip.
 */

import React from 'react'
import type { Move, PieceType, Player } from '@/types/chess.types'
import { PieceArt } from './PieceArt'

interface CapturedPiecesProps {
  moveHistory: Move[]
  isPvP: boolean
  characterName: string
}

const PIECE_ORDER: PieceType[] = ['queen', 'rook', 'bishop', 'knight', 'pawn']

const MATERIAL_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
}

function sortByValue(pieces: PieceType[]): PieceType[] {
  return [...pieces].sort((a, b) => {
    const idxA = PIECE_ORDER.indexOf(a)
    const idxB = PIECE_ORDER.indexOf(b)
    return idxA - idxB
  })
}

function CapturedPiecesComponent({ moveHistory, isPvP, characterName }: CapturedPiecesProps) {
  // Pieces captured BY white (i.e., black pieces that were taken)
  const capturedByWhite: PieceType[] = []
  // Pieces captured BY black (i.e., white pieces that were taken)
  const capturedByBlack: PieceType[] = []

  for (const move of moveHistory) {
    if (move.captured) {
      if (move.player === 1) {
        capturedByWhite.push(move.captured)
      } else {
        capturedByBlack.push(move.captured)
      }
    }
  }

  const whiteMaterial = capturedByWhite.reduce((sum, p) => sum + MATERIAL_VALUES[p], 0)
  const blackMaterial = capturedByBlack.reduce((sum, p) => sum + MATERIAL_VALUES[p], 0)
  const advantage = whiteMaterial - blackMaterial

  const sortedByWhite = sortByValue(capturedByWhite)
  const sortedByBlack = sortByValue(capturedByBlack)

  const strip = (pieces: PieceType[], player: Player, lead: number) => (
    <div className="flex min-h-6 items-center">
      {pieces.map((piece, i) => (
        <PieceArt key={i} type={piece} player={player} className="-mr-1.5 h-6 w-6" />
      ))}
      {lead > 0 && pieces.length > 0 && (
        <span className="ml-3 text-xs font-semibold">+{lead}</span>
      )}
    </div>
  )

  return (
    <div
      className="arcade-score -mt-2 text-muted-foreground/80"
      aria-label={isPvP ? 'Captured pieces' : `Pieces captured by you and ${characterName}`}
    >
      {strip(sortedByWhite, 2, advantage)}
      <div />
      <div className="flex justify-end">{strip(sortedByBlack, 1, -advantage)}</div>
    </div>
  )
}

export const CapturedPieces = React.memo(CapturedPiecesComponent)
