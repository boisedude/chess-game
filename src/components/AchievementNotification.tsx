/**
 * Achievement Notification Component
 *
 * Toast that slides in from top when an achievement unlocks. Auto-dismisses after
 * ACHIEVEMENT_TOAST_DURATION_MS with a fade-out of ACHIEVEMENT_TOAST_FADE_MS.
 * Renders null when no achievement is active.
 */

import React, { useEffect, useState } from 'react'
import type { Achievement } from '@/types/achievements.types'
import { ACHIEVEMENT_TOAST_DURATION_MS, ACHIEVEMENT_TOAST_FADE_MS } from '@/lib/gameConstants'

interface AchievementNotificationProps {
  achievement: Achievement | null
  onDismiss: () => void
}

export const AchievementNotification = React.memo(
  function AchievementNotification({
    achievement,
    onDismiss,
  }: AchievementNotificationProps) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
      if (!achievement) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(false)
        return
      }

      // Small delay to trigger the slide-in transition
      const showTimeout = setTimeout(() => setVisible(true), 50)

      // Auto-dismiss after toast duration
      const dismissTimeout = setTimeout(() => {
        setVisible(false)
        // Wait for slide-out animation to complete before calling onDismiss
        setTimeout(onDismiss, ACHIEVEMENT_TOAST_FADE_MS)
      }, ACHIEVEMENT_TOAST_DURATION_MS)

      return () => {
        clearTimeout(showTimeout)
        clearTimeout(dismissTimeout)
      }
    }, [achievement, onDismiss])

    if (!achievement) {
      return null
    }

    return (
      <div
        className={`fixed left-1/2 top-4 z-[60] -translate-x-1/2 transition-all duration-300 ease-out ${
          visible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col rounded-md border border-border bg-card px-4 py-2.5 shadow-lg">
          <span className="text-xs text-muted-foreground">Achievement unlocked</span>
          <span className="text-sm font-semibold text-foreground">{achievement.name}</span>
        </div>
      </div>
    )
  }
)
