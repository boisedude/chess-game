// Unit tests for chess game serialization utilities

import {
  saveGame,
  loadSavedGame,
  clearSavedGame,
  hasSavedGame,
} from '@/lib/gameSerialization'
import { createInitialGameState } from '@/lib/chessRules'
import { STORAGE_KEYS } from '@/lib/storageKeys'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string): string | null => {
      return store[key] || null
    }),
    setItem: jest.fn((key: string, value: string): void => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string): void => {
      delete store[key]
    }),
    clear: jest.fn((): void => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: jest.fn((index: number): string | null => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('gameSerialization', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('saveGame', () => {
    it('should store game state in localStorage under the correct key', () => {
      const state = createInitialGameState()

      saveGame(state)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME,
        JSON.stringify(state)
      )
    })

    it('should handle localStorage.setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      const state = createInitialGameState()

      expect(() => saveGame(state)).not.toThrow()
    })
  })

  describe('loadSavedGame', () => {
    it('should return a valid game state from localStorage', () => {
      const state = createInitialGameState()
      saveGame(state)

      const loaded = loadSavedGame()

      expect(loaded).toEqual(state)
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null when nothing is saved', () => {
      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
    })

    it('should return null for corrupted JSON and clear the key', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, '{not valid json!!')

      const loaded = loadSavedGame()

      expect(loaded).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null for non-object JSON values and clear the key', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(42))

      expect(loadSavedGame()).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null for null JSON and clear the key', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(null))

      expect(loadSavedGame()).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should return null for array JSON and clear the key', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify([1, 2]))

      expect(loadSavedGame()).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should handle localStorage.getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('SecurityError')
      })

      expect(loadSavedGame()).toBeNull()
    })
  })

  describe('round-trip: save then load', () => {
    it('should return an equivalent state for default initial state', () => {
      const state = createInitialGameState()

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded).toEqual(state)
    })

    it('should preserve modified game state fields', () => {
      const state = createInitialGameState('pvp', 'hard')
      state.currentPlayer = 2
      state.status = 'won'
      state.winner = 1
      state.whiteCount = 14
      state.blackCount = 10
      state.halfmoveClock = 23
      state.fullmoveNumber = 30
      state.isInCheck = true
      state.positionHistory = ['hash1', 'hash2', 'hash3']
      state.hadQueenCaptured = true
      state.promotedPawnCount = 2
      state.castledThisGame = true
      state.usedEnPassant = true
      state.wasDownByMaterial = true

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded).toEqual(state)
    })

    it('should preserve board with pieces in non-starting positions', () => {
      const state = createInitialGameState()
      // Simulate e2-e4 pawn move
      state.board[4][4] = { player: 1, type: 'pawn' }
      state.board[6][4] = null

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded?.board[4][4]).toEqual({ player: 1, type: 'pawn' })
      expect(loaded?.board[6][4]).toBeNull()
    })

    it('should preserve castling rights after partial loss', () => {
      const state = createInitialGameState()
      state.castlingRights = {
        whiteKingside: false,
        whiteQueenside: true,
        blackKingside: false,
        blackQueenside: false,
      }

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded?.castlingRights).toEqual(state.castlingRights)
    })

    it('should preserve enPassantSquare when set', () => {
      const state = createInitialGameState()
      state.enPassantSquare = { row: 5, col: 3 }

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded?.enPassantSquare).toEqual({ row: 5, col: 3 })
    })

    it('should preserve move history', () => {
      const state = createInitialGameState()
      state.moveHistory = [
        {
          from: { row: 6, col: 4 },
          to: { row: 4, col: 4 },
          player: 1,
          piece: 'pawn',
          isCapture: false,
          isCastling: false,
          isEnPassant: false,
          isPromotion: false,
          isCheck: false,
          isCheckmate: false,
        },
      ]

      saveGame(state)
      const loaded = loadSavedGame()

      expect(loaded?.moveHistory).toEqual(state.moveHistory)
    })
  })

  describe('clearSavedGame', () => {
    it('should remove saved game data from localStorage', () => {
      const state = createInitialGameState()
      saveGame(state)
      expect(hasSavedGame()).toBe(true)

      clearSavedGame()

      expect(hasSavedGame()).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SAVED_GAME
      )
    })

    it('should not throw when no saved game exists', () => {
      expect(() => clearSavedGame()).not.toThrow()
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      expect(() => clearSavedGame()).not.toThrow()
    })
  })

  describe('hasSavedGame', () => {
    it('should return true when a valid saved game exists', () => {
      const state = createInitialGameState()
      saveGame(state)

      expect(hasSavedGame()).toBe(true)
    })

    it('should return false when no saved game exists', () => {
      expect(hasSavedGame()).toBe(false)
    })

    it('should return false for invalid JSON in storage', () => {
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, 'not json')

      expect(hasSavedGame()).toBe(false)
    })

    it('should return false for incomplete game state', () => {
      localStorageMock.setItem(
        STORAGE_KEYS.SAVED_GAME,
        JSON.stringify({ board: [], currentPlayer: 1 })
      )

      expect(hasSavedGame()).toBe(false)
    })

    it('should return false when localStorage throws', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      expect(hasSavedGame()).toBe(false)
    })
  })

  describe('validation: missing chess-specific fields', () => {
    it('should reject state missing castlingRights', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).castlingRights
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing halfmoveClock', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).halfmoveClock
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing fullmoveNumber', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).fullmoveNumber
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing isInCheck', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).isInCheck
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing positionHistory', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).positionHistory
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing hadQueenCaptured', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).hadQueenCaptured
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing promotedPawnCount', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).promotedPawnCount
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing castledThisGame', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).castledThisGame
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing usedEnPassant', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).usedEnPassant
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject state missing wasDownByMaterial', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (state as any).wasDownByMaterial
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })
  })

  describe('validation: wrong field types', () => {
    it('should reject non-array board', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).board = 'not an array'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject invalid currentPlayer value', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).currentPlayer = 3
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-string status', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).status = 123
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-object castlingRights', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).castlingRights = 'not an object'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number halfmoveClock', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).halfmoveClock = '0'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number fullmoveNumber', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).fullmoveNumber = true
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean isInCheck', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).isInCheck = 0
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-array positionHistory', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).positionHistory = 'hash1,hash2'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean hadQueenCaptured', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).hadQueenCaptured = 1
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number promotedPawnCount', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).promotedPawnCount = false
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean castledThisGame', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).castledThisGame = 'yes'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean usedEnPassant', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).usedEnPassant = null
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-boolean wasDownByMaterial', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).wasDownByMaterial = 0
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number whiteCount', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).whiteCount = '16'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-number blackCount', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).blackCount = null
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-array validMoves', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).validMoves = 'not an array'
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-array moveHistory', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).moveHistory = {}
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-string mode', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).mode = 123
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })

    it('should reject non-string difficulty', () => {
      const state = createInitialGameState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(state as any).difficulty = ['hard']
      localStorageMock.setItem(STORAGE_KEYS.SAVED_GAME, JSON.stringify(state))

      expect(loadSavedGame()).toBeNull()
    })
  })
})
