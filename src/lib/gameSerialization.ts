/**
 * Game Serialization
 *
 * Exports: saveGame, loadSavedGame, clearSavedGame, hasSavedGame.
 * Persists GameState to localStorage with full validation on load.
 * Invalid/corrupt data is silently cleared to prevent broken state.
 */

import type { GameState } from '@/types/chess.types'
import { STORAGE_KEYS } from './storageKeys'

/** Required fields for validation. Must match GameState interface keys. */
const REQUIRED_FIELDS: (keyof GameState)[] = [
  'board',
  'currentPlayer',
  'status',
  'mode',
  'difficulty',
  'moveHistory',
  'whiteCount',
  'blackCount',
  'validMoves',
  'castlingRights',
  'halfmoveClock',
  'fullmoveNumber',
  'isInCheck',
  'positionHistory',
  'hadQueenCaptured',
  'promotedPawnCount',
  'castledThisGame',
  'usedEnPassant',
  'wasDownByMaterial',
]

/** Type guard: validates all required GameState fields exist with correct types. */
function isValidGameState(data: unknown): data is GameState {
  if (!data || typeof data !== 'object') {
    return false
  }

  const state = data as Record<string, unknown>

  for (const field of REQUIRED_FIELDS) {
    if (!(field in state)) {
      return false
    }
  }

  // Validate critical field types
  if (
    !Array.isArray(state.board) ||
    (state.currentPlayer !== 1 && state.currentPlayer !== 2) ||
    typeof state.status !== 'string' ||
    typeof state.mode !== 'string' ||
    typeof state.difficulty !== 'string' ||
    !Array.isArray(state.moveHistory) ||
    typeof state.whiteCount !== 'number' ||
    typeof state.blackCount !== 'number' ||
    !Array.isArray(state.validMoves) ||
    typeof state.castlingRights !== 'object' ||
    typeof state.halfmoveClock !== 'number' ||
    typeof state.fullmoveNumber !== 'number' ||
    typeof state.isInCheck !== 'boolean' ||
    !Array.isArray(state.positionHistory) ||
    typeof state.hadQueenCaptured !== 'boolean' ||
    typeof state.promotedPawnCount !== 'number' ||
    typeof state.castledThisGame !== 'boolean' ||
    typeof state.usedEnPassant !== 'boolean' ||
    typeof state.wasDownByMaterial !== 'boolean'
  ) {
    return false
  }

  return true
}

/** Saves game state to localStorage. Silently fails if storage unavailable. */
export function saveGame(state: GameState): void {
  try {
    const serialized = JSON.stringify(state)
    localStorage.setItem(STORAGE_KEYS.SAVED_GAME, serialized)
  } catch {
    console.warn('chess: Failed to save game to localStorage')
  }
}

/** Loads and validates saved game from localStorage. Returns null if invalid or absent. */
export function loadSavedGame(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SAVED_GAME)
    if (!stored) {
      return null
    }

    const data = JSON.parse(stored)

    if (isValidGameState(data)) {
      return data
    } else {
      // Clear invalid data
      localStorage.removeItem(STORAGE_KEYS.SAVED_GAME)
      return null
    }
  } catch {
    console.warn('chess: Failed to load saved game from localStorage')
    try {
      localStorage.removeItem(STORAGE_KEYS.SAVED_GAME)
    } catch {
      console.warn('chess: localStorage unavailable')
    }
    return null
  }
}

/** Removes saved game from localStorage. */
export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SAVED_GAME)
  } catch {
    console.warn('chess: Failed to clear saved game from localStorage')
  }
}

/** Returns true if a structurally valid saved game exists in localStorage. */
export function hasSavedGame(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SAVED_GAME)
    if (!stored) {
      return false
    }

    const data = JSON.parse(stored)
    return isValidGameState(data)
  } catch {
    return false
  }
}
