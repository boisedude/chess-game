/**
 * Main Site Bentley Stats Hook
 *
 * Exports: useMainSiteBentleyStats() -> { stats, loading, error, recordBentleyWin/Loss, refresh }
 * Connects to the mcooper.com API for global cross-game Bentley win/loss tracking.
 */

import { useState, useEffect, useCallback } from 'react'

export interface MainSiteBentleyStats {
  wins: number
  losses: number
  total: number
  winRate: number
  bentleyWinRate: number
  date: string
}

function isValidMainSiteBentleyStats(data: unknown): data is MainSiteBentleyStats {
  if (!data || typeof data !== 'object') return false
  const stats = data as Partial<MainSiteBentleyStats>
  return (
    typeof stats.wins === 'number' && stats.wins >= 0 &&
    typeof stats.losses === 'number' && stats.losses >= 0 &&
    typeof stats.total === 'number' && stats.total >= 0 &&
    typeof stats.winRate === 'number' &&
    typeof stats.bentleyWinRate === 'number' &&
    typeof stats.date === 'string'
  )
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://www.mcooper.com/api'

export function useMainSiteBentleyStats() {
  const [stats, setStats] = useState<MainSiteBentleyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/bentley-stats.php`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      if (data.success) {
        const parsed = {
          wins: data.wins, losses: data.losses, total: data.total,
          winRate: data.winRate, bentleyWinRate: data.bentleyWinRate, date: data.date,
        }
        if (!isValidMainSiteBentleyStats(parsed)) throw new Error('Invalid data structure from API')
        setStats(parsed)
      } else {
        throw new Error('Invalid response from API')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStats({ wins: 0, losses: 0, total: 0, winRate: 0, bentleyWinRate: 0, date: new Date().toISOString().split('T')[0] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const recordBentleyWin = async () => {
    try {
      await fetch(`${API_BASE}/bentley-win.php`, { method: 'POST' })
      await fetchStats()
    } catch (e) {
      console.warn('chess: API request failed', e)
    }
  }

  const recordBentleyLoss = async () => {
    try {
      await fetch(`${API_BASE}/bentley-loss.php`, { method: 'POST' })
      await fetchStats()
    } catch (e) {
      console.warn('chess: API request failed', e)
    }
  }

  return { stats, loading, error, recordBentleyWin, recordBentleyLoss, refresh: fetchStats }
}
