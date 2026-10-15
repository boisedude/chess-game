/**
 * Game Controls Component
 *
 * One primary button (New game), outline actions, and a quiet ghost row
 * for Achievements, History, Settings and Change mode.
 */

import React from 'react'
import { Button } from './ui/button'
import type { GameMode, GameStatus } from '@/types/chess.types'

interface GameControlsProps {
  onNewGame: () => void
  onShowLeaderboard: () => void
  onShowHelp?: () => void
  onShowAchievements?: () => void
  onShowHistory?: () => void
  onReturnToSetup?: () => void
  onUndo?: () => void
  onResign?: () => void
  onOfferDraw?: () => void
  onShowSettings?: () => void
  canUndo?: boolean
  disabled?: boolean
  gameMode: GameMode
  gameStatus?: GameStatus
}

export const GameControls = React.memo(function GameControls({
  onNewGame,
  onShowLeaderboard,
  onShowHelp,
  onShowAchievements,
  onShowHistory,
  onReturnToSetup,
  onUndo,
  onResign,
  onOfferDraw,
  onShowSettings,
  canUndo = false,
  disabled = false,
  gameMode,
  gameStatus = 'playing',
}: GameControlsProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="arcade-controls">
        <Button onClick={onNewGame} disabled={disabled} className="h-11 px-5">
          New game
        </Button>

        {onUndo && gameStatus === 'playing' && (
          <Button
            onClick={onUndo}
            disabled={disabled || !canUndo}
            variant="outline"
            className="h-11 px-5"
            title="Undo (U)"
          >
            Undo
          </Button>
        )}

        {onResign && gameStatus === 'playing' && (
          <Button
            onClick={onResign}
            disabled={disabled}
            variant="outline"
            className="h-11 px-5 border-destructive/50 text-destructive hover:text-destructive"
          >
            Resign
          </Button>
        )}

        {onOfferDraw && gameMode === 'pvp' && gameStatus === 'playing' && (
          <Button onClick={onOfferDraw} disabled={disabled} variant="outline" className="h-11 px-5">
            Offer draw
          </Button>
        )}

        <Button onClick={onShowLeaderboard} disabled={disabled} variant="outline" className="h-11 px-5">
          Stats
        </Button>

        {onShowHelp && (
          <Button onClick={onShowHelp} disabled={disabled} variant="outline" className="h-11 px-5">
            How to play
          </Button>
        )}
      </div>

      <div className="arcade-controls">
        {onShowAchievements && (
          <Button onClick={onShowAchievements} disabled={disabled} variant="ghost" className="h-11 px-2 text-muted-foreground">
            Achievements
          </Button>
        )}
        {onShowHistory && (
          <Button onClick={onShowHistory} disabled={disabled} variant="ghost" className="h-11 px-2 text-muted-foreground">
            History
          </Button>
        )}
        {onShowSettings && (
          <Button onClick={onShowSettings} disabled={disabled} variant="ghost" className="h-11 px-2 text-muted-foreground">
            Settings
          </Button>
        )}
        {onReturnToSetup && (
          <Button onClick={onReturnToSetup} disabled={disabled} variant="ghost" className="h-11 px-2 text-muted-foreground">
            Change mode
          </Button>
        )}
      </div>
    </div>
  )
})
