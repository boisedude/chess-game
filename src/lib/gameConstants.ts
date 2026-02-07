/**
 * Game Constants
 *
 * Centralized named constants for game rules, achievement thresholds, and UI timing.
 * Changing these values affects gameplay balance and UX behavior.
 */

/** Number of pieces each player starts with */
export const INITIAL_PIECE_COUNT = 16

/** Half-moves without capture or pawn move before a draw (50-move rule = 100 half-moves) */
export const DRAW_MOVE_LIMIT = 100

/** Number of times the same position must repeat for a draw */
export const REPETITION_DRAW_COUNT = 3

/** Material deficit threshold (centipawns) for "comeback" achievement tracking */
export const COMEBACK_MATERIAL_DEFICIT = 500

/** Maximum move count to qualify for "speed demon" achievement */
export const SPEED_DEMON_MOVE_LIMIT = 20

/** Maximum move count for "scholar's mate" achievement */
export const SCHOLARS_MATE_MOVE_LIMIT = 8

/** Total games needed for "board master" achievement */
export const BOARD_MASTER_GAME_COUNT = 50

/** Maximum game history records stored in localStorage */
export const MAX_GAME_HISTORY_RECORDS = 100

/** Delay before playing promotion sound after move sound (ms) */
export const PROMOTION_SOUND_DELAY_MS = 150

/** Auto-dismiss delay for achievement notification toast (ms) */
export const ACHIEVEMENT_TOAST_DURATION_MS = 4000

/** Fade-out duration for achievement notification (ms) */
export const ACHIEVEMENT_TOAST_FADE_MS = 300
