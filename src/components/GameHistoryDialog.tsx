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

const RESULT_LABELS = { win: 'Win', loss: 'Loss', draw: 'Draw' }

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
      <DialogContent className="sm:max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle>Game History</DialogTitle>
          <DialogDescription>
            {history.length > 0
              ? `${history.length} game${history.length === 1 ? '' : 's'} played`
              : 'Finished games appear here'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <p className="text-sm">No games played yet.</p>
              
            </div>
          ) : (
            <div>
              {history.map(record => (
                <div key={record.id} className="flex items-center justify-between border-b py-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {record.mode === 'pvp' ? 'Two players' : `vs ${DIFFICULTY_LABELS[record.difficulty] ?? record.difficulty}`}
                      </span>
                      <span className={`text-sm ${record.result === 'win' ? 'text-primary' : 'text-muted-foreground'}`}>{RESULT_LABELS[record.result]}</span>
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
                <Button size="sm" variant="destructive" onClick={handleClearHistory} className="h-11">Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => setShowClearConfirm(false)} className="h-11">Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setShowClearConfirm(true)} size="sm" className="h-11 w-full sm:w-auto" disabled={history.length === 0}>
                Clear history
              </Button>
              <Button onClick={onClose} variant="outline" className="h-11 w-full sm:w-auto">Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
