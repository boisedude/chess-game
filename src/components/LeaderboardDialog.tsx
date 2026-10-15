/**
 * Leaderboard Dialog Component
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { LeaderboardEntry } from '@/types/chess.types'

interface LeaderboardDialogProps {
  open: boolean
  onClose: () => void
  stats: LeaderboardEntry
  onResetStats: () => void
  onUpdatePlayerName: (name: string) => void
}

export const LeaderboardDialog = React.memo(function LeaderboardDialog({
  open,
  onClose,
  stats,
  onResetStats,
  onUpdatePlayerName,
}: LeaderboardDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [playerName, setPlayerName] = useState(stats.playerName)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const winRate = stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : '0.0'

  const handleSaveName = () => { onUpdatePlayerName(playerName); setIsEditing(false) }
  const handleResetStats = () => { onResetStats(); setShowResetConfirm(false) }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your stats</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {isEditing ? (
                <div className="flex items-center gap-2 pt-2">
                  <Input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name" aria-label="Player name" maxLength={20} className="flex-1" />
                  <Button size="sm" className="h-11" onClick={handleSaveName}>Save</Button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="min-h-11 rounded text-left hover:underline">
                  Player: {stats.playerName}
                </button>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y text-sm">
          <StatRow label="Games" value={stats.totalGames} />
          <StatRow label="Wins" value={stats.wins} />
          <StatRow label="Losses" value={stats.losses} />
          <StatRow label="Draws" value={stats.draws} />
          <StatRow label="Win rate" value={`${winRate}%`} />
          <StatRow label="Current win streak" value={stats.winStreak} />
          <StatRow label="Longest win streak" value={stats.longestWinStreak} />
          <StatRow label="Largest margin" value={stats.largestWinMargin > 0 ? `${stats.largestWinMargin} pieces` : 'None yet'} />
          <StatRow label="Perfect games" value={stats.perfectGames} />
          <StatRow label="Pieces captured" value={stats.totalCaptures.toLocaleString()} />
        </dl>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {showResetConfirm ? (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Reset all stats?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleResetStats} className="h-11">Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setShowResetConfirm(false)} className="h-11">Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setShowResetConfirm(true)} size="sm" className="h-11 w-full sm:w-auto">Reset stats</Button>
              <Button onClick={onClose} variant="outline" className="h-11 w-full sm:w-auto">Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}
