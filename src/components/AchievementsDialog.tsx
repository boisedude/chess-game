/**
 * Achievements Dialog Component
 *
 * Lists every achievement as a plain row; unlocked ones are marked by colour and date.
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
      <DialogContent className="sm:max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Achievements</span>
            <span className="text-sm font-normal text-muted-foreground">
              {unlockedCount} of {totalCount} unlocked
            </span>
          </DialogTitle>
          <DialogDescription>
            Earned by playing.
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y">
          {achievementList.map((achievement) => {
            const isUnlocked = achievement.unlockedAt !== undefined
            const unlockDate = isUnlocked ? new Date(achievement.unlockedAt!).toLocaleDateString() : null

            return (
              <li key={achievement.id} className={`py-2.5 ${isUnlocked ? '' : 'opacity-60'}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-sm font-semibold ${isUnlocked ? 'text-primary' : ''}`}>
                    {achievement.name}
                  </span>
                  {unlockDate && (
                    <span className="shrink-0 text-xs text-muted-foreground">{unlockDate}</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{achievement.description}</span>
              </li>
            )
          })}
        </ul>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="h-11 w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
