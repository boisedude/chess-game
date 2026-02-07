/**
 * useGameSettings Hook
 *
 * Manages game display/behavior settings with localStorage persistence.
 * Controls animation speed, victory celebrations, and move notation visibility.
 */

import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export type AnimationSpeed = 'off' | 'fast' | 'normal' | 'slow'

export interface GameSettings {
  animationSpeed: AnimationSpeed
  showVictoryCelebration: boolean
  showMoveNotation: boolean
}

const DEFAULT_SETTINGS: GameSettings = {
  animationSpeed: 'normal',
  showVictoryCelebration: true,
  showMoveNotation: true,
}

/** Multiplier applied to celebration/settle durations */
export const ANIMATION_SPEED_MULTIPLIER: Record<AnimationSpeed, number> = {
  off: 0,
  fast: 0.5,
  normal: 1,
  slow: 1.5,
}

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch {
      // Fall through to default
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(settings))
    } catch {
      // Silent fail — settings work for current session
    }
  }, [settings])

  const updateSetting = useCallback(
    <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const getAnimationMultiplier = useCallback(() => {
    return ANIMATION_SPEED_MULTIPLIER[settings.animationSpeed]
  }, [settings.animationSpeed])

  return {
    settings,
    updateSetting,
    resetSettings,
    getAnimationMultiplier,
  }
}
