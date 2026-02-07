/**
 * Character Selection Hook
 *
 * Exports: useCharacterSelection(initialDifficulty) -> { character, difficulty, changeCharacter }
 * Maps difficulty to shared character system: easy=Bella, medium=Coop, hard=Bentley.
 */

import { useState, useCallback } from 'react'
import { getCharacterById } from '@shared/characters'
import type { Character, CharacterId } from '@shared/characters'
import type { Difficulty } from '@/types/chess.types'

const difficultyToCharacter: Record<Difficulty, CharacterId> = {
  easy: 'bella',
  medium: 'coop',
  hard: 'bentley',
}

export function useCharacterSelection(initialDifficulty: Difficulty = 'medium') {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty)
  const [character, setCharacter] = useState<Character>(() =>
    getCharacterById(difficultyToCharacter[initialDifficulty])
  )

  const changeCharacter = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    const characterId = difficultyToCharacter[newDifficulty]
    setCharacter(getCharacterById(characterId))
  }, [])

  return {
    character,
    difficulty,
    changeCharacter,
  }
}
