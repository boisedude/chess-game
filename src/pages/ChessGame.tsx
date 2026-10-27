/**
 * ChessGame Page
 *
 * Top-level page component. Composes all hooks and UI components.
 * Responsibilities:
 * - Wires useChessGame (state) with useLeaderboard, useAchievements, useGameHistory
 * - Plays sound effects in response to game state changes (moves, game end, achievements)
 * - Handles game-end side effects: stats recording, Bentley API calls, achievement checks
 * - Manages dialog visibility (victory, leaderboard, achievements, history, tutorial, promotion)
 * - Keyboard shortcut: U key for undo
 * - Tutorial auto-shows on first visit (after game starts, not during setup)
 *
 * Game end handling uses prevStatusRef + gameEndHandledRef to fire side effects
 * exactly once per game transition from 'playing' to 'won'/'draw'.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Board } from '@/components/Board'
import { GameControls } from '@/components/GameControls'
import { VictoryDialog } from '@/components/VictoryDialog'
import { LeaderboardDialog } from '@/components/LeaderboardDialog'
import { Tutorial } from '@/components/Tutorial'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { AudioControls } from '@/components/AudioControls'
import { AchievementNotification } from '@/components/AchievementNotification'
import { AchievementsDialog } from '@/components/AchievementsDialog'
import { GameHistoryDialog } from '@/components/GameHistoryDialog'
import { PromotionDialog } from '@/components/PromotionDialog'
import { CapturedPieces } from '@/components/CapturedPieces'
import { MoveNotation } from '@/components/MoveNotation'
import { SettingsDialog } from '@/components/SettingsDialog'
import { Button } from '@/components/ui/button'
import { OpponentChip } from '@/components/OpponentChip'
import { ArrowLeftIcon, HelpIcon } from '@shared/icons'
import { useChessGame } from '@/hooks/useChessGame'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useGameAudio } from '@/hooks/useGameAudio'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'
import { useBentleyStats } from '@/hooks/useBentleyStats'
import { useAchievements } from '@/hooks/useAchievements'
import type { AchievementContext } from '@/hooks/useAchievements'
import { useGameHistory } from '@/hooks/useGameHistory'
import { useGameSettings } from '@/hooks/useGameSettings'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { findKing } from '@/lib/chessRules'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { PROMOTION_SOUND_DELAY_MS } from '@/lib/gameConstants'
import type { Difficulty } from '@/types/chess.types'

/** Read ?character= URL parameter and map to difficulty level */
function getInitialDifficultyFromUrl(): Difficulty {
  try {
    const params = new URLSearchParams(window.location.search)
    const characterId = params.get('character')
    if (characterId === 'bella') return 'easy'
    if (characterId === 'bentley') return 'hard'
    if (characterId === 'coop') return 'medium'
  } catch { /* SSR safety */ }
  return 'medium'
}

/** Delay before showing tutorial on first visit (ms) */
const TUTORIAL_SHOW_DELAY_MS = 500

