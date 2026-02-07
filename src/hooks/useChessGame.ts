/**
 * Chess Game Hook
 *
 * Primary state management hook. Orchestrates game lifecycle, player/AI moves,
 * animation sequencing, undo, and save/resume.
 *
 * Exports: useChessGame(initialDifficulty) -> game state + action callbacks.
 *
 * Key differences from checkers:
 * - No multi-jump / intermediateBoard
 * - Promotion dialog flow via pendingPromotion state
 * - AI auto-selects queen for promotion
 * - No mustJump (chess has no forced captures)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GameState, Difficulty, Position, ValidMove, UndoState, GameMode, PromotionPiece } from '@/types/chess.types'
import {
  createInitialGameState,
  getValidMovesForPiece,
  computeNextGameState,
  getAllValidMoves,
} from '@/lib/chessRules'
import { saveGame, loadSavedGame, clearSavedGame, hasSavedGame } from '@/lib/gameSerialization'
import { getAIMove } from '@/lib/aiStrategies'
import {
  AI_MOVE_DELAY,
  MOVE_ANIMATION_DURATION,
  CAPTURE_ANIMATION_DURATION,
  PROMOTION_ANIMATION_DURATION,
  POST_ANIMATION_SETTLE_DELAY,
} from '@/lib/animationConstants'

interface AnimatingPiece {
  from: Position
  to: Position
}

/** Promise-based delay that rejects on AbortSignal abort. */
function cancellableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** Creates a game state with status='setup' for the welcome screen. */
function createSetupState(mode: GameMode = 'pvc', difficulty: Difficulty = 'medium'): GameState {
  return {
    ...createInitialGameState(mode, difficulty),
    status: 'setup',
  }
}

