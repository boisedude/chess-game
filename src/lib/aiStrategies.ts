/**
 * Chess opponents.
 *
 * Exports: getAIMove(state, player, difficulty, options?) -> ValidMove | null
 * All three play through the engine in engine.ts:
 * - Easy (Bella): three moves in ten are random; otherwise a one-move lookahead
 *   that picks loosely among the moves it likes.
 * - Medium (Coop): opening book, then a fixed three-move search that picks
 *   among near-equal moves.
 * - Hard (Bentley): opening book, then iterative deepening for as long as the
 *   time budget allows.
 */

import type { Player, Difficulty, ValidMove, GameState } from '@/types/chess.types'
import { getAllValidMoves } from './chessRules'
import { findBestMove, type EngineOptions } from './engine'
import { getBookMove } from './openingBook'

/** Bentley's thinking time per move, in milliseconds. */
export const HARD_TIME_MS = 700
const EASY_RANDOM_CHANCE = 0.3
const MEDIUM_BOOK_PLIES = 6
const MEDIUM_BOOK_SKIP_CHANCE = 0.3

export interface AIOptions {
  /** Overrides Bentley's time budget (hints and the main-thread fallback use less). */
  timeMs?: number
  /** Skip the opening book. */
  noBook?: boolean
}

function engineOptions(difficulty: Difficulty, options: AIOptions): EngineOptions {
  if (difficulty === 'easy') return { maxDepth: 1, pickMargin: 150 }
  if (difficulty === 'medium') return { maxDepth: 3, pickMargin: 25 }
  return { timeMs: options.timeMs ?? HARD_TIME_MS }
}

/** Get AI move for the given game state. Returns null if no moves available. */
export function getAIMove(
  state: GameState,
  player: Player,
  difficulty: Difficulty,
  options: AIOptions = {},
): ValidMove | null {
  const moves = getAllValidMoves(state.board, player, state.castlingRights, state.enPassantSquare)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  if (difficulty === 'easy' && Math.random() < EASY_RANDOM_CHANCE) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  if (difficulty !== 'easy' && !options.noBook && state.currentPlayer === player) {
    // Coop follows the book for three full moves, then starts to wander off it.
    const skipBook =
      difficulty === 'medium' &&
      state.moveHistory.length >= MEDIUM_BOOK_PLIES &&
      Math.random() < MEDIUM_BOOK_SKIP_CHANCE
    if (!skipBook) {
      const bookMove = getBookMove(state)
      if (bookMove) return bookMove
    }
  }

  const result = findBestMove(state, player, engineOptions(difficulty, options))
  if (!result) return moves[0]
  const chosen = moves.find(
    (m) =>
      m.from.row === result.from.row &&
      m.from.col === result.from.col &&
      m.to.row === result.to.row &&
      m.to.col === result.to.col &&
      (m.isPromotion ? m.promotedTo === result.promotedTo : true),
  )
  // The rules module is the authority on legality; never hand back a move it did not list.
  return chosen ?? moves[0]
}
