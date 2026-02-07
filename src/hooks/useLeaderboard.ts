/**
 * Leaderboard Hook
 *
 * Exports: useLeaderboard() -> { stats, recordWin, recordLoss, recordDraw,
 * updatePlayerName, resetStats }
 */

import { useState, useEffect, useCallback } from 'react'
import type { LeaderboardEntry } from '@/types/chess.types'
import { STORAGE_KEYS } from '@/lib/storageKeys'
const DEFAULT_PLAYER_NAME = 'Player'

function isValidLeaderboard(data: unknown): data is LeaderboardEntry {
  if (!data || typeof data !== 'object') return false
  const entry = data as Partial<LeaderboardEntry>
  return (
    typeof entry.playerName === 'string' &&
    typeof entry.wins === 'number' && entry.wins >= 0 &&
    typeof entry.losses === 'number' && entry.losses >= 0 &&
    typeof entry.draws === 'number' && entry.draws >= 0 &&
    typeof entry.winStreak === 'number' && entry.winStreak >= 0 &&
    typeof entry.longestWinStreak === 'number' && entry.longestWinStreak >= 0 &&
    typeof entry.largestWinMargin === 'number' && entry.largestWinMargin >= 0 &&
    typeof entry.perfectGames === 'number' && entry.perfectGames >= 0 &&
    typeof entry.totalGames === 'number' && entry.totalGames >= 0 &&
    typeof entry.totalCaptures === 'number' && entry.totalCaptures >= 0
  )
}

function getInitialLeaderboard(): LeaderboardEntry {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LEADERBOARD)
    if (stored) {
      const data = JSON.parse(stored)
      if (isValidLeaderboard(data)) return data
      else localStorage.removeItem(STORAGE_KEYS.LEADERBOARD)
    }
  } catch {
    console.warn('chess: localStorage unavailable')
    try { localStorage.removeItem(STORAGE_KEYS.LEADERBOARD) } catch { console.warn('chess: localStorage unavailable') }
  }
  return {
    playerName: DEFAULT_PLAYER_NAME, wins: 0, losses: 0, draws: 0,
    winStreak: 0, longestWinStreak: 0, largestWinMargin: 0,
    perfectGames: 0, totalGames: 0, totalCaptures: 0,
  }
}

export function useLeaderboard() {
  const [stats, setStats] = useState<LeaderboardEntry>(getInitialLeaderboard)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(stats)) }
    catch { console.warn('chess: localStorage unavailable') }
  }, [stats])

  const recordWin = useCallback((margin: number, captures: number, isPerfect: boolean) => {
    setStats(prev => {
      const newWinStreak = prev.winStreak + 1
      return {
        ...prev, wins: prev.wins + 1, winStreak: newWinStreak,
        longestWinStreak: Math.max(newWinStreak, prev.longestWinStreak),
        largestWinMargin: Math.max(prev.largestWinMargin, margin),
        perfectGames: isPerfect ? prev.perfectGames + 1 : prev.perfectGames,
        totalGames: prev.totalGames + 1, totalCaptures: prev.totalCaptures + captures,
      }
    })
  }, [])

  const recordLoss = useCallback((captures: number) => {
    setStats(prev => ({ ...prev, losses: prev.losses + 1, winStreak: 0, totalGames: prev.totalGames + 1, totalCaptures: prev.totalCaptures + captures }))
  }, [])

  const recordDraw = useCallback((captures: number) => {
    setStats(prev => ({ ...prev, draws: prev.draws + 1, winStreak: 0, totalGames: prev.totalGames + 1, totalCaptures: prev.totalCaptures + captures }))
  }, [])

  const updatePlayerName = useCallback((name: string) => {
    setStats(prev => ({ ...prev, playerName: name || DEFAULT_PLAYER_NAME }))
  }, [])

  const resetStats = useCallback(() => {
    setStats(prev => ({
      playerName: prev.playerName, wins: 0, losses: 0, draws: 0,
      winStreak: 0, longestWinStreak: 0, largestWinMargin: 0,
      perfectGames: 0, totalGames: 0, totalCaptures: 0,
    }))
  }, [])

  return { stats, recordWin, recordLoss, recordDraw, updatePlayerName, resetStats }
}