export function useChessGame(initialDifficulty: Difficulty = 'medium') {
  const [gameState, setGameState] = useState<GameState>(() =>
    createSetupState('pvc', initialDifficulty)
  )
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([])

  // Animation state
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null)
  const [capturedPiece, setCapturedPiece] = useState<Position | null>(null)
  const [promotedPiece, setPromotedPiece] = useState<Position | null>(null)

  const aiMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiMoveScheduledRef = useRef(false)
  const animationAbortRef = useRef<AbortController | null>(null)

  const cancelAnimations = useCallback(() => {
    if (animationAbortRef.current) {
      animationAbortRef.current.abort()
      animationAbortRef.current = null
    }
    if (aiMoveTimeoutRef.current) {
      clearTimeout(aiMoveTimeoutRef.current)
      aiMoveTimeoutRef.current = null
    }
    aiMoveScheduledRef.current = false
    setIsAnimating(false)
    setAnimatingPiece(null)
    setCapturedPiece(null)
    setPromotedPiece(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationAbortRef.current) animationAbortRef.current.abort()
      if (aiMoveTimeoutRef.current) clearTimeout(aiMoveTimeoutRef.current)
    }
  }, [])

  // Auto-save game state when playing
  useEffect(() => {
    if (gameState.status === 'playing') {
      saveGame(gameState)
    } else if (gameState.status === 'won' || gameState.status === 'draw') {
      clearSavedGame()
    }
  }, [gameState])

  /**
   * Execute a move with animation sequence
   */
  const executeAnimatedMove = useCallback(
    async (
      move: ValidMove,
      signal: AbortSignal
    ): Promise<void> => {
      // Animate piece movement
      setAnimatingPiece({
        from: move.from,
        to: move.to,
      })

      if (move.isCapture) {
        // For en passant, captured piece is on a different square
        if (move.isEnPassant) {
          setCapturedPiece({ row: move.from.row, col: move.to.col })
        } else {
          setCapturedPiece(move.to)
        }
      }

      // Wait for move animation
      await cancellableDelay(MOVE_ANIMATION_DURATION, signal)

      if (move.isCapture) {
        await cancellableDelay(CAPTURE_ANIMATION_DURATION / 2, signal)
        setCapturedPiece(null)
      }

      setAnimatingPiece(null)

      // Promotion animation
      if (move.isPromotion) {
        setPromotedPiece(move.to)
        await cancellableDelay(PROMOTION_ANIMATION_DURATION, signal)
        setPromotedPiece(null)
      }
    },
    []
  )

  // Handle AI move when it's AI's turn (Player 2 = Black)
  useEffect(() => {
    if (
      gameState.currentPlayer === 2 &&
      gameState.status === 'playing' &&
      gameState.mode === 'pvc' &&
      !gameState.pendingPromotion &&
      !isAnimating &&
      !aiMoveScheduledRef.current
    ) {
      aiMoveScheduledRef.current = true
      const abortController = new AbortController()
      animationAbortRef.current = abortController

      aiMoveTimeoutRef.current = setTimeout(async () => {
        try {
          const aiMove = getAIMove(gameState, 2, gameState.difficulty)

          if (aiMove) {
            setIsAnimating(true)

            await executeAnimatedMove(aiMove, abortController.signal)
            await cancellableDelay(POST_ANIMATION_SETTLE_DELAY, abortController.signal)

            setGameState(prevState => {
              try {
                const nextState = computeNextGameState(prevState, aiMove)
                return {
                  ...nextState,
                  undoState: nextState.status !== 'playing' ? null : prevState.undoState,
                }
              } catch (e) {
                console.warn('chess: failed to apply AI move', e)
                return prevState
              }
            })

            setIsAnimating(false)
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setIsAnimating(false)
        } finally {
          aiMoveScheduledRef.current = false
        }
      }, AI_MOVE_DELAY)
    }

    return () => {
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current)
        aiMoveTimeoutRef.current = null
      }
    }
  }, [
    gameState.currentPlayer,
    gameState.status,
    gameState.mode,
    gameState.board,
    gameState.difficulty,
    gameState.pendingPromotion,
    isAnimating,
    executeAnimatedMove,
    gameState,
  ])

  /**
   * Handle promotion choice from dialog
   */
  const handlePromotionChoice = useCallback(
    (promotedTo: PromotionPiece) => {
      if (!gameState.pendingPromotion) return

      const { from, to } = gameState.pendingPromotion

      // Find the matching promotion move
      const validMovesForPiece = getValidMovesForPiece(
        gameState.board, from, gameState.castlingRights, gameState.enPassantSquare
      )
      const move = validMovesForPiece.find(
        m => m.to.row === to.row && m.to.col === to.col && m.isPromotion && m.promotedTo === promotedTo
      )

      if (!move) return

      setGameState(prevState => {
        try {
          const nextState = computeNextGameState(prevState, move)
          const undoState: UndoState = {
            board: prevState.board,
            currentPlayer: prevState.currentPlayer,
            lastMove: prevState.lastMove,
            whiteCount: prevState.whiteCount,
            blackCount: prevState.blackCount,
            validMoves: prevState.validMoves,
            castlingRights: prevState.castlingRights,
            enPassantSquare: prevState.enPassantSquare,
            halfmoveClock: prevState.halfmoveClock,
            fullmoveNumber: prevState.fullmoveNumber,
            isInCheck: prevState.isInCheck,
          }
          return {
            ...nextState,
            pendingPromotion: null,
            undoState: nextState.status !== 'playing' ? null : undoState,
          }
        } catch (e) {
          console.warn('chess: failed to apply promotion move', e)
          return { ...prevState, pendingPromotion: null }
        }
      })
    },
    [gameState.pendingPromotion, gameState.board, gameState.castlingRights, gameState.enPassantSquare]
  )

  /**
   * Handles clicking on a square
   */
  const handleSquareClick = useCallback(
    async (row: number, col: number) => {
      if (isAnimating || gameState.status !== 'playing' || gameState.pendingPromotion) return

      // In PvC mode, only allow player 1 to click
      if (gameState.mode === 'pvc' && gameState.currentPlayer !== 1) return

      const piece = gameState.board[row][col]

      // If clicking on current player's piece, select it
      if (piece && piece.player === gameState.currentPlayer) {
        const validMoves = getValidMovesForPiece(
          gameState.board, { row, col }, gameState.castlingRights, gameState.enPassantSquare
        )

        if (validMoves.length > 0) {
          setSelectedPiece({ row, col })
          // Deduplicate destinations (promotions create multiple moves to same square)
          const seen = new Set<string>()
          const uniqueDestinations: Position[] = []
          for (const m of validMoves) {
            const key = `${m.to.row},${m.to.col}`
            if (!seen.has(key)) {
              seen.add(key)
              uniqueDestinations.push(m.to)
            }
          }
          setHighlightedSquares(uniqueDestinations)
          return
        }
      }

      // If a piece is selected and clicking on a valid destination
      if (selectedPiece) {
        const validMovesForSelected = getValidMovesForPiece(
          gameState.board, selectedPiece, gameState.castlingRights, gameState.enPassantSquare
        )
        const validMoveToSquare = validMovesForSelected.filter(
          m => m.to.row === row && m.to.col === col
        )

        if (validMoveToSquare.length > 0) {
          // Check if this is a promotion move (multiple options)
          const isPromotion = validMoveToSquare[0].isPromotion

          if (isPromotion) {
            // Show promotion dialog
            setGameState(prevState => ({
              ...prevState,
              pendingPromotion: {
                from: selectedPiece,
                to: { row, col },
                player: gameState.currentPlayer,
              },
            }))
            setSelectedPiece(null)
            setHighlightedSquares([])
            return
          }

          // Non-promotion move - execute with animation
          const validMove = validMoveToSquare[0]
          const abortController = new AbortController()
          animationAbortRef.current = abortController
          setIsAnimating(true)
          setSelectedPiece(null)
          setHighlightedSquares([])

          try {
            await executeAnimatedMove(validMove, abortController.signal)

            setGameState(prevState => {
              try {
                const nextState = computeNextGameState(prevState, validMove)
                const undoState: UndoState = {
                  board: prevState.board,
                  currentPlayer: prevState.currentPlayer,
                  lastMove: prevState.lastMove,
                  whiteCount: prevState.whiteCount,
                  blackCount: prevState.blackCount,
                  validMoves: prevState.validMoves,
                  castlingRights: prevState.castlingRights,
                  enPassantSquare: prevState.enPassantSquare,
                  halfmoveClock: prevState.halfmoveClock,
                  fullmoveNumber: prevState.fullmoveNumber,
                  isInCheck: prevState.isInCheck,
                }
                return {
                  ...nextState,
                  undoState: nextState.status !== 'playing' ? null : undoState,
                }
              } catch (e) {
                console.warn('chess: failed to apply player move', e)
                return prevState
              }
            })

            setIsAnimating(false)
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return
            setIsAnimating(false)
          }
        } else {
          // Clicked on invalid square, deselect
          setSelectedPiece(null)
          setHighlightedSquares([])
        }
      }
    },
    [
      gameState.board,
      gameState.status,
      gameState.currentPlayer,
      gameState.mode,
      gameState.pendingPromotion,
      gameState.castlingRights,
      gameState.enPassantSquare,
      selectedPiece,
      isAnimating,
      executeAnimatedMove,
    ]
  )

  const startNewGame = useCallback(() => {
    cancelAnimations()
    setGameState(createInitialGameState(gameState.mode, gameState.difficulty))
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [gameState.difficulty, gameState.mode, cancelAnimations])

  const startGame = useCallback((mode: GameMode, difficulty: Difficulty) => {
    cancelAnimations()
    setGameState(createInitialGameState(mode, difficulty))
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [cancelAnimations])

  const returnToSetup = useCallback(() => {
    cancelAnimations()
    setGameState(prevState => createSetupState(prevState.mode, prevState.difficulty))
    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [cancelAnimations])

  const resumeGame = useCallback(() => {
    const saved = loadSavedGame()
    if (saved && saved.status === 'playing') {
      cancelAnimations()
      setGameState(saved)
      setSelectedPiece(null)
      setHighlightedSquares([])
    }
  }, [cancelAnimations])

  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setGameState(prevState => ({ ...prevState, difficulty: newDifficulty }))
  }, [])

  const changeMode = useCallback((newMode: GameMode) => {
    setGameState(prevState => ({ ...prevState, mode: newMode }))
  }, [])

  const resign = useCallback(() => {
    if (gameState.status !== 'playing') return
    if (!window.confirm('Are you sure you want to resign?')) return
    cancelAnimations()
    setSelectedPiece(null)
    setHighlightedSquares([])
    const opponent: 1 | 2 = gameState.currentPlayer === 1 ? 2 : 1
    setGameState(prevState => ({
      ...prevState,
      status: 'won' as const,
      winner: opponent,
      undoState: null,
    }))
  }, [gameState.status, gameState.currentPlayer, cancelAnimations])

  const offerDraw = useCallback(() => {
    if (gameState.status !== 'playing') return
    if (gameState.mode !== 'pvp') return
    if (!window.confirm('Offer a draw?')) return
    cancelAnimations()
    setSelectedPiece(null)
    setHighlightedSquares([])
    setGameState(prevState => ({
      ...prevState,
      status: 'draw' as const,
      winner: null,
      drawReason: 'agreement' as const,
      undoState: null,
    }))
  }, [gameState.status, gameState.mode, cancelAnimations])

  const undoMove = useCallback(() => {
    if (isAnimating) return
    cancelAnimations()

    setGameState(prevState => {
      if (!prevState.undoState) return prevState
      if (prevState.status !== 'playing') return prevState
      if (prevState.mode === 'pvc' && prevState.currentPlayer !== 1) return prevState

      const { undoState } = prevState
      const movesToRemove = prevState.mode === 'pvc' ? 2 : 1
      const newMoveHistory = prevState.moveHistory.slice(0, -movesToRemove)
      const newLastMove = newMoveHistory.length > 0 ? newMoveHistory[newMoveHistory.length - 1] : undefined

      // Recompute valid moves for the restored position
      const restoredValidMoves = getAllValidMoves(
        undoState.board, undoState.currentPlayer, undoState.castlingRights, undoState.enPassantSquare
      )

      return {
        ...prevState,
        board: undoState.board,
        currentPlayer: undoState.currentPlayer,
        lastMove: newLastMove,
        whiteCount: undoState.whiteCount,
        blackCount: undoState.blackCount,
        validMoves: restoredValidMoves,
        castlingRights: undoState.castlingRights,
        enPassantSquare: undoState.enPassantSquare,
        halfmoveClock: undoState.halfmoveClock,
        fullmoveNumber: undoState.fullmoveNumber,
        isInCheck: undoState.isInCheck,
        moveHistory: newMoveHistory,
        undoState: null,
        pendingPromotion: null,
      }
    })

    setSelectedPiece(null)
    setHighlightedSquares([])
  }, [isAnimating, cancelAnimations])

  const isHighlighted = useCallback(
    (row: number, col: number): boolean => {
      return highlightedSquares.some(sq => sq.row === row && sq.col === col)
    },
    [highlightedSquares]
  )

  const isPieceSelected = useCallback(
    (row: number, col: number): boolean => {
      return selectedPiece !== null && selectedPiece.row === row && selectedPiece.col === col
    },
    [selectedPiece]
  )

  const canUndo =
    gameState.undoState !== null &&
    gameState.status === 'playing' &&
    !isAnimating &&
    !gameState.pendingPromotion &&
    (gameState.mode === 'pvp' || gameState.currentPlayer === 1)

  return {
    gameState,
    selectedPiece,
    isAnimating,
    highlightedSquares,
    animatingPiece,
    capturedPiece,
    promotedPiece,
    handleSquareClick,
    handlePromotionChoice,
    startNewGame,
    startGame,
    returnToSetup,
    resumeGame,
    changeDifficulty,
    changeMode,
    undoMove,
    resign,
    offerDraw,
    isHighlighted,
    isPieceSelected,
    canUndo,
    hasSavedGame,
  }
}
