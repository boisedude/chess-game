/**
 * Game History Dialog Component
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
import type { GameHistory } from '@/types/gameHistory.types'

interface GameHistoryDialogProps {
  open: boolean
  onClose: () => void
  history: GameHistory
  onClearHistory: () => void
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Bella',
  medium: 'Coop',
  hard: 'Bentley',
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function ResultBadge({ result }: { result: 'win' | 'loss' | 'draw' }) {
  const styles = {
    win: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    loss: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    draw: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  }
  const labels = { win: 'Win', loss: 'Loss', draw: 'Draw' }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[result]}`}>
      {labels[result]}
    </span>
  )
}

export const GameHistoryDialog = React.memo(function GameHistoryDialog({
  open,
  onClose,
  history,
  onClearHistory,
}: GameHistoryDialogProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClearHistory = () => {
    onClearHistory()
    setShowClearConfirm(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Game History</DialogTitle>
          <DialogDescription>
            {history.length > 0
              ? `${history.length} game${history.length === 1 ? '' : 's'} played`
              : 'Your completed games will appear here'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto py-2">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <p className="text-sm">No games played yet.</p>
              <p className="mt-1 text-xs">Complete a game to see it here!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(record => (
                <div key={record.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {record.mode === 'pvp' ? 'PvP' : `vs ${DIFFICULTY_LABELS[record.difficulty] ?? record.difficulty}`}
                      </span>
                      <ResultBadge result={record.result} />
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(record.date)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">{record.whiteCount} - {record.blackCount}</span>
                    <span className="text-xs text-muted-foreground">{record.moveCount} move{record.moveCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {showClearConfirm ? (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Clear all history?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleClearHistory} className="h-8">Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setShowClearConfirm(false)} className="h-8">Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setShowClearConfirm(true)} size="sm" className="w-full sm:w-auto" disabled={history.length === 0}>
                Clear History
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
