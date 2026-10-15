/**
 * Character Selection Hook
 *
 * Exports: useCharacterSelection(initialDifficulty) -> { character, difficulty }
 * Maps difficulty to shared character system: easy=Bella, medium=Coop, hard=Bentley.
 */

import { getCharacterById } from '@shared/characters'
import type { Character, CharacterId } from '@shared/characters'
import type { Difficulty } from '@/types/chess.types'

const difficultyToCharacter: Record<Difficulty, CharacterId> = {
  easy: 'bella',
  medium: 'coop',
  hard: 'bentley',
}

/** Pure derivation: the character is always the one matching the difficulty in play. */
export function useCharacterSelection(difficulty: Difficulty = 'medium') {
  const character: Character = getCharacterById(difficultyToCharacter[difficulty])
  return { character, difficulty }
}
