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
        className={`fixed left-1/2 top-4 z-[100] -translate-x-1/2 transition-all duration-300 ease-out ${
          visible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-950/95 to-yellow-950/95 px-5 py-3 shadow-lg shadow-amber-500/20 backdrop-blur-sm">
          <span className="text-3xl" role="img" aria-hidden="true">
            {achievement.icon}
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Achievement Unlocked!
            </span>
            <span className="text-sm font-bold text-amber-50">
              {achievement.name}
            </span>
          </div>
        </div>
      </div>
    )
  }
)
