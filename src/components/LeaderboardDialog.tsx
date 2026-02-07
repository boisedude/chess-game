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
          <DialogTitle className="flex items-center justify-between">
            <span>Game Stats</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {isEditing ? (
                <div className="flex items-center gap-2 pt-2">
                  <Input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name" maxLength={20} className="flex-1" />
                  <Button size="sm" onClick={handleSaveName}>Save</Button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="text-left hover:underline focus:underline focus:outline-none">
                  Player: {stats.playerName}
                </button>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="mb-2 text-sm font-semibold">Game Record</h3>
            <StatRow label="Total Games" value={stats.totalGames} />
            <StatRow label="Wins" value={stats.wins} highlight="green" />
            <StatRow label="Losses" value={stats.losses} highlight="red" />
            <StatRow label="Draws" value={stats.draws} />
            <StatRow label="Win Rate" value={`${winRate}%`} />
          </div>
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">Streaks</h3>
            <div className="space-y-2">
              <StatRow label="Current Win Streak" value={stats.winStreak} highlight={stats.winStreak > 0 ? 'green' : undefined} />
              <StatRow label="Longest Win Streak" value={stats.longestWinStreak} />
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">Best Records</h3>
            <div className="space-y-2">
              <StatRow label="Largest Margin" value={stats.largestWinMargin > 0 ? `${stats.largestWinMargin} pieces` : 'N/A'} />
              <StatRow label="Perfect Games" value={stats.perfectGames} />
              <StatRow label="Total Pieces Captured" value={stats.totalCaptures.toLocaleString()} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {showResetConfirm ? (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Reset all stats?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleResetStats} className="h-8">Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setShowResetConfirm(false)} className="h-8">Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setShowResetConfirm(true)} size="sm" className="w-full sm:w-auto">Reset Stats</Button>
              <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: 'green' | 'red' }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
      <span className="text-sm font-medium">{label}</span>
      <span className={`text-lg font-bold ${highlight === 'green' ? 'text-green-600' : highlight === 'red' ? 'text-red-600' : ''}`}>
        {value}
      </span>
    </div>
  )
}
