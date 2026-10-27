import { renderHook, act } from '@testing-library/react'
import { useChessGame } from '@/hooks/useChessGame'
import { createInitialGameState, getAllValidMoves } from '@/lib/chessRules'
import { getAIMove } from '@/lib/aiStrategies'
import type { Board, GameState } from '@/types/chess.types'

function emptyState(board: Board, current: 1 | 2 = 1): GameState {
  const base = createInitialGameState('pvc', 'hard')
  const rights = { whiteKingside: false, whiteQueenside: false, blackKingside: false, blackQueenside: false }
  return {
    ...base, board, currentPlayer: current, castlingRights: rights, positionHistory: [],
    validMoves: getAllValidMoves(board, current, rights, null),
  }
}

function blank(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null))
}

describe('hook: undo, AI scheduling, opponent changes', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  async function clickMove(result: { current: ReturnType<typeof useChessGame> }, a: [number, number], b: [number, number]) {
    await act(async () => { await result.current.handleSquareClick(a[0], a[1]) })
    await act(async () => {
      const p = result.current.handleSquareClick(b[0], b[1])
      await jest.advanceTimersByTimeAsync(2000)
      await p
    })
  }

  it('undo drops the undone positions from the repetition history', async () => {
    const { result } = renderHook(() => useChessGame('easy'))
    act(() => result.current.startGame('pvc', 'easy'))
    await clickMove(result, [6, 4], [4, 4])
    await act(async () => { await jest.advanceTimersByTimeAsync(3000) })
    expect(result.current.gameState.moveHistory).toHaveLength(2)
    expect(result.current.gameState.positionHistory).toHaveLength(3)
    act(() => result.current.undoMove())
    expect(result.current.gameState.moveHistory).toHaveLength(0)
    expect(result.current.gameState.positionHistory).toHaveLength(1)
  })

  it('the AI still moves when game state is touched while it is about to move', async () => {
    const { result } = renderHook(() => useChessGame('easy'))
    act(() => result.current.startGame('pvc', 'easy'))
    await act(async () => { await result.current.handleSquareClick(6, 4) })
    await act(async () => {
      const p = result.current.handleSquareClick(4, 4)
      await jest.advanceTimersByTimeAsync(400)
      await p
    })
    // AI is waiting out its pre-move delay; something re-renders the state
    act(() => result.current.changeMode('pvc'))
    await act(async () => { await jest.advanceTimersByTimeAsync(5000) })
    expect(result.current.gameState.currentPlayer).toBe(1)
    expect(result.current.gameState.moveHistory).toHaveLength(2)
  })

  it('opponent cannot be changed once a game has moves', async () => {
    const { result } = renderHook(() => useChessGame('hard'))
    act(() => result.current.startGame('pvc', 'hard'))
    await clickMove(result, [6, 4], [4, 4])
    act(() => result.current.changeDifficulty('easy'))
    expect(result.current.gameState.difficulty).toBe('hard')
  })
})

describe('hard AI', () => {
  it('finds mate in one and returns a legal move quickly', () => {
    // Black Kh8, white Kf7... use back-rank: white Ra1 mates black Kg8 behind pawns f7 g7 h7
    const b = blank()
    b[0][6] = { player: 2, type: 'king' }
    b[1][5] = { player: 2, type: 'pawn' }
    b[1][6] = { player: 2, type: 'pawn' }
    b[1][7] = { player: 2, type: 'pawn' }
    b[7][0] = { player: 1, type: 'rook' }
    b[7][6] = { player: 1, type: 'king' }
    const s = emptyState(b, 1)
    const t = Date.now()
    const m = getAIMove(s, 1, 'hard')!
    expect(Date.now() - t).toBeLessThan(4000)
    expect(m.to).toEqual({ row: 0, col: 0 })
  })
})
