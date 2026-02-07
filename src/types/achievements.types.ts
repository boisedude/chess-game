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
  icon: string
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
  { name: string; description: string; icon: string }
> = {
  first_victory: {
    name: 'First Victory',
    description: 'Win your first game',
    icon: '\u{1F3C6}',
  },
  scholars_mate: {
    name: "Scholar's Mate",
    description: 'Win in 4 moves or fewer',
    icon: '\u{1F393}',
  },
  queen_sacrifice: {
    name: 'Queen Sacrifice',
    description: 'Win after losing your queen',
    icon: '\u{1F451}',
  },
  pawn_promotion: {
    name: 'Promotion Day',
    description: 'Promote a pawn',
    icon: '\u2B06\uFE0F',
  },
  knight_checkmate: {
    name: 'Knight Rider',
    description: 'Deliver checkmate with a knight',
    icon: '\u265E',
  },
  castling_master: {
    name: 'Castle Builder',
    description: 'Castle in a game',
    icon: '\u{1F3F0}',
  },
  en_passant: {
    name: 'En Passant',
    description: 'Capture a pawn en passant',
    icon: '\u{1F47B}',
  },
  flawless_victory: {
    name: 'Flawless Victory',
    description: 'Win without losing any pieces',
    icon: '\u{1F48E}',
  },
  speed_demon: {
    name: 'Speed Demon',
    description: 'Win in under 20 moves',
    icon: '\u{1F4A8}',
  },
  comeback_kid: {
    name: 'Comeback Kid',
    description: 'Win after being down significant material',
    icon: '\u{1F525}',
  },
  beat_bella: {
    name: 'Puppy Power',
    description: 'Beat Bella',
    icon: '\u{1F415}',
  },
  beat_coop: {
    name: 'Arcade Regular',
    description: 'Beat Coop',
    icon: '\u{1F3AE}',
  },
  beat_bentley: {
    name: 'The Impossible',
    description: 'Beat Bentley',
    icon: '\u{1F43A}',
  },
  streak_3: {
    name: 'Hat Trick',
    description: 'Win 3 games in a row',
    icon: '\u{1F3A9}',
  },
  streak_5: {
    name: 'Unstoppable',
    description: 'Win 5 games in a row',
    icon: '\u{1F31F}',
  },
  board_master: {
    name: 'Board Master',
    description: 'Play 50 total games',
    icon: '\u{1F3B2}',
  },
}
