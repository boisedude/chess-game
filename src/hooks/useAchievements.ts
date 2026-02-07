/**
 * Achievements Hook
 *
 * Exports: useAchievements() -> { achievements, checkAchievements, unlockAchievement,
 * recentlyUnlocked, clearRecentlyUnlocked, resetAchievements }
 * Also exports: AchievementContext interface.
 *
 * 16 achievements, only checked in PvC mode at game end via checkAchievements().
 */

import { useState, useCallback } from 'react'
import type {
  AchievementId,
  AchievementState,
  Achievement,
} from '@/types/achievements.types'
import { ACHIEVEMENT_DEFINITIONS } from '@/types/achievements.types'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import {
  INITIAL_PIECE_COUNT,
  SPEED_DEMON_MOVE_LIMIT,
  SCHOLARS_MATE_MOVE_LIMIT,
  BOARD_MASTER_GAME_COUNT,
} from '@/lib/gameConstants'

export interface AchievementContext {
  winner: 1 | 2 | null
  playerIs: 1 | 2
  difficulty: 'easy' | 'medium' | 'hard'
  mode: 'pvc' | 'pvp'
  moveCount: number
  whiteCount: number
  blackCount: number
  hadQueenCaptured: boolean
  promotedPawnCount: number
  castledThisGame: boolean
  usedEnPassant: boolean
  wasDownByMaterial: boolean
  lastMoveWasKnightCheckmate: boolean
  currentWinStreak: number
  totalGamesPlayed: number
}

const ALL_ACHIEVEMENT_IDS: AchievementId[] = Object.keys(
  ACHIEVEMENT_DEFINITIONS
) as AchievementId[]

function createDefaultAchievementState(): AchievementState {
  const state = {} as AchievementState
  for (const id of ALL_ACHIEVEMENT_IDS) {
    const def = ACHIEVEMENT_DEFINITIONS[id]
    state[id] = { id, name: def.name, description: def.description, icon: def.icon, unlockedAt: undefined }
  }
  return state
}

function isValidAchievementState(data: unknown): data is AchievementState {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  for (const id of ALL_ACHIEVEMENT_IDS) {
    const entry = record[id]
    if (!entry || typeof entry !== 'object') return false
    const achievement = entry as Partial<Achievement>
    if (typeof achievement.id !== 'string' || typeof achievement.name !== 'string' ||
        typeof achievement.description !== 'string' || typeof achievement.icon !== 'string') return false
    if (achievement.unlockedAt !== undefined &&
        (typeof achievement.unlockedAt !== 'number' || achievement.unlockedAt < 0)) return false
  }
  return true
}

function getInitialAchievementState(): AchievementState {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS)
    if (stored) {
      const data = JSON.parse(stored)
      if (isValidAchievementState(data)) {
        const defaults = createDefaultAchievementState()
        return { ...defaults, ...data }
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS)
      }
    }
  } catch {
    console.warn('chess: localStorage unavailable for achievements')
    try { localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS) } catch { console.warn('chess: localStorage unavailable') }
  }
  return createDefaultAchievementState()
}

function saveAchievementState(state: AchievementState): void {
  try { localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(state)) }
  catch { console.warn('chess: localStorage unavailable for achievements') }
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<AchievementState>(getInitialAchievementState)
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<AchievementId | null>(null)

  const unlockAchievement = useCallback(
    (id: AchievementId): boolean => {
      if (achievements[id].unlockedAt !== undefined) return false
      const now = Date.now()
      const updated = { ...achievements, [id]: { ...achievements[id], unlockedAt: now } }
      setAchievements(updated)
      saveAchievementState(updated)
      setRecentlyUnlocked(id)
      return true
    },
    [achievements]
  )

  const checkAchievements = useCallback(
    (context: AchievementContext): AchievementId[] => {
      if (context.mode !== 'pvc') return []

      const newlyUnlocked: AchievementId[] = []
      const now = Date.now()
      let current = { ...achievements }

      const tryUnlock = (id: AchievementId) => {
        if (current[id].unlockedAt === undefined) {
          current = { ...current, [id]: { ...current[id], unlockedAt: now } }
          newlyUnlocked.push(id)
        }
      }

      const playerWon = context.winner === context.playerIs

      if (playerWon) tryUnlock('first_victory')

      // Scholar's mate
      if (playerWon && context.moveCount <= SCHOLARS_MATE_MOVE_LIMIT) tryUnlock('scholars_mate')

      // Queen sacrifice - won despite losing queen
      if (playerWon && context.hadQueenCaptured) tryUnlock('queen_sacrifice')

      // Pawn promotion
      if (context.promotedPawnCount > 0) tryUnlock('pawn_promotion')

      // Knight checkmate
      if (playerWon && context.lastMoveWasKnightCheckmate) tryUnlock('knight_checkmate')

      // Castling master
      if (context.castledThisGame) tryUnlock('castling_master')

      // En passant
      if (context.usedEnPassant) tryUnlock('en_passant')

      // Flawless victory
      if (playerWon) {
        const playerPieceCount = context.playerIs === 1 ? context.whiteCount : context.blackCount
        if (playerPieceCount === INITIAL_PIECE_COUNT) tryUnlock('flawless_victory')
      }

      // Speed demon
      if (playerWon && context.moveCount < SPEED_DEMON_MOVE_LIMIT) tryUnlock('speed_demon')

      // Comeback kid
      if (playerWon && context.wasDownByMaterial) tryUnlock('comeback_kid')

      if (playerWon && context.difficulty === 'easy') tryUnlock('beat_bella')
      if (playerWon && context.difficulty === 'medium') tryUnlock('beat_coop')
      if (playerWon && context.difficulty === 'hard') tryUnlock('beat_bentley')

      if (context.currentWinStreak >= 3) tryUnlock('streak_3')
      if (context.currentWinStreak >= 5) tryUnlock('streak_5')

      if (context.totalGamesPlayed >= BOARD_MASTER_GAME_COUNT) tryUnlock('board_master')

      if (newlyUnlocked.length > 0) {
        setAchievements(current)
        saveAchievementState(current)
        setRecentlyUnlocked(newlyUnlocked[newlyUnlocked.length - 1])
      }

      return newlyUnlocked
    },
    [achievements]
  )

  const clearRecentlyUnlocked = useCallback(() => { setRecentlyUnlocked(null) }, [])

  const resetAchievements = useCallback(() => {
    const defaults = createDefaultAchievementState()
    setAchievements(defaults)
    saveAchievementState(defaults)
    setRecentlyUnlocked(null)
  }, [])

  return { achievements, unlockAchievement, checkAchievements, recentlyUnlocked, clearRecentlyUnlocked, resetAchievements }
}
