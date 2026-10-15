/**
 * Captured Pieces Display
 *
 * Shows captured pieces for each side derived from moveHistory,
 * sorted by value (Q, R, B, N, P), as a muted row under each side of the score strip.
 */

import React from 'react'
import type { Move, PieceType } from '@/types/chess.types'

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

const WHITE_SYMBOLS: Record<PieceType, string> = {
  king: '\u2654',
  queen: '\u2655',
  rook: '\u2656',
  bishop: '\u2657',
  knight: '\u2658',
  pawn: '\u2659',
}

const BLACK_SYMBOLS: Record<PieceType, string> = {
  king: '\u265A',
  queen: '\u265B',
  rook: '\u265C',
  bishop: '\u265D',
  knight: '\u265E',
  pawn: '\u265F',
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

  const strip = (pieces: PieceType[], symbols: Record<PieceType, string>, lead: number) => (
    <div className="flex min-h-6 flex-wrap items-center gap-x-px text-lg leading-none">
      {pieces.map((piece, i) => (
        <span key={i}>{symbols[piece]}{piece === 'pawn' ? '\uFE0E' : ''}</span>
      ))}
      {lead > 0 && pieces.length > 0 && (
        <span className="ml-1.5 text-xs font-semibold">+{lead}</span>
      )}
    </div>
  )

  return (
    <div
      className="arcade-score -mt-2 text-muted-foreground/80"
      aria-label={isPvP ? 'Captured pieces' : `Pieces captured by you and ${characterName}`}
    >
      {strip(sortedByWhite, BLACK_SYMBOLS, advantage)}
      <div />
      <div className="flex justify-end">{strip(sortedByBlack, WHITE_SYMBOLS, -advantage)}</div>
    </div>
  )
}

export const CapturedPieces = React.memo(CapturedPiecesComponent)
