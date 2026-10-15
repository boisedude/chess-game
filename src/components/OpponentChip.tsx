/**
 * Opponent chip: avatar ringed in the character colour, name beside it.
 * It is the trigger of the opponent select.
 */

import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select'
import type { Difficulty } from '@/types/chess.types'
import type { Character } from '@shared/characters'

interface OpponentChipProps {
  character: Character
  difficulty: Difficulty
  onDifficultyChange: (difficulty: Difficulty) => void
}

const OPTIONS: { value: Difficulty; name: string; level: string }[] = [
  { value: 'easy', name: 'Bella', level: 'Easy' },
  { value: 'medium', name: 'Coop', level: 'Medium' },
  { value: 'hard', name: 'Bentley', level: 'Hard' },
]

export function OpponentChip({ character, difficulty, onDifficultyChange }: OpponentChipProps) {
  return (
    <Select value={difficulty} onValueChange={(value) => onDifficultyChange(value as Difficulty)}>
      <SelectTrigger
        className="arcade-chip w-auto shrink-0 gap-2 [&>span]:line-clamp-none"
        style={{ minHeight: 44 }}
        data-character={character.id}
        aria-label={`Opponent: ${character.name}. Change opponent`}
      >
        <img src={character.avatar} alt="" />
        <span>{character.name}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="min-h-11 py-2.5">
            {option.name}
            <span className="ml-2 text-muted-foreground">{option.level}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
