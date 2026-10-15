/**
 * Welcome Screen Component
 *
 * Setup screen on the arcade table. Mode is a segmented pair of outline
 * buttons; the opponent is one of three outlined cards. Supports resuming
 * a saved game.
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

const RING: Record<string, string> = {
  bella: 'var(--arcade-bella)',
  coop: 'var(--arcade-coop)',
  bentley: 'var(--arcade-bentley)',
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
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-2" role="group" aria-label="Game mode">
        {([
          ['pvc', 'One player'],
          ['pvp', 'Two players'],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            variant="outline"
            aria-pressed={mode === value}
            onClick={() => onModeChange(value)}
            className={`h-11 ${mode === value ? 'border-primary bg-primary/15 text-foreground' : 'text-muted-foreground'}`}
          >
            {label}
          </Button>
        ))}
      </div>

      {mode === 'pvc' ? (
        <div className="grid w-full gap-3" role="group" aria-label="Opponent">
          {characters.map((char) => {
            const isSelected = char.difficulty === difficulty
            return (
              <button
                key={char.id}
                type="button"
                className={`flex min-h-[4.5rem] items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-accent'
                }`}
                aria-pressed={isSelected}
                onClick={() => onDifficultyChange(char.difficulty as Difficulty)}
              >
                <img
                  src={char.avatar}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                  style={{ boxShadow: `0 0 0 2px ${RING[char.id]}` }}
                />
                <div className="min-w-0">
                  <div className="font-semibold">
                    {char.name}
                    <span className="ml-2 text-sm font-normal capitalize text-muted-foreground">
                      {char.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{char.playingStyle}</p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Two players on one device. White moves first.
        </p>
      )}

      <div className="flex w-full flex-col items-center gap-2">
        <Button onClick={onStartGame} className="h-11 w-full max-w-xs">
          Start game
        </Button>
        {hasSaved && onResumeGame && (
          <Button onClick={onResumeGame} variant="outline" className="h-11 w-full max-w-xs">
            Resume saved game
          </Button>
        )}
      </div>
    </div>
  )
})
