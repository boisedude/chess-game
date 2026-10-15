/**
 * Achievement System Type Definitions
 *
 * Exports: Achievement, AchievementId, AchievementState, ACHIEVEMENT_DEFINITIONS.
 * 16 achievements total, only checked in PvC mode. unlockedAt=undefined means locked.
 */

export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt?: number
}

export type AchievementId =
  | 'first_victory'
  | 'scholars_mate'
  | 'queen_sacrifice'
  | 'pawn_promotion'
  | 'knight_checkmate'
  | 'castling_master'
  | 'en_passant'
  | 'flawless_victory'
  | 'speed_demon'
  | 'comeback_kid'
  | 'beat_bella'
  | 'beat_coop'
  | 'beat_bentley'
  | 'streak_3'
  | 'streak_5'
  | 'board_master'

export type AchievementState = Record<AchievementId, Achievement>

export const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementId,
  { name: string; description: string }
> = {
  first_victory: {
    name: 'First Victory',
    description: 'Win your first game',
  },
  scholars_mate: {
    name: "Scholar's Mate",
    description: 'Win in 4 moves or fewer',
  },
  queen_sacrifice: {
    name: 'Queen Sacrifice',
    description: 'Win after losing your queen',
  },
  pawn_promotion: {
    name: 'Promotion Day',
    description: 'Promote a pawn',
  },
  knight_checkmate: {
    name: 'Knight Rider',
    description: 'Deliver checkmate with a knight',
  },
  castling_master: {
    name: 'Castle Builder',
    description: 'Castle in a game',
  },
  en_passant: {
    name: 'En Passant',
    description: 'Capture a pawn en passant',
  },
  flawless_victory: {
    name: 'Flawless Victory',
    description: 'Win without losing any pieces',
  },
  speed_demon: {
    name: 'Speed Demon',
    description: 'Win in under 20 moves',
  },
  comeback_kid: {
    name: 'Comeback Kid',
    description: 'Win after being down significant material',
  },
  beat_bella: {
    name: 'Puppy Power',
    description: 'Beat Bella',
  },
  beat_coop: {
    name: 'Arcade Regular',
    description: 'Beat Coop',
  },
  beat_bentley: {
    name: 'The Impossible',
    description: 'Beat Bentley',
  },
  streak_3: {
    name: 'Hat Trick',
    description: 'Win 3 games in a row',
  },
  streak_5: {
    name: 'Unstoppable',
    description: 'Win 5 games in a row',
  },
  board_master: {
    name: 'Board Master',
    description: 'Play 50 total games',
  },
}
