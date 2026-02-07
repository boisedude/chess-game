# Chess Game - AI Agent Development Guide

> This file is optimized for AI agent consumption. It provides the context needed to work on this codebase effectively.

## Quick Reference

```bash
npm run dev          # Dev server on port 3003
npm run build        # TypeScript check + production build
npm run test         # Jest unit tests (6 test files, 231 tests)
npm run test:watch   # Jest watch mode
npm run test:e2e     # Playwright E2E tests (chromium, port 3003)
npm run lint         # ESLint
npm run type-check   # TypeScript only
```

## Architecture Overview

Static SPA chess game: React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS + shadcn/ui. No backend. HashRouter for static deployment at `www.mcooper.com/chess`.

### Core Data Flow

```
User Click → useChessGame (hook) → chessRules (engine) → Board re-render
                  ↓
           AI turn? → aiStrategies (minimax) → animated move → state update
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/chessRules.ts` | Pure game rules engine. All chess logic lives here. | ~840 |
| `src/lib/aiStrategies.ts` | Minimax AI with alpha-beta pruning, quiescence search, transposition table, opening book, 3 difficulty levels. | ~766 |
| `src/lib/openingBook.ts` | Opening book tree (~15 lines, weighted moves) with lookup logic. | ~708 |
| `src/lib/moveNotation.ts` | Algebraic notation converter for move history display. | ~70 |
| `src/hooks/useChessGame.ts` | React state management, animation sequencing, AI triggering. | ~554 |
| `src/types/chess.types.ts` | All TypeScript type definitions. | ~175 |
| `src/pages/ChessGame.tsx` | Top-level page. Wires hooks, dialogs, sounds, achievements. | ~611 |
| `src/lib/gameSerialization.ts` | Save/load game state to localStorage with validation. | ~137 |

### Board Orientation

- Row 0 = Black back rank (rank 8), Row 7 = White back rank (rank 1)
- Player 1 = White (human), Player 2 = Black (AI)
- `BOARD_SIZE = 8`, Board is `CellValue[][]` where `CellValue = Piece | null`

### Rules Engine API (`chessRules.ts`)

```typescript
createInitialBoard()                    // Standard starting position
createInitialGameState(mode, difficulty) // Full GameState with valid moves
getValidMovesForPiece(board, pos, castlingRights, enPassantSquare) // Legal moves for one piece
getAllValidMoves(board, player, castlingRights, enPassantSquare)    // All legal moves
applyMove(board, move)                  // Execute move, return new board
computeNextGameState(state, move)       // Full state transition (the main function)
checkGameOver(board, player, castling, ep, halfmove, history)      // Win/draw detection
hashBoard(board, player, castling, ep)  // Position hash for repetition detection
isInCheck(board, player)                // Check detection
isSquareAttacked(board, square, byPlayer) // Attack detection
findKing(board, player)                  // Locate king position
countPieces(board, player)               // Count pieces for a player
getMaterialValue(board, player)          // Total material in centipawns
updateCastlingRights(rights, board, move) // Castling rights after a move
getNewEnPassant(board, move)              // En passant square after a move
```

### AI Engine API (`aiStrategies.ts`)

```typescript
getAIMove(state, player, difficulty) → ValidMove | null
```

Three difficulty levels:
- **Easy (Bella)**: depth 1, 30% random moves, material-only evaluation, no opening book
- **Medium (Coop)**: depth 2, 5% random, material + basic position + mobility, opening book (faithful for moves 1-3, 70% for moves 4+)
- **Hard (Bentley)**: depth 3, alpha-beta + move ordering + quiescence search + transposition table, full positional evaluation (material, position, mobility, bishop pair, castling, king safety, pawn structure, rook on open files), always follows opening book

### Special Chess Rules Implemented

All standard chess rules are fully implemented:
- Castling (kingside/queenside, both colors, all validation)
- En passant (tracking, capture, immediate-only)
- Pawn promotion (4 options, dialog for human, auto-queen for AI)
- Check/checkmate/stalemate detection
- Draw: 50-move rule, 3-fold repetition, insufficient material

### Game State Shape

The `GameState` interface is the central data structure. Key fields:
- `board`, `currentPlayer`, `status` ('setup'|'playing'|'won'|'draw')
- `castlingRights`, `enPassantSquare`, `halfmoveClock`, `fullmoveNumber`
- `moveHistory`, `validMoves`, `positionHistory` (for repetition)
- `pendingPromotion` (non-null when awaiting human promotion choice)
- `undoState` (snapshot for single-level undo)
- Achievement tracking: `hadQueenCaptured`, `promotedPawnCount`, `castledThisGame`, `usedEnPassant`, `wasDownByMaterial`

## Component Hierarchy

```
App (ErrorBoundary)
└── ChessGame (page)
    ├── WelcomeScreen (setup mode)
    │   └── MiniChessboard, character cards
    ├── Board
    │   └── Cell (x64)
    │       └── Piece
    ├── CapturedPieces (x2, per player)
    ├── MoveNotation
    ├── GameControls
    ├── PromotionDialog
    ├── VictoryDialog
    │   └── Confetti
    ├── SettingsDialog
    ├── Tutorial (9 steps with SVG diagrams)
    ├── LeaderboardDialog
    ├── AchievementsDialog
    ├── GameHistoryDialog
    ├── AudioControls
    └── AchievementNotification
```

## Hooks

