# Arcade table: the shared look for every game

Eight games, one table. Each board keeps its own material and its own pieces; everything
around the board is the same across the arcade, so a player moving from chess to mancala
feels they stayed in one room. The tokens and shell classes live in `shared/arcade.css`.

## The one memorable thing

The board. It is the largest element on the page, centred, lit by one soft shadow, sitting
on a dark slate table. Nothing else competes with it: no page gradient, no glow, no
decorative frames, no emoji, no tagline.

## Tokens

Imported from `shared/arcade.css` (shadcn HSL triplets, so existing shadcn components pick
them up without edits):

| Role | Value | Use |
|---|---|---|
| background | `#14212b` | the table |
| card / popover | `#1b2b36` | dialogs, chip, panels |
| border | `#2b3f4c` | hairlines |
| foreground | `#e6ebe8` | text |
| muted-foreground | `#9aacb3` | secondary text, labels |
| primary (sagebrush) | `#b5ca9b` | the single primary button, valid-move hints, game-over state |
| destructive | `#f2877d` | resign, reset-stats confirmations only |
| bella / coop / bentley | amber `#f59e0b`, blue `#3b82f6`, purple `#a855f7` | the ring around the opponent avatar, nothing else |

Dark only. No light mode in the games.

## Type

Encode Sans everywhere (loaded by `arcade.css`). The game name in the top bar uses
`.arcade-display` (expanded width, 800). Body text 400 or 500. Numbers (scores, counts,
clocks, move lists) use tabular figures, which the body rule already sets. No second
typeface, no monospace except a chess move list if it already uses one.

Line length under 70 characters in dialogs. Sentence case everywhere. No all-caps labels,
no tracked-out eyebrows.

## Layout

```
+-------------------------------------------------------------------+
| <- Arcade      Checkers                 (o) Bentley  [sound] [?]   |   top bar, 1px rule under
+-------------------------------------------------------------------+
|                                                                   |
|   You 12                     Your turn                 Bentley 12 |   score strip
|                                                                   |
|            +---------------------------------------+              |
|            |                                       |              |
|            |                BOARD                  |              |   max 640px, centred
|            |                                       |              |
|            +---------------------------------------+              |
|                                                                   |
|        [ New game ]  [ Undo ]  [ Stats ]  [ How to play ]         |   controls
|                                                                   |
+-------------------------------------------------------------------+
```

- Top bar (`.arcade-topbar`): left, a quiet "Arcade" link with a left arrow icon back to
  `https://www.mcooper.com/arcade/`; centre, the game name; right, the opponent chip
  (`.arcade-chip` with `data-character`), then icon buttons for sound and help. On phones
  the game name may drop and the chip stays.
- Score strip (`.arcade-score`): your count on the left, the opponent's on the right, the
  turn pill (`.arcade-turn`) in the middle with `data-active` = `you` | `opponent` |
  `over`. Text reads "Your turn", "Bentley is thinking", "You won", "Bentley won", "Draw".
  Games without a running count (tic-tac-toe, gomoku) show wins this session instead, or
  leave the sides empty and keep the pill.
- Board (`.arcade-board`): the game's existing board component, restyled only where its
  current chrome fights the table (neon borders, glossy plastic, bright gradients, pastel
  frames). Wood, felt and stone are welcome; keep them matte.
- Controls (`.arcade-controls`): shadcn buttons. Exactly one `default` (primary) button,
  "New game". Everything else `outline` or `ghost`. The opponent selector lives in the
  chip: clicking the chip opens the existing select (or a small popover) to change
  opponent. Mode (vs AI / two players) moves into the same menu or a ghost button; it is
  not a labelled form row.
- Phones (390px): the same order, board full width with 1rem gutters, controls wrap to two
  rows at most. No full-width stacked buttons, no horizontal scroll, tap targets 44px.

## Copy

- Game name only in the top bar: "Checkers", not "Checkers at Coop's Arcade", no
  "Challenge Coop", no "Can you beat him?", no "Ancient Strategy Game".
- Buttons name the action: "New game", "Undo", "Resign", "Stats", "How to play",
  "Settings". No emoji anywhere in the interface; icons come from `shared/icons.tsx` (`@shared/icons`), inline SVG with no dependency.
- Opponent text uses the character's name, never "AI" or "Computer".
- Game over dialog: the character's win or lose art (from `shared/characters.ts`), a
  one-line result ("Bentley won", "You beat Bentley", "Draw"), one catchphrase from the
  character in the muted colour, then "Play again" (primary) and "Close" (ghost). Stats
  for the game go below in the muted colour as a single line, not a grid of tiles.
- Tutorials: keep the content, restyle as a plain dialog. No "Tutorial by" or "Designed by".

## Motion

Pieces may animate when placed, dropped, captured or flipped, because that answers the
player's action. Nothing else moves: no pulsing hints (use a static sagebrush dot or ring
for valid moves), no confetti, no bouncing avatars, no gradient shifts. Respect
`prefers-reduced-motion` (the shared CSS already shortens everything).

## Do not

- Do not change rules, AI, or the `@shared/arcadeRecord` wiring.
- Do not add dependencies. Icons come from `@shared/icons`; add an icon there if one is missing.
- Do not keep a per-game page gradient or per-game accent colour.
- Do not use the character colours for buttons or text; they are the avatar ring only.
- Do not render "Your Opponent:" or "Mode:" as labelled form rows on the page.

## Mechanics (learned on the tic-tac-toe pilot; do these exactly)

The pilot is `tictactoe/`. When in doubt, open its files and copy.

1. **Stylesheet.** In `src/index.css`, right after `@import "tailwindcss";` add
   `@import "../../shared/arcade.css";`. Delete the game's own `:root` and `.dark` token
   blocks and any keyframes you no longer use. Keep the `@theme` block that maps the HSL
   variables. `arcade.css` is layered (`base` and `components`), so Tailwind utilities on
   the same element still win.
2. **Font.** In `index.html` `<head>`, remove any other Google Fonts links and add:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Encode+Sans:wdth,wght@75..125,300..800&display=swap" />
   ```
3. **React resolution for `@shared/icons`.** The shared folder has no `node_modules`, so
   add to `tsconfig.json` `compilerOptions.paths`:
   `"react": ["./node_modules/@types/react"], "react/jsx-runtime": ["./node_modules/@types/react/jsx-runtime"]`;
   to `jest.config.ts` `moduleNameMapper`:
   `'^react$': '<rootDir>/node_modules/react', '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime'`;
   and to `vite.config.ts` `resolve`: `dedupe: ['react', 'react-dom']`.
4. **Dialogs.** Copy `tictactoe/src/components/ui/dialog.tsx` over the game's own
   (`w-[calc(100%-2rem)]`, `max-h-[calc(100dvh-2rem)]`, card colour, a 44px close target,
   and a `hideClose` prop for the game-over dialog, whose "Close" button replaces the X).
5. **Opponent chip.** Copy `tictactoe/src/components/OpponentChip.tsx`: the chip is the
   trigger of the game's existing shadcn Select. Keep `[&>span]:line-clamp-none` on the
   trigger or the name gets cut on phones.
6. **Score strip when there is no running count.** Use the game's persistent local stats
   (wins on your side, losses on the opponent's side). Tic-tac-toe does this.
7. **Check with a screenshot** at 1280x900 and 390x844 before reporting, and fix what
   looks off. Measure: document width 390 at 390, every control at least 44px tall, no
   emoji in page text, nothing reads "Challenge".
