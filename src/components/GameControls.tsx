/**
 * Game Controls Component
 *
 * One row: New game (the only primary button), Undo, Hint, and a More menu
 * that holds everything else.
 */

import React from 'react'
import { Button } from './ui/button'
import { MoreMenu } from '@shared/MoreMenu'
import type { GameMode, GameStatus } from '@/types/chess.types'

interface GameControlsProps {
  onNewGame: () => void
  onShowLeaderboard: () => void
  onShowHelp: () => void
  onShowAchievements: () => void
  onShowHistory: () => void
  onShowSettings: () => void
  onReturnToSetup: () => void
  onUndo: () => void
  onHint: () => void
  onResign: () => void
  onOfferDraw: () => void
  canUndo?: boolean
  canHint?: boolean
  gameMode: GameMode
  gameStatus?: GameStatus
}

export const GameControls = React.memo(function GameControls({
  onNewGame,
  onShowLeaderboard,
  onShowHelp,
  onShowAchievements,
  onShowHistory,
  onShowSettings,
  onReturnToSetup,
  onUndo,
  onHint,
  onResign,
  onOfferDraw,
  canUndo = false,
  canHint = false,
  gameMode,
  gameStatus = 'playing',
}: GameControlsProps) {
  const playing = gameStatus === 'playing'
  return (
    <div className="arcade-controls">
      <Button onClick={onNewGame} className="h-11 px-3.5 sm:px-5">
        New game
      </Button>

      {playing && (
        <Button onClick={onUndo} disabled={!canUndo} variant="outline" className="h-11 px-3.5 sm:px-5" title="Undo (U)">
          Undo
        </Button>
      )}

      {playing && gameMode === 'pvc' && (
        <Button
          onClick={onHint}
          disabled={!canHint}
          variant="outline"
          className="h-11 px-3.5 sm:px-5"
          title="Show a suggested move (H)"
        >
          Hint
        </Button>
      )}

      <MoreMenu
        items={[
          { label: 'How to play', onSelect: onShowHelp },
          { label: 'Stats', onSelect: onShowLeaderboard },
          { label: 'Achievements', onSelect: onShowAchievements },
          { label: 'Game history', onSelect: onShowHistory },
          { label: 'Settings', onSelect: onShowSettings },
          { label: 'Change mode', onSelect: onReturnToSetup, separated: true },
          playing && gameMode === 'pvp' && { label: 'Offer draw', onSelect: onOfferDraw },
          playing && { label: 'Resign', onSelect: onResign, destructive: true },
        ]}
      />
    </div>
  )
})