| Hook | Purpose |
|------|---------|
| `useChessGame` | Primary game state, moves, animations, AI, undo, save/resume |
| `useLeaderboard` | Win/loss/draw stats, persisted to localStorage |
| `useAchievements` | 16 achievements, unlock detection, persistence |
| `useGameHistory` | Game records (last 100), persistence |
| `useGameAudio` | Sound effects (move, capture, check, castling, victory, defeat) |
| `useBackgroundMusic` | Background music loop |
| `useCharacterSelection` | AI opponent character (Bella/Coop/Bentley) |
| `useBentleyStats` | Local Bentley win/loss tracking |
| `useMainSiteBentleyStats` | Remote Bentley stats API |
| `useGameSettings` | Persisted settings (animation speed, celebrations, move notation) |
| `useReducedMotion` | OS prefers-reduced-motion detection + manual override |
| `useSharedAudioContext` | Shared Web Audio context for sound effects and music |

## Testing Strategy

### Unit Tests (6 files, 231 tests)
- `chessRules.test.ts` - Comprehensive rules testing (84 tests)
- `chessRulesExtended.test.ts` - Edge cases, bug fix verification, achievement tracking (33 tests)
- `aiStrategies.test.ts` - AI behavior, difficulty levels, special moves, opening book (26 tests)
- `gameSerialization.test.ts` - Save/load, validation, round-trips (52 tests)
- `moveNotation.test.ts` - Algebraic notation conversion (20 tests)
- `openingBook.test.ts` - Opening book lookup, tree traversal, off-book fallback (16 tests)

### E2E Tests (`e2e/chess.spec.ts`, 31 tests)
- Game setup flow, making moves, AI response
- Undo, new game, mode switching
- Dialog interactions (stats, help, achievements, history)
- Game persistence (resume saved game)

### Running Tests
```bash
npm test                              # All unit tests
npx jest --testPathPatterns=chessRules # Specific test file
npm run test:e2e                      # Playwright (starts dev server)
npm run test:e2e:ui                   # Playwright with UI
```

## Animation System

Animations are CSS-based with JS timing coordination:
- `AI_MOVE_DELAY = 600ms` - Pause before AI moves
- `MOVE_ANIMATION_DURATION = 350ms` - Piece sliding
- `CAPTURE_ANIMATION_DURATION = 400ms` - Captured piece fade
- `PROMOTION_ANIMATION_DURATION = 800ms` - Promotion effect
- `POST_ANIMATION_SETTLE_DELAY = 300ms` - Before showing dialogs

CSS animations defined in `src/index.css`: `piece-slide`, `piece-capture`, `piece-promotion`, `selected-glow`, `valid-move-glow`, `check-pulse`.

Timing constants must stay in sync between `src/lib/animationConstants.ts` and `src/index.css`.

## Path Aliases

- `@/` → `./src/` (game code)
- `@shared/` → `../shared/` (cross-game characters)

## localStorage Keys

All prefixed with `chess-` to avoid collisions. Defined in `src/lib/storageKeys.ts`:
`chess-leaderboard`, `chess-bentley-stats`, `chess-audio-muted`, `chess-music-muted`, `chess-tutorial-completed`, `chess-achievements`, `chess-game-history`, `chess-saved-game`, `chess-game-settings`, `chess-reduced-motion`

## Known Limitations

1. **AI depth**: Hard difficulty uses depth 3 minimax with quiescence search (capture-only continuation up to 8 plies). Transposition table caches positions within each move calculation.
2. **Single-level undo**: Only one undo step. In PvC mode, undo removes 2 moves (player + AI).
3. **Randomness in move selection**: Easy (30%) and medium (5%) have a chance to play a completely random move instead of using minimax. This is intentional for weaker play.
4. **Opening book**: Covers ~15 lines with weighted move selection (Italian, Ruy Lopez, Scotch, Vienna, Petroff, Sicilian Najdorf/Classical/Kan, French Classical/Winawer/Tarrasch/Advance, Caro-Kann, Scandinavian, QGD, QGA, Slav, King's Indian, Nimzo-Indian, Queen's Indian) to depth ~6 moves. No endgame tablebase.
5. **Mobility eval is expensive**: `getAllValidMoves` called twice per leaf node for medium/hard. Performance is acceptable at current depths.

## Common Pitfalls for AI Agents

1. **Board orientation**: Row 0 is the TOP (black's back rank). White pawns move UP (decreasing row numbers). Don't reverse this.
2. **Hash function**: Uses `'n'` for knight (not `'k'`) to distinguish from king. If adding new hash logic, maintain this.
3. **positionHistory**: Seeded with the initial position hash. The array grows by 1 per move. 3-fold repetition counts occurrences in this array.
4. **Castling validation**: Queenside castling checks that b1/b8 is *empty* but does NOT require it to be *unattacked*. This is correct per chess rules.
5. **Animation state**: `isAnimating` prevents user interaction during moves. AI moves are gated by `aiMoveScheduledRef` to prevent double-firing.
6. **Undo state**: Stored before the player's move. In PvC, the AI move effect preserves the existing undoState. After undo, undoState is set to null.

## Shared Resources

- `/shared/characters.ts` - Bella (easy/amber), Coop (medium/blue), Bentley (hard/red)
- `/ArcadeArt/` - Character images (avatar, winImage, loseImage, playAgainImage)
- Import via `@shared/characters`

## Deployment

Static SPA. `npm run build` outputs to `dist/`. Deploy to any static host. Base path is `./` (relative) for subdirectory deployment at `mcooper.com/chess`.

## Related Games

This chess game follows the same architecture as the other games in the collection (mancala, connect4, checkers, othello, tictactoe, gomoku, nine-mens-morris). See the parent `/mnt/d/projects/mygame/CLAUDE.md` for cross-game patterns.
