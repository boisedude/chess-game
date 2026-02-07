/**
 * Captured Pieces Display
 *
 * Shows captured pieces for each side derived from moveHistory,
 * sorted by value (Q, R, B, N, P). Includes a material advantage bar.
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

  const whiteLabel = isPvP ? 'White captured' : 'You captured'
  const blackLabel = isPvP ? 'Black captured' : `${characterName} captured`

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-2 sm:p-3 shadow-lg">
      {/* Material advantage bar */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] sm:text-xs text-gray-500 w-6 text-right">
          {advantage > 0 ? `+${advantage}` : ''}
        </span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, 50 + advantage * 3))}%`,
              background: advantage >= 0
                ? 'linear-gradient(to right, #d1d5db, #f5f5f4)'
                : 'linear-gradient(to right, #374151, #6b7280)',
            }}
          />
        </div>
        <span className="text-[10px] sm:text-xs text-gray-500 w-6">
          {advantage < 0 ? `+${-advantage}` : ''}
        </span>
      </div>

      {/* Captured pieces rows */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 min-h-[24px]">
          <span className="text-[10px] sm:text-xs text-gray-400 w-20 sm:w-24 truncate">{whiteLabel}</span>
          <div className="flex flex-wrap gap-0 text-base sm:text-lg opacity-80">
            {sortedByWhite.map((piece, i) => (
              <span key={i} className="leading-none">{BLACK_SYMBOLS[piece]}</span>
            ))}
          </div>
          {advantage > 0 && sortedByWhite.length > 0 && (
            <span className="text-[10px] sm:text-xs font-semibold text-gray-600 ml-1">+{advantage}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 min-h-[24px]">
          <span className="text-[10px] sm:text-xs text-gray-400 w-20 sm:w-24 truncate">{blackLabel}</span>
          <div className="flex flex-wrap gap-0 text-base sm:text-lg opacity-80">
            {sortedByBlack.map((piece, i) => (
              <span key={i} className="leading-none">{WHITE_SYMBOLS[piece]}</span>
            ))}
          </div>
          {advantage < 0 && sortedByBlack.length > 0 && (
            <span className="text-[10px] sm:text-xs font-semibold text-gray-600 ml-1">+{-advantage}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export const CapturedPieces = React.memo(CapturedPiecesComponent)
