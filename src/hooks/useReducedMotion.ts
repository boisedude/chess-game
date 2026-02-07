/**
 * useReducedMotion Hook
 *
 * Respects OS prefers-reduced-motion setting with manual override.
 * Stores manual preference in localStorage. Listens for system changes
 * when no manual override is set.
 */

import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export function useReducedMotion() {
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION)
      if (saved !== null) {
        return saved === 'true'
      }
    } catch {
      // Fall through to system check
    }

    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    return false
  })

  useEffect(() => {
    // Only listen to system preference if user hasn't set a manual preference
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION)
    } catch {
      // Ignore
    }
    if (saved !== null) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleReducedMotion = () => {
    setIsReducedMotion(prev => {
      const newValue = !prev
      try {
        localStorage.setItem(STORAGE_KEYS.REDUCED_MOTION, String(newValue))
      } catch {
        // Silent fail
      }
      return newValue
    })
  }

  return {
    isReducedMotion,
    toggleReducedMotion,
  }
}
