/**
 * Timing constants (milliseconds).
 * MOVE_SLIDE_DURATION must match the piece-slide animation in index.css.
 */

export const AI_MOVE_DELAY = 100 // Pause before the opponent starts thinking
export const AI_MIN_THINK_TIME = 600 // A reply never lands sooner than this, even from the opening book
export const MOVE_SLIDE_DURATION = 220 // A piece sliding to its new square
export const POST_ANIMATION_SETTLE_DELAY = 260 // Input stays locked this long after the opponent's move lands
