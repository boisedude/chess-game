export type CharacterId = 'bella' | 'coop' | 'bentley';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Character {
  id: CharacterId;
  name: string;
  nickname: string;
  difficulty: DifficultyLevel;
  description: string;
  personality: string;
  playingStyle: string;
  backstory: string;

  // Images
  avatar: string;
  winImage: string;  // When character wins
  loseImage: string; // When character loses
  playAgainImage: string;

  // Character voice
  catchphrases: {
    gameStart: string[];
    playerWins: string[];
    characterWins: string[];
    midGame: string[];
  };

  // Stats
  color: string; // Theme color for UI
  emoji: string;
}

export const characters: Record<CharacterId, Character> = {
  bella: {
    id: 'bella',
    name: 'Bella',
    nickname: 'The Playful Pup',
    difficulty: 'easy',
    description: 'Sweet, excitable puppy who\'s still learning the ropes',
    personality: 'Enthusiastic, easily distracted, just wants to have fun',
    playingStyle: 'Makes random moves, gets distracted by virtual squirrels',
    backstory: 'Bentley\'s little sister who just wants to play games and get treats. She\'s learning but mostly here for a good time!',

    avatar: './characters/BellaProfile.png',
    winImage: './characters/BellaWins_ButyouplayedGreat.png',
    loseImage: './characters/Bella_YouWin.png',
    playAgainImage: './characters/Bella_PlayAgain.png',

    catchphrases: {
      gameStart: [
        'Ooh, shiny! Let\'s play!',
        'Is it snack time yet?',
        'Wait, what are we playing again?',
        'This looks fun! I think...'
      ],
      playerWins: [
        'Yay! You won! Can we play fetch now?',
        'You\'re so good at this!',
        'Wow! Teach me how you did that!',
        'That was amazing! *tail wag*'
      ],
      characterWins: [
        'I won?! I WON! *zoomies intensify*',
        'Did I do good? Did I?!',
        'Beginner\'s luck! Wanna go again?',
        'I can\'t believe it! Another round?'
      ],
      midGame: [
        'Ooh, what does this button do?',
        'Is that a squirrel?!',
        'Wait, where did I put that piece?',
        '*gets distracted by own tail*'
      ]
    },

    color: '#F59E0B', // Amber
    emoji: '🐕'
  },

  coop: {
    id: 'coop',
    name: 'Coop',
    nickname: 'The Casual Challenger',
    difficulty: 'medium',
    description: 'Friendly, competitive but fair, enjoys the game',
    personality: 'Laid-back gamer who knows his games but plays for fun',
    playingStyle: 'Solid strategy, makes good moves but not perfect',
    backstory: 'The arcade owner who\'s been gaming his whole life. He loves a good challenge and respects skilled players. Beat him to prove you\'re ready for Bentley!',

    avatar: './characters/ArcadeLogo.png',
    winImage: './characters/coopwins_again.png',
    loseImage: './characters/youbeatcoop.png',
    playAgainImage: './characters/ArcadeLogo.png',

    catchphrases: {
      gameStart: [
        'Let\'s see what you\'ve got!',
        'Good luck out there!',
        'Now we\'re talking!',
        'This should be fun!'
      ],
      playerWins: [
        'Nice game! You\'re getting good at this!',
        'Well played! That was impressive!',
        'You\'ve got skills! Ready for Bentley?',
        'Good match! Want to go again?'
      ],
      characterWins: [
        'Good try! Want to go again?',
        'That was close! You almost had me!',
        'Nice effort! Practice makes perfect!',
        'You\'re improving! Keep it up!'
      ],
      midGame: [
        'Good move!',
        'Interesting strategy...',
        'Now this is getting exciting!',
        'You\'re making me work for this!'
      ]
    },

    color: '#3B82F6', // Blue
    emoji: '🎮'
  },

  bentley: {
    id: 'bentley',
    name: 'Bentley',
    nickname: 'The Mastermind',
    difficulty: 'hard',
    description: 'Calculating, intense, the unbeatable champion',
    personality: 'Ruthless strategist who plays to win',
    playingStyle: 'Perfect strategy, thinks 10 moves ahead, shows no mercy',
    backstory: 'The legendary arcade champion. Nobody beats Bentley... or do they? He\'s been the final boss of Coop\'s Arcade since day one. Can you dethrone him?',

    avatar: './characters/determined_bentley.png',
    winImage: './characters/BentlyWins_YouLoose.png',
    loseImage: './characters/YouWin_BentleyLooses.png',
    playAgainImage: './characters/bently_playagain.png',

    catchphrases: {
      gameStart: [
        'Calculated.',
        'Let\'s get this over with.',
        'Show me what you\'ve got, human.',
        'Don\'t waste my time.'
      ],
      playerWins: [
        'Impossible... you actually... respect.',
        'You\'ve earned this victory.',
        'Impressive. Very impressive.',
        'Perhaps I underestimated you.'
      ],
      characterWins: [
        'Predictable.',
        'Better luck next time, human.',
        'Is that your best?',
        'As expected.'
      ],
      midGame: [
        '*analyzes intensely*',
        'Checkmate... eventually.',
        'I see your strategy.',
        'Too late. I\'m three moves ahead.'
      ]
    },

    color: '#a855f7', // Purple
    emoji: '🐺'
  }
};

// Helper functions
export function getCharacterById(id: CharacterId): Character {
  return characters[id];
}

export function getAllCharacters(): Character[] {
  return Object.values(characters);
}

export function getCharactersByDifficulty(difficulty: DifficultyLevel): Character[] {
  return getAllCharacters().filter(c => c.difficulty === difficulty);
}

export function getRandomCatchphrase(characterId: CharacterId, situation: keyof Character['catchphrases']): string {
  const character = getCharacterById(characterId);
  const phrases = character.catchphrases[situation];
  return phrases[Math.floor(Math.random() * phrases.length)];
}
