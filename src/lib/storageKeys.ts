/**
 * Storage Keys
 *
 * All localStorage keys used by the chess game. Prefixed with "chess-" to
 * avoid collisions with other games on the same domain.
 */

export const STORAGE_KEYS = {
  LEADERBOARD: 'chess-leaderboard',
  BENTLEY_STATS: 'chess-bentley-stats',
  AUDIO_MUTED: 'chess-audio-muted',
  MUSIC_MUTED: 'chess-music-muted',
  TUTORIAL_COMPLETED: 'chess-tutorial-completed',
  ACHIEVEMENTS: 'chess-achievements',
  GAME_HISTORY: 'chess-game-history',
  SAVED_GAME: 'chess-saved-game',
  GAME_SETTINGS: 'chess-game-settings',
  REDUCED_MOTION: 'chess-reduced-motion',
} as const
