# Arcade table: the shared look for every game

Eight games, one table. Each board keeps its own material and its own pieces; everything
around the board is the same across the arcade, so a player moving from chess to mancala
feels they stayed in one room. The tokens and shell classes live in `shared/arcade.css`,
the control-row menu in `shared/MoreMenu.tsx`, the icons in `shared/icons.tsx`.

The reference implementation is `chess/`. When in doubt, open its files and copy:
`src/pages/ChessGame.tsx` (shell, score strip), `src/components/GameControls.tsx` (control
row), `src/components/Board.tsx` and `Cell.tsx` (slide on move, hint ring, last move),
`src/index.css` (board material, markers).

## The one memorable thing

The board. It is the largest element on the page, centred, lit by one soft shadow, sitting
on green card-table felt under one lamp. Nothing else competes with it: no glow, no
decorative frames, no emoji, no tagline.

## Tokens

Imported from `shared/arcade.css` (shadcn HSL triplets, so existing shadcn components pick
them up without edits):

| Role | Value | Use |
|---|---|---|
| background (felt) | `#133026`, lit to `#1c4a39` under the lamp | the table |
| card / popover | `#0f241c` | dialogs, panels, the More menu |
| border | `#2e5244` | hairlines |
| foreground (ivory) | `#f3ead8` | text |
| muted-foreground | `#b5bfa6` | secondary text, labels |
| primary (brass) | `#d8ac4b` | the single primary button, the hint ring, the last move, game-over state |
| destructive | `#f17571` | resign, reset-stats confirmations only |
| bella / coop / bentley | amber `#f59e0b`, blue `#3b82f6`, purple `#a855f7` | the ring around the opponent avatar, nothing else |

The page background is `--arcade-felt`: one pool of lamp light over the middle of the table,
falling off to the rails. It is the only gradient in the shell. Use the tokens
(`hsl(var(--primary))` and friends), never the hex values, so the palette stays in one file.

Dark only. No light mode in the games.

## Type

Encode Sans everywhere (loaded by a `<link>` in each `index.html`). The game name in the top
bar uses `.arcade-display`. Body text 400 or 500. Numbers use tabular figures, which the
body rule already sets. No second typeface, no monospace except the chess move list.

Line length under 70 characters in dialogs. Sentence case everywhere. No all-caps labels.

## Layout

```
+-------------------------------------------------------------------+
| <- Arcade      Checkers                 (o) Bentley  [sound] [?]   |   top bar
+-------------------------------------------------------------------+
|                                                                   |
|   12                       Your turn                     12 (o)   |   score strip
|   You                                                 Bentley     |
|            +---------------------------------------+              |
|            |                                       |              |
|            |                BOARD                  |              |   as large as fits
|            |                                       |              |
|            +---------------------------------------+              |
|                                                                   |
|            [ New game ]  [ Undo ]  [ Hint ]  [ More v ]           |   one row
+-------------------------------------------------------------------+
```

- **One column, sized by the viewport.** `--arcade-col` is the width of the score strip,
  the board and the controls. It is the largest square that fits once the top bar, score
  strip and one control row have their room, capped at 760 px, so the board fills a laptop
  screen and the whole game fits a phone without scrolling. `.arcade-board`,
  `.arcade-score` and `.arcade-controls` already use it. Do not give the board a fixed
  pixel size or a smaller max-width; size everything inside it in percentages or `fr`.
  A game with extra rows above or below the board (chess has captured pieces and a move
  list) overrides `--arcade-col` on `.arcade-stage` with a larger subtraction. A board much
  wider than tall (mancala) sets `data-shape="wide"` on `.arcade-stage`.
- **Top bar** (`.arcade-topbar`): left, a quiet "Arcade" link with a left arrow back to
  `https://www.mcooper.com/arcade/`; centre, the game name; right, the opponent chip
  (`.arcade-chip`, the trigger of the opponent select), then icon buttons for sound and
  help. On phones the game name drops and the chip stays.
- **Score strip** (`.arcade-score`): your count on the left; the turn pill
  (`.arcade-turn`, `data-active` = `you` | `opponent` | `over`) in the middle; on the right
  the opponent's count and name with their portrait: wrap that side in `.arcade-player`
  and add `<img class="arcade-avatar" data-character={character.id}>`. No portrait in
  two-player mode. While the opponent thinks the pill reads "Bentley is thinking" and the
  shared CSS steps three dots through it. Games without a running count show wins and
  losses from local stats.
- **Controls** (`.arcade-controls`): exactly one row on every screen, in this order:
  "New game" (the only `default` button), "Undo" (`outline`), "Hint" (`outline`, only
  against a character), then `<MoreMenu>` holding everything else: How to play, Stats,
  Achievements, Game history, Settings, mode changes, and Resign last and `destructive`.
  Buttons are `h-11 px-3.5 sm:px-5`. No second row of ghost buttons, no icon-only controls
  in this row.
