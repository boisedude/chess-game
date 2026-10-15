import { render, act, cleanup } from '@testing-library/react'
import { createInitialGameState } from '@/lib/chessRules'
import type { GameState } from '@/types/chess.types'

const mockRecordPlayerBeatBentley = jest.fn()
const mockRecordBentleyBeatPlayer = jest.fn()
jest.mock('@shared/arcadeRecord', () => ({
  recordPlayerBeatBentley: (...a: unknown[]) => mockRecordPlayerBeatBentley(...a),
  recordBentleyBeatPlayer: (...a: unknown[]) => mockRecordBentleyBeatPlayer(...a),
}))

let mockState: GameState
jest.mock('@/hooks/useChessGame', () => ({
  useChessGame: () => ({
    gameState: mockState,
    isAnimating: false,
    animatingPiece: null,
    capturedPiece: null,
    promotedPiece: null,
    handleSquareClick: jest.fn(),
    handlePromotionChoice: jest.fn(),
    startNewGame: jest.fn(),
    startGame: jest.fn(),
    returnToSetup: jest.fn(),
    resumeGame: jest.fn(),
    changeDifficulty: jest.fn(),
    changeMode: jest.fn(),
    undoMove: jest.fn(),
    resign: jest.fn(),
    offerDraw: jest.fn(),
    isHighlighted: () => false,
    isPieceSelected: () => false,
    canUndo: false,
    hasSavedGame: () => false,
  }),
}))
jest.mock('@/hooks/useGameAudio', () => {
  const noop = jest.fn()
  return {
    useGameAudio: () => ({
      isMuted: true, toggleMute: noop, playPieceMove: noop, playVictory: noop, playDefeat: noop,
      playDraw: noop, playCapture: noop, playPromotion: noop, playAchievementUnlock: noop,
      playCheck: noop, playCastling: noop,
    }),
  }
})
jest.mock('@/hooks/useBackgroundMusic', () => ({
  useBackgroundMusic: () => ({ isMusicMuted: true, toggleMusicMute: jest.fn() }),
}))

import { ChessGame } from '@/pages/ChessGame'

function playing(mode: 'pvc' | 'pvp', difficulty: 'easy' | 'medium' | 'hard'): GameState {
  return createInitialGameState(mode, difficulty)
}

function finish(
  mode: 'pvc' | 'pvp',
  difficulty: 'easy' | 'medium' | 'hard',
  end: Partial<GameState>
) {
  mockState = playing(mode, difficulty)
  const view = render(<ChessGame />)
  mockState = { ...mockState, ...end }
  act(() => view.rerender(<ChessGame />))
  // Re-render again: must not post twice
  act(() => view.rerender(<ChessGame />))
  cleanup()
}

describe('arcade Bentley record', () => {
  beforeEach(() => {
    localStorage.clear()
    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: jest.fn(), removeEventListener: jest.fn(),
      addListener: jest.fn(), removeListener: jest.fn(), onchange: null, dispatchEvent: jest.fn(),
    })) as unknown as typeof window.matchMedia
    mockRecordPlayerBeatBentley.mockClear()
    mockRecordBentleyBeatPlayer.mockClear()
  })

  it('records recordBentleyBeatPlayer once when Bentley wins', () => {
    finish('pvc', 'hard', { status: 'won', winner: 2 })
    expect(mockRecordBentleyBeatPlayer).toHaveBeenCalledTimes(1)
    expect(mockRecordPlayerBeatBentley).not.toHaveBeenCalled()
  })

  it('records recordPlayerBeatBentley once when the player wins', () => {
    finish('pvc', 'hard', { status: 'won', winner: 1 })
    expect(mockRecordPlayerBeatBentley).toHaveBeenCalledTimes(1)
    expect(mockRecordBentleyBeatPlayer).not.toHaveBeenCalled()
  })

  it('records nothing for draws, other opponents, or player-vs-player', () => {
    finish('pvc', 'hard', { status: 'draw', winner: null })
    finish('pvc', 'easy', { status: 'won', winner: 2 })
    finish('pvc', 'medium', { status: 'won', winner: 1 })
    finish('pvp', 'hard', { status: 'won', winner: 1 })
    expect(mockRecordPlayerBeatBentley).not.toHaveBeenCalled()
    expect(mockRecordBentleyBeatPlayer).not.toHaveBeenCalled()
  })
})
