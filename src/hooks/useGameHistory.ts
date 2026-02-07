/**
 * Game History Hook
 *
 * Exports: useGameHistory() -> { history, addRecord, clearHistory }
 */

import { useState, useEffect, useCallback } from 'react'
import type { GameRecord, GameHistory } from '@/types/gameHistory.types'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { MAX_GAME_HISTORY_RECORDS } from '@/lib/gameConstants'

function isValidGameRecord(data: unknown): data is GameRecord {
  if (!data || typeof data !== 'object') return false
  const record = data as Partial<GameRecord>
  return (
    typeof record.id === 'string' && record.id.length > 0 &&
    typeof record.date === 'number' && record.date > 0 &&
    (record.mode === 'pvc' || record.mode === 'pvp') &&
    (record.difficulty === 'easy' || record.difficulty === 'medium' || record.difficulty === 'hard') &&
    (record.result === 'win' || record.result === 'loss' || record.result === 'draw') &&
    (record.winner === 1 || record.winner === 2 || record.winner === null) &&
    typeof record.moveCount === 'number' && record.moveCount >= 0 &&
    typeof record.whiteCount === 'number' && record.whiteCount >= 0 &&
    typeof record.blackCount === 'number' && record.blackCount >= 0 &&
    typeof record.duration === 'number' && record.duration >= 0
  )
}

function isValidGameHistory(data: unknown): data is GameHistory {
  if (!Array.isArray(data)) return false
  return data.every(isValidGameRecord)
}

function getInitialHistory(): GameHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY)
    if (stored) {
      const data = JSON.parse(stored)
      if (isValidGameHistory(data)) return data
      else localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY)
    }
  } catch {
    console.warn('chess: Failed to load game history from localStorage')
    try { localStorage.removeItem(STORAGE_KEYS.GAME_HISTORY) } catch { console.warn('chess: localStorage unavailable') }
  }
  return []
}

export function useGameHistory() {
  const [history, setHistory] = useState<GameHistory>(getInitialHistory)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(history)) }
    catch { console.warn('chess: Failed to save game history to localStorage') }
  }, [history])

  const addRecord = useCallback((record: Omit<GameRecord, 'id'>) => {
    setHistory(prev => {
      const newRecord: GameRecord = { ...record, id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}` }
      const updated = [newRecord, ...prev]
      if (updated.length > MAX_GAME_HISTORY_RECORDS) return updated.slice(0, MAX_GAME_HISTORY_RECORDS)
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => { setHistory([]) }, [])

  return { history, addRecord, clearHistory }
}