- **Phones (390 px)**: same order, board full width with 1 rem gutters, one control row,
  no horizontal scroll, tap targets 44 px.

## Boards and pieces

Each game keeps its own material. All of them follow the same physical rules:

- **Matte, with depth.** A board is an object: a frame or edge a shade darker than the
  playing surface, a hairline between frame and surface, the shared drop shadow
  (`--arcade-board-shadow`). Surfaces may carry a very quiet gradient or grain. Nothing
  glossy, no neon, no glow.
- **Pieces are lit from above.** A disc, stone or man gets a soft radial or linear gradient
  (lighter at the top left), a thin darker rim, and a short contact shadow under it. Flat
  single-colour circles are not finished. Draw pieces in CSS or inline SVG, never with
  font glyphs or emoji, so they look the same on every device.
- **Colours that hold on the table.** The table is green, so boards are wood, stone or
  lacquer with a frame, never bare green against the felt (othello's green cloth sits inside
  a wide wooden frame). Light pieces are warm ivory (`#f6f0e2`), dark pieces charcoal
  (`#2c3136`), reds are oxblood rather than fire-engine. The two sides must be
  distinguishable without colour (shape, rim or value).
- **The player always knows what just happened.** The last move is marked (a brass
  wash on its squares or a small brass dot on the stone or disc). Legal targets for a
  selected piece are marked with a dark translucent dot, captures with a ring. The winning
  line or the pieces that decided the game are marked when the game ends.
- **Hint.** The Hint button marks the engine's suggestion with a static ring: use
  `.arcade-hint` (brass between two dark keylines, legible on any board colour) on
  the squares, pit, column or point involved. It clears when the position changes.

## Motion

Motion answers a move and nothing else.

- A moved piece travels: slides (chess, checkers, morris), drops under gravity
  (connect 4), flips (othello), is sown stone by stone (mancala), or is set down with a
  short scale-in (gomoku, tic-tac-toe). 150 to 250 ms, ease-out; mancala sowing may take
  longer because the count is the point.
- The position changes first and the animation plays on the new position. Do not hold the
  game state back while an animation runs, and do not block input for longer than the
  animation.
- The opponent's reply lands 0.6 to 1.5 s after the player's move: the search time is the
  pause. Do not add a fixed delay on top of a search that already took its time.
- Nothing idles: no pulsing hints, no bouncing avatars, no confetti, no gradient shifts.
  The three thinking dots in the turn pill are the only loop.
- Respect `prefers-reduced-motion` (the shared CSS shortens everything).

## Copy

- Game name only in the top bar. No "Challenge Coop", no taglines.
- Buttons name the action: "New game", "Undo", "Hint", "More". No emoji anywhere in the
  interface; icons come from `@shared/icons`.
- Opponent text uses the character's name, never "AI" or "Computer".
- Game over dialog: the character's win or lose art (from `shared/characters.ts`), a
  one-line result ("Bentley won", "You beat Bentley", "Draw"), one catchphrase from the
  character in the muted colour, then "Play again" (primary) and "Close" (ghost). Stats
  for the game go below in the muted colour as a single line.
- Confirmations (resign, switch opponent mid-game, reset stats) use the game's Dialog,
  not `window.confirm`.
- Any claim about how a character plays must be true of the code.

## Do not

- Do not add dependencies. Icons come from `@shared/icons`; the menu is `@shared/MoreMenu`.
- Do not keep a per-game page background or per-game accent colour.
- Do not use the character colours for buttons or text; they are the avatar ring only.
- Do not render "Your Opponent:" or "Mode:" as labelled form rows on the page.

## Mechanics

1. **Stylesheet.** In `src/index.css`, right after `@import "tailwindcss";` comes
   `@import "../shared/arcade.css";`. Keep the `@theme` block that maps the HSL variables.
   `arcade.css` is layered (`base` and `components`), so Tailwind utilities on the same
   element still win, and so does unlayered CSS in the game's own `index.css`.
2. **React resolution for the shared folder.** It has no `node_modules`, so
   `tsconfig.json` maps `react` and `react/jsx-runtime` to the game's `@types/react`, and
   `vite.config.ts` has `resolve.dedupe: ['react', 'react-dom']`.
3. **Dialogs.** `src/components/ui/dialog.tsx` is the tic-tac-toe version
   (`w-[calc(100%-2rem)]`, `max-h-[calc(100dvh-2rem)]`, a 44 px close target, `hideClose`).
4. **Check with screenshots** at 1280x900 and 390x844 before reporting, and fix what looks
   off. Measure: document width 390 at 390, one control row, every control at least 44 px
   tall, no emoji in page text, the whole game visible without scrolling at both sizes.