export function ChessGame() {
  const urlDifficulty = getInitialDifficultyFromUrl()

  const {
    gameState,
    isAnimating,
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
    hasSavedGame: hasSaved,
  } = useChessGame(urlDifficulty)

  // Single source of truth: the opponent shown is derived from the difficulty the AI plays.
  const { character } = useCharacterSelection(gameState.difficulty)
  const { recordBentleyWin: recordLocalBentleyWin, recordBentleyLoss: recordLocalBentleyLoss, recordBentleyDraw } = useBentleyStats()
  const { stats, recordWin, recordLoss, recordDraw, updatePlayerName, resetStats } = useLeaderboard()
  const { isMuted: isSfxMuted, toggleMute: toggleSfxMute, playPieceMove, playVictory, playDefeat, playDraw, playCapture, playPromotion, playAchievementUnlock, playCheck, playCastling } = useGameAudio()
  const { isMusicMuted, toggleMusicMute } = useBackgroundMusic(gameState.status === 'playing')
  const { achievements, checkAchievements, recentlyUnlocked, clearRecentlyUnlocked } = useAchievements()
  const { history: gameHistory, addRecord: addGameRecord, clearHistory: clearGameHistory } = useGameHistory()
  const { settings, updateSetting, resetSettings } = useGameSettings()
  const { isReducedMotion, toggleReducedMotion } = useReducedMotion()

  const [victoryDialogDismissed, setVictoryDialogDismissed] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const gameStartTimeRef = useRef<number>(0)
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TUTORIAL_COMPLETED) === 'true'
    } catch {
      console.warn('chess: localStorage unavailable')
      return false
    }
  })
  const prevStatusRef = useRef(gameState.status)
  const gameEndHandledRef = useRef(false)

  const isPvP = gameState.mode === 'pvp'
  const isSetup = gameState.status === 'setup'

  // Compute check square for board display
  const checkSquare =
    gameState.isInCheck && gameState.status === 'playing'
      ? findKing(gameState.board, gameState.currentPlayer)
      : null

  // Show tutorial on first visit (only after game starts, not during setup)
  useEffect(() => {
    // Never auto-open when launched from the arcade with ?character=, which
    // picked the opponent already and expects play to start at once.
    let launchedFromArcade = false
    try {
      launchedFromArcade = new URLSearchParams(window.location.search).has('character')
    } catch {
      launchedFromArcade = false
    }
    if (!hasCompletedTutorial && !launchedFromArcade && gameState.status === 'playing') {
      const timer = setTimeout(() => {
        setShowTutorial(true)
      }, TUTORIAL_SHOW_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedTutorial, gameState.status])

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    setHasCompletedTutorial(true)
    try {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_COMPLETED, 'true')
    } catch {
      console.warn('chess: localStorage unavailable')
    }
  }, [])

  // Track game start time for duration calculation
  useEffect(() => {
    if (gameState.status === 'playing' && gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now()
    } else if (gameState.status === 'setup') {
      gameStartTimeRef.current = 0
    }
  }, [gameState.status])

  // Derive whether to show victory dialog from game state
  // Don't show during setup or while animations are still running
  const showVictoryDialog =
    gameState.status !== 'playing' &&
    gameState.status !== 'setup' &&
    !isAnimating &&
    !victoryDialogDismissed

  // Handle game end side effects (sounds, stats recording)
  useEffect(() => {
    const prevStatus = prevStatusRef.current

    if (prevStatus === 'playing' && gameState.status !== 'playing' && gameState.status !== 'setup' && !gameEndHandledRef.current) {
      gameEndHandledRef.current = true

      // Calculate captures
      const totalCaptures = gameState.moveHistory.reduce(
        (acc, move) => acc + (move.isCapture ? 1 : 0),
        0
      )

      // Calculate margin
      const margin = Math.abs(gameState.whiteCount - gameState.blackCount)

      // Perfect game check (won without losing any pieces)
      const isPerfect =
        (gameState.winner === 1 && gameState.whiteCount === 16) ||
        (gameState.winner === 2 && gameState.blackCount === 16)

      if (gameState.status === 'won') {
        if (gameState.winner === 1) {
          // Player wins (or White wins in PvP)
          playVictory()
          if (!isPvP) {
            recordWin(margin, totalCaptures, isPerfect)

            if (gameState.difficulty === 'hard') {
              recordLocalBentleyWin(margin, totalCaptures, isPerfect)
            }
          }
        } else if (gameState.winner === 2) {
          // AI wins (or Black wins in PvP)
          if (isPvP) {
            playVictory()
          } else {
            playDefeat()
            recordLoss(totalCaptures)

            if (gameState.difficulty === 'hard') {
              recordLocalBentleyLoss(margin, totalCaptures)
            }
          }
        }
      } else if (gameState.status === 'draw') {
        playDraw()
        if (!isPvP) {
          recordDraw(totalCaptures)

          if (gameState.difficulty === 'hard') {
            recordBentleyDraw(totalCaptures)
          }
        }
      }

      // Record game history
      const duration = gameStartTimeRef.current > 0
        ? Math.round((Date.now() - gameStartTimeRef.current) / 1000)
        : 0
      const result = gameState.status === 'draw'
        ? 'draw'
        : gameState.winner === 1 ? 'win' : 'loss'
      addGameRecord({
        date: Date.now(),
        mode: gameState.mode,
        difficulty: gameState.difficulty,
        result,
        winner: gameState.winner,
        moveCount: gameState.moveHistory.length,
        whiteCount: gameState.whiteCount,
        blackCount: gameState.blackCount,
        duration,
      })
      gameStartTimeRef.current = 0

      // Check achievements (only applies in PvC mode)
      if (!isPvP) {
        const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1]
        const lastMoveWasKnightCheckmate = !!(
          lastMove &&
          lastMove.isCheckmate &&
          lastMove.piece === 'knight'
        )

        const achievementContext: AchievementContext = {
          winner: gameState.winner,
          playerIs: 1,
          difficulty: gameState.difficulty,
          mode: gameState.mode,
          moveCount: gameState.moveHistory.length,
          whiteCount: gameState.whiteCount,
          blackCount: gameState.blackCount,
          hadQueenCaptured: gameState.hadQueenCaptured,
          promotedPawnCount: gameState.promotedPawnCount,
          castledThisGame: gameState.castledThisGame,
          usedEnPassant: gameState.usedEnPassant,
          wasDownByMaterial: gameState.wasDownByMaterial,
          lastMoveWasKnightCheckmate,
          currentWinStreak: stats.winStreak,
          totalGamesPlayed: stats.totalGames + 1,
        }
        checkAchievements(achievementContext)
      }
    }

    prevStatusRef.current = gameState.status
  }, [gameState.status, gameState.winner, gameState.difficulty, gameState.whiteCount, gameState.blackCount, gameState.moveHistory, gameState.mode, gameState.hadQueenCaptured, gameState.promotedPawnCount, gameState.castledThisGame, gameState.usedEnPassant, gameState.wasDownByMaterial, isPvP, playVictory, playDefeat, playDraw, recordWin, recordLoss, recordDraw, recordLocalBentleyWin, recordLocalBentleyLoss, recordBentleyDraw, addGameRecord, checkAchievements, stats])

  // Play sound when moves are made (differentiated by move type)
  useEffect(() => {
    if (gameState.lastMove) {
      const move = gameState.lastMove
      if (move.isCastling) {
        playCastling()
      } else if (move.isCapture) {
        playCapture()
      } else {
        playPieceMove()
      }
      if (move.isPromotion) {
        setTimeout(() => playPromotion(), PROMOTION_SOUND_DELAY_MS)
      }
      if (move.isCheck) {
        setTimeout(() => playCheck(), 100)
      }
    }
  }, [gameState.lastMove, playPieceMove, playCapture, playCastling, playPromotion, playCheck])

  // Play achievement unlock sound
  useEffect(() => {
    if (recentlyUnlocked) {
      playAchievementUnlock()
    }
  }, [recentlyUnlocked, playAchievementUnlock])

  const handleNewGame = useCallback(() => {
    setVictoryDialogDismissed(false)
    gameEndHandledRef.current = false
    startNewGame()
  }, [startNewGame])

  const handleStartGame = useCallback(() => {
    setVictoryDialogDismissed(false)
    gameEndHandledRef.current = false
    gameStartTimeRef.current = Date.now()
    startGame(gameState.mode, gameState.difficulty)
  }, [startGame, gameState.mode, gameState.difficulty])

  const handleResumeGame = useCallback(() => {
    setVictoryDialogDismissed(false)
    gameEndHandledRef.current = false
    gameStartTimeRef.current = Date.now()
    resumeGame()
  }, [resumeGame])

  const handleReturnToSetup = useCallback(() => {
    gameEndHandledRef.current = false
    returnToSetup()
  }, [returnToSetup])

  const handleDifficultyChange = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard') => {
      if (isSetup) {
        changeDifficulty(difficulty)
        return
      }
      if (difficulty === gameState.difficulty) return
      // The opponent cannot change inside a game, so the record stays honest.
      // Switching mid-game ends it (no result is recorded) and starts a fresh one.
      if (
        gameState.status === 'playing' &&
        gameState.moveHistory.length > 0 &&
        !window.confirm('Change opponent? This ends the current game and starts a new one.')
      ) {
        return
      }
      setVictoryDialogDismissed(false)
      gameEndHandledRef.current = false
      gameStartTimeRef.current = Date.now()
      startGame(gameState.mode, difficulty)
    },
    [isSetup, changeDifficulty, startGame, gameState.difficulty, gameState.mode, gameState.status, gameState.moveHistory.length]
  )

  const handleModeChange = useCallback(
    (mode: 'pvp' | 'pvc') => {
      changeMode(mode)
    },
    [changeMode]
  )

  // Keyboard shortcut for undo (U key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if ((event.key === 'u' || event.key === 'U') && canUndo) {
        event.preventDefault()
        undoMove()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, undoMove])

  const opponent = character.name
  const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1]
  const byCheckmate = !!lastMove?.isCheckmate
  const youLabel = isPvP ? 'White' : 'You'
  const themLabel = isPvP ? 'Black' : opponent

  let turnText: string
  if (gameState.status === 'won') {
    const who = isPvP ? (gameState.winner === 1 ? 'White' : 'Black') : gameState.winner === 1 ? 'you' : opponent
    if (byCheckmate) {
      turnText = `Checkmate: ${who === 'you' ? 'you won' : `${who} won`}`
    } else {
      turnText = who === 'you' ? 'You won' : `${who} won`
    }
  } else if (gameState.status === 'draw') {
    turnText = 'Draw'
  } else if (gameState.isInCheck) {
    turnText = 'Check'
  } else if (isPvP) {
    turnText = gameState.currentPlayer === 1 ? "White's turn" : "Black's turn"
  } else {
    turnText = gameState.currentPlayer === 1 ? 'Your turn' : `${opponent} is thinking`
  }
  const turnActive =
    gameState.status !== 'playing' ? 'over' : gameState.currentPlayer === 1 ? 'you' : 'opponent'

  const topBar = (
    <header className="arcade-topbar">
      <div className="flex flex-1 items-center">
        <a
          href="https://www.mcooper.com/arcade/"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon size={18} />
          Arcade
        </a>
      </div>
      <h1 className="arcade-display sr-only text-xl sm:not-sr-only">Chess</h1>
      <div className="flex flex-1 items-center justify-end gap-1">
        {!isSetup && !isPvP && (
          <OpponentChip
            character={character}
            difficulty={gameState.difficulty}
            onDifficultyChange={handleDifficultyChange}
          />
        )}
        <AudioControls
          isSfxMuted={isSfxMuted}
          isMusicMuted={isMusicMuted}
          onToggleSfx={toggleSfxMute}
          onToggleMusic={toggleMusicMute}
        />
        {!isSetup && (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => setShowTutorial(true)}
            aria-label="How to play"
          >
            <HelpIcon />
          </Button>
        )}
      </div>
    </header>
  )

  // Setup / Welcome screen
  if (isSetup) {
    return (
      <div className="arcade-page">
        {topBar}
        <main className="arcade-stage justify-center">
          <WelcomeScreen
            mode={gameState.mode}
            difficulty={gameState.difficulty}
            onModeChange={handleModeChange}
            onDifficultyChange={handleDifficultyChange}
            onStartGame={handleStartGame}
            hasSavedGame={hasSaved()}
            onResumeGame={handleResumeGame}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="arcade-page">
      {topBar}

      <main className="arcade-stage">
        <div className="arcade-score" role="status" aria-live="polite">
          <div>
            <strong>{gameState.whiteCount}</strong>
            {youLabel}
          </div>
          <div className="arcade-turn" data-active={turnActive}>
            {turnText}
          </div>
          <div>
            <strong>{gameState.blackCount}</strong>
            {themLabel}
          </div>
        </div>

        <CapturedPieces
          moveHistory={gameState.moveHistory}
          isPvP={isPvP}
          characterName={character.name}
        />

        <Board
          board={gameState.board}
          onSquareClick={handleSquareClick}
          isHighlighted={isHighlighted}
          isPieceSelected={isPieceSelected}
          disabled={isAnimating || gameState.status !== 'playing' || !!gameState.pendingPromotion}
          lastMove={gameState.lastMove}
          animatingPiece={animatingPiece}
          capturedPiece={capturedPiece}
          promotedPiece={promotedPiece}
          isInCheck={gameState.isInCheck}
          checkSquare={checkSquare}
        />

        {settings.showMoveNotation && <MoveNotation moveHistory={gameState.moveHistory} />}

        <GameControls
          onNewGame={handleNewGame}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowHelp={() => setShowTutorial(true)}
          onShowAchievements={() => setShowAchievements(true)}
          onShowHistory={() => setShowHistory(true)}
          onShowSettings={() => setShowSettings(true)}
          onReturnToSetup={handleReturnToSetup}
          onUndo={undoMove}
          onResign={resign}
          onOfferDraw={offerDraw}
          canUndo={canUndo}
          gameMode={gameState.mode}
          gameStatus={gameState.status}
        />
      </main>

      {gameState.pendingPromotion && (
        <PromotionDialog
          open={!!gameState.pendingPromotion}
          player={gameState.pendingPromotion.player}
          onSelect={handlePromotionChoice}
        />
      )}

      {showVictoryDialog && (
        <VictoryDialog
          open={showVictoryDialog}
          winner={gameState.winner}
          character={character}
          onPlayAgain={handleNewGame}
          onClose={() => setVictoryDialogDismissed(true)}
          whiteCount={gameState.whiteCount}
          blackCount={gameState.blackCount}
          gameMode={gameState.mode}
          drawReason={gameState.drawReason}
          moveHistory={gameState.moveHistory}
        />
      )}

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onUpdateSetting={updateSetting}
        onReset={resetSettings}
        isReducedMotion={isReducedMotion}
        onToggleReducedMotion={toggleReducedMotion}
      />

      {showLeaderboard && (
        <LeaderboardDialog
          open={showLeaderboard}
          stats={stats}
          onClose={() => setShowLeaderboard(false)}
          onUpdatePlayerName={updatePlayerName}
          onResetStats={resetStats}
        />
      )}

      <Tutorial
        open={showTutorial}
        onClose={() => {
          setShowTutorial(false)
          handleTutorialComplete()
        }}
        onComplete={handleTutorialComplete}
      />

      <AchievementsDialog
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
      />

      <GameHistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={gameHistory}
        onClearHistory={clearGameHistory}
      />

      <AchievementNotification
        achievement={recentlyUnlocked ? achievements[recentlyUnlocked] : null}
        onDismiss={clearRecentlyUnlocked}
      />
    </div>
  )
}
