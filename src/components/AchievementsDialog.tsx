/**
 * Achievements Dialog Component
 *
 * Displays all 16 achievements in a responsive grid.
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import type { AchievementState } from '@/types/achievements.types'

interface AchievementsDialogProps {
  open: boolean
  onClose: () => void
  achievements: AchievementState
}

export const AchievementsDialog = React.memo(function AchievementsDialog({
  open,
  onClose,
  achievements,
}: AchievementsDialogProps) {
  const achievementList = Object.values(achievements)
  const unlockedCount = achievementList.filter((a) => a.unlockedAt !== undefined).length
  const totalCount = achievementList.length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Achievements</span>
            <span className="text-sm font-normal text-muted-foreground">
              {unlockedCount} / {totalCount} Unlocked
            </span>
          </DialogTitle>
          <DialogDescription>
            Complete challenges to unlock achievements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
          {achievementList.map((achievement) => {
            const isUnlocked = achievement.unlockedAt !== undefined
            const unlockDate = isUnlocked ? new Date(achievement.unlockedAt!).toLocaleDateString() : null

            return (
              <div
                key={achievement.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  isUnlocked ? 'border-amber-500/30 bg-amber-950/20' : 'border-muted bg-muted/30 opacity-50'
                }`}
              >
                <span className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`} role="img" aria-hidden="true">
                  {achievement.icon}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={`text-sm font-semibold ${isUnlocked ? 'text-amber-200' : 'text-muted-foreground'}`}>
                    {achievement.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{achievement.description}</span>
                  {unlockDate && (
                    <span className="mt-1 text-xs text-amber-500/70">Unlocked {unlockDate}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
