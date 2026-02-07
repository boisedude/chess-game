/**
 * Bentley Stats Hook
 *
 * Exports: useBentleyStats() -> { bentleyStats, recordBentleyWin/Loss/Draw, resetBentleyStats }
 * Local-only stats for games against Bentley (hard). Persisted in localStorage.
 */

import { useState, useCallback, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export interface BentleyStats {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  perfectGames: number
  closeCalls: number
  totalCaptures: number
  bestMargin: number
}

function isValidBentleyStats(data: unknown): data is BentleyStats {
  if (!data || typeof data !== 'object') return false
  const stats = data as Partial<BentleyStats>
  return (
    typeof stats.gamesPlayed === 'number' && stats.gamesPlayed >= 0 &&
    typeof stats.gamesWon === 'number' && stats.gamesWon >= 0 &&
    typeof stats.gamesLost === 'number' && stats.gamesLost >= 0 &&
    typeof stats.perfectGames === 'number' && stats.perfectGames >= 0 &&
    typeof stats.closeCalls === 'number' && stats.closeCalls >= 0 &&
    typeof stats.totalCaptures === 'number' && stats.totalCaptures >= 0 &&
    typeof stats.bestMargin === 'number' && stats.bestMargin >= 0
  )
}

function getDefaultStats(): BentleyStats {
  return { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, perfectGames: 0, closeCalls: 0, totalCaptures: 0, bestMargin: 0 }
}

function loadStats(): BentleyStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BENTLEY_STATS)
    if (stored) {
      const data = JSON.parse(stored)
      if (isValidBentleyStats(data)) return data
      else localStorage.removeItem(STORAGE_KEYS.BENTLEY_STATS)
    }
  } catch {
    console.warn('chess: localStorage unavailable')
    try { localStorage.removeItem(STORAGE_KEYS.BENTLEY_STATS) } catch { console.warn('chess: localStorage unavailable') }
  }
  return getDefaultStats()
}

function saveStats(stats: BentleyStats): void {
  try { localStorage.setItem(STORAGE_KEYS.BENTLEY_STATS, JSON.stringify(stats)) }
  catch { console.warn('chess: localStorage unavailable') }
}

export function useBentleyStats() {
  const [stats, setStats] = useState<BentleyStats>(loadStats)

  useEffect(() => { saveStats(stats) }, [stats])

  const recordBentleyWin = useCallback((margin: number, totalCaptures: number, isPerfect: boolean) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + 1,
      totalCaptures: prev.totalCaptures + totalCaptures,
      perfectGames: isPerfect ? prev.perfectGames + 1 : prev.perfectGames,
      bestMargin: margin > prev.bestMargin ? margin : prev.bestMargin,
    }))
  }, [])

  const recordBentleyLoss = useCallback((margin: number, totalCaptures: number) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      gamesLost: prev.gamesLost + 1,
      totalCaptures: prev.totalCaptures + totalCaptures,
      closeCalls: margin <= 3 ? prev.closeCalls + 1 : prev.closeCalls,
    }))
  }, [])

  const recordBentleyDraw = useCallback((totalCaptures: number) => {
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      totalCaptures: prev.totalCaptures + totalCaptures,
    }))
  }, [])

  const resetBentleyStats = useCallback(() => { setStats(getDefaultStats()) }, [])

  return { bentleyStats: stats, recordBentleyWin, recordBentleyLoss, recordBentleyDraw, resetBentleyStats }
}
