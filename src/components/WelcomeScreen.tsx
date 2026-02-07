/**
 * Welcome Screen Component
 *
 * Initial setup screen. PvC mode shows character cards for opponent selection.
 * PvP mode shows a simple description. Supports resuming saved games.
 */

import React from 'react'
import { Button } from './ui/button'
import type { Difficulty, GameMode } from '@/types/chess.types'
import { getAllCharacters } from '@shared/characters'

interface WelcomeScreenProps {
  mode: GameMode
  difficulty: Difficulty
  onModeChange: (mode: GameMode) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onStartGame: () => void
  hasSavedGame?: boolean
  onResumeGame?: () => void
}

const characters = getAllCharacters()

function MiniChessboard() {
  const size = 4
  return (
    <div className="grid grid-cols-4 gap-0 w-20 h-20 rounded-lg overflow-hidden shadow-md border border-green-900/30" aria-hidden="true">
      {Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size)
        const col = i % size
        const isDark = (row + col) % 2 === 1
        return (
          <div
            key={i}
            className={isDark ? 'chess-square-dark' : 'chess-square-light'}
          />
        )
      })}
    </div>
  )
}

export const WelcomeScreen = React.memo(function WelcomeScreen({
  mode,
  difficulty,
  onModeChange,
  onDifficultyChange,
  onStartGame,
  hasSavedGame: hasSaved = false,
  onResumeGame,
}: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg px-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <MiniChessboard />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Chess</h1>
            <p className="text-sm text-gray-500">at Coop's Arcade</p>
          </div>
          <MiniChessboard />
        </div>
      </div>

      <div className="flex rounded-lg bg-gray-100 p-1 w-full max-w-xs" role="tablist" aria-label="Game mode">
        <button
          role="tab"
          aria-selected={mode === 'pvc'}
          className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            mode === 'pvc'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => onModeChange('pvc')}
        >
          vs AI
        </button>
        <button
          role="tab"
          aria-selected={mode === 'pvp'}
          className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            mode === 'pvp'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => onModeChange('pvp')}
        >
          vs Player
        </button>
      </div>

      {mode === 'pvc' && (
        <div className="flex flex-col gap-3 w-full">
          <h2 className="text-sm font-semibold text-gray-600 text-center">Choose Your Opponent</h2>
          <div className="grid gap-3">
            {characters.map((char) => {
              const isSelected = char.difficulty === difficulty
              return (
                <button
                  key={char.id}
                  className={`flex items-center gap-3 rounded-xl p-3 sm:p-4 text-left transition-all border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'shadow-lg scale-[1.02] ring-2 ring-offset-2'
                      : 'border-transparent bg-white shadow-sm hover:shadow-md hover:scale-[1.01]'
                  }`}
                  style={isSelected ? {
                    borderColor: char.color,
                    backgroundColor: `${char.color}10`,
                    '--tw-ring-color': char.color,
                  } as React.CSSProperties : undefined}
                  aria-pressed={isSelected}
                  onClick={() => onDifficultyChange(char.difficulty as Difficulty)}
                >
                  <img
                    src={char.avatar}
                    alt={`${char.name} avatar`}
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 shrink-0"
                    style={{ borderColor: char.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{char.name}</span>
                      <span>{char.emoji}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {char.difficulty}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{char.playingStyle}</p>
                  </div>
                  {isSelected && (
                    <div
                      className="ml-auto shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: char.color }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'pvp' && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm w-full text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <span className="text-4xl">♔</span>
            <span className="text-lg font-bold text-gray-400">vs</span>
            <span className="text-4xl">♚</span>
          </div>
          <p className="text-sm text-gray-600">Play against a friend on the same device. White goes first!</p>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button
          onClick={onStartGame}
          className="w-full h-12 text-lg font-bold shadow-lg"
          size="lg"
        >
          Start Game
        </Button>
        {hasSaved && onResumeGame && (
          <Button
            onClick={onResumeGame}
            variant="outline"
            className="w-full h-10 text-base font-semibold"
          >
            Resume Saved Game
          </Button>
        )}
      </div>
    </div>
  )
})
