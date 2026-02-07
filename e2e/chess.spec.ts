import { test, expect, Page } from '@playwright/test'

/**
 * Chess Game E2E Tests
 *
 * Comprehensive Playwright tests covering setup screen, gameplay,
 * AI interaction, undo, dialogs, and persistence.
 *
 * Board coordinate system:
 *   Row 0 = rank 8 (Black back rank)
 *   Row 7 = rank 1 (White back rank)
 *   Row 6 = rank 2 (White pawns start)
 *   Row 1 = rank 7 (Black pawns start)
 *   Col 0 = file a, Col 7 = file h
 */

/** Helper: get a board cell by row and column */
function cell(page: Page, row: number, col: number) {
  return page.locator(`[data-row="${row}"][data-col="${col}"]`)
}

/** Helper: get the chess board grid */
function board(page: Page) {
  return page.getByRole('grid', { name: 'Chess game board' })
}

/** Helper: count all pieces currently on the board */
async function countPieces(page: Page): Promise<number> {
  return page.locator('[role="grid"] [role="gridcell"] [role="img"]').count()
}

/** Helper: dismiss the tutorial if it appears */
async function dismissTutorialIfPresent(page: Page) {
  const skipButton = page.getByRole('button', { name: 'Skip Tutorial' })
  if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipButton.click()
    await expect(skipButton).not.toBeVisible()
  }
}

/** Helper: start a PvC game from the setup screen and dismiss tutorial */
async function startPvCGame(page: Page) {
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(board(page)).toBeVisible()
  await dismissTutorialIfPresent(page)
}

/** Helper: start a PvP game from the setup screen and dismiss tutorial */
async function startPvPGame(page: Page) {
  await page.getByRole('button', { name: 'vs Player' }).click()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(board(page)).toBeVisible()
  await dismissTutorialIfPresent(page)
}

test.describe('Chess Game', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all localStorage to ensure a clean state between tests
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  // ---------------------------------------------------------------
  // 1. App loads and shows setup screen
  // ---------------------------------------------------------------
  test('should display the setup screen on load', async ({ page }) => {
    // Title
    await expect(page.getByRole('heading', { name: 'Chess' })).toBeVisible()

    // Subtitle
    await expect(page.getByText("at Coop's Arcade")).toBeVisible()

    // Mode toggle buttons
    await expect(page.getByRole('button', { name: 'vs AI' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'vs Player' })).toBeVisible()

    // Character cards (default is PvC mode)
    await expect(page.getByText('Bella')).toBeVisible()
    await expect(page.getByText('Coop')).toBeVisible()
    await expect(page.getByText('Bentley')).toBeVisible()

    // Difficulty labels visible on cards
    await expect(page.getByText('easy')).toBeVisible()
    await expect(page.getByText('medium')).toBeVisible()
    await expect(page.getByText('hard')).toBeVisible()

    // Start Game button
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible()
  })

  // ---------------------------------------------------------------
  // 2. Start PvC game - board appears with 32 pieces
  // ---------------------------------------------------------------
  test('should start a PvC game and show the board with 32 pieces', async ({ page }) => {
    await startPvCGame(page)

    // Board should be visible
    await expect(board(page)).toBeVisible()

    // Should have 32 pieces on the board
    const pieces = await countPieces(page)
    expect(pieces).toBe(32)

    // Piece counts displayed
    await expect(page.getByText('16').first()).toBeVisible()

    // Turn indicator should show it is the player's turn
    await expect(page.getByText('Your Turn')).toBeVisible()

    // Game controls should be visible
    await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Undo/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stats' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Help' })).toBeVisible()
  })

  // ---------------------------------------------------------------
  // 3. Start PvP game - verify both players can take turns
  // ---------------------------------------------------------------
  test('should start a PvP game and allow both players to move', async ({ page }) => {
    await startPvPGame(page)

    // Should show White's Turn
    await expect(page.getByText("White's Turn")).toBeVisible()

    // White pawn e2-e4 (row 6, col 4 -> row 4, col 4)
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)
    await cell(page, 4, 4).click()

    // Wait for move animation
    await page.waitForTimeout(600)

    // Now it should be Black's turn
    await expect(page.getByText("Black's Turn")).toBeVisible()

    // Black pawn e7-e5 (row 1, col 4 -> row 3, col 4)
    await cell(page, 1, 4).click()
    await page.waitForTimeout(300)
    await cell(page, 3, 4).click()

    // Wait for move animation
    await page.waitForTimeout(600)

    // Back to White's turn
    await expect(page.getByText("White's Turn")).toBeVisible()
  })

  // ---------------------------------------------------------------
  // 4. Make a move - click pawn, see highlights, click destination
  // ---------------------------------------------------------------
  test('should select a piece and show valid move highlights', async ({ page }) => {
    await startPvCGame(page)

    // Click white pawn at e2 (row 6, col 4)
    const pawnCell = cell(page, 6, 4)
    await pawnCell.click()

    // Wait for highlights to appear
    await page.waitForTimeout(300)

    // The pawn cell should be selected
    await expect(pawnCell).toHaveAttribute('aria-selected', 'true')

    // Valid destinations should be highlighted (e3 = row 5, col 4 and e4 = row 4, col 4)
    const e3 = cell(page, 5, 4)
    const e4 = cell(page, 4, 4)
    await expect(e3).toHaveClass(/cell-highlighted/)
    await expect(e4).toHaveClass(/cell-highlighted/)

    // Click the destination e4
    await e4.click()

    // Wait for move animation to complete
    await page.waitForTimeout(800)

    // The pawn should now be at e4 - verify the cell has a piece with aria-label containing "White pawn"
    const e4PieceLabel = await cell(page, 4, 4).getAttribute('aria-label')
    expect(e4PieceLabel).toContain('White')
    expect(e4PieceLabel).toContain('pawn')

    // The original cell e2 should be empty
    const e2Label = await cell(page, 6, 4).getAttribute('aria-label')
    expect(e2Label).toContain('empty')
  })

  // ---------------------------------------------------------------
  // 5. AI responds after player move
  // ---------------------------------------------------------------
  test('should show AI thinking indicator and AI makes a move', async ({ page }) => {
    await startPvCGame(page)

    // Make a move: white pawn e2-e4
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)
    await cell(page, 4, 4).click()

    // After the player move animation, AI should start thinking
    // The AI thinking indicator should appear (character name + "is thinking...")
    await expect(page.getByText(/is thinking/)).toBeVisible({ timeout: 3000 })

    // Wait for AI to complete its move (AI_MOVE_DELAY=600ms + animation ~700ms + settle ~300ms)
    await page.waitForTimeout(2500)

    // After AI moves, it should be the player's turn again
    await expect(page.getByText('Your Turn')).toBeVisible({ timeout: 5000 })

    // At least one black piece should have moved - the board should still have pieces
    const pieces = await countPieces(page)
    expect(pieces).toBe(32) // No captures on first move exchange
  })

  // ---------------------------------------------------------------
  // 6. Undo a move
  // ---------------------------------------------------------------
  test('should undo the last move and restore the board', async ({ page }) => {
    await startPvCGame(page)

    // Verify initial state of e2 - has a white pawn
    const initialE2Label = await cell(page, 6, 4).getAttribute('aria-label')
    expect(initialE2Label).toContain('White')
    expect(initialE2Label).toContain('pawn')

    // Make a move: white pawn e2-e4
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)
    await cell(page, 4, 4).click()

    // Wait for player move animation + AI move to complete
    await page.waitForTimeout(3000)

    // Wait until it's the player's turn again
    await expect(page.getByText('Your Turn')).toBeVisible({ timeout: 5000 })

    // Click Undo
    await page.getByRole('button', { name: 'Undo last move (U)' }).click()

    // Wait for undo to process
    await page.waitForTimeout(500)

    // Board should be restored - e2 should have the pawn back
    const restoredE2Label = await cell(page, 6, 4).getAttribute('aria-label')
    expect(restoredE2Label).toContain('White')
    expect(restoredE2Label).toContain('pawn')

    // e4 should be empty again
    const restoredE4Label = await cell(page, 4, 4).getAttribute('aria-label')
    expect(restoredE4Label).toContain('empty')

    // It should still be the player's turn
    await expect(page.getByText('Your Turn')).toBeVisible()
  })

  // ---------------------------------------------------------------
  // 7. New Game resets the board
  // ---------------------------------------------------------------
  test('should reset the board when New Game is clicked', async ({ page }) => {
    await startPvCGame(page)

    // Make a move: white pawn e2-e4
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)
    await cell(page, 4, 4).click()

    // Wait for move to complete and AI to respond
    await page.waitForTimeout(3000)

    // Click New Game
    await page.getByRole('button', { name: 'New Game' }).click()

    // Wait for reset
    await page.waitForTimeout(500)

    // Board should have 32 pieces again
    const pieces = await countPieces(page)
    expect(pieces).toBe(32)

    // e2 should have a white pawn (initial position restored)
    const e2Label = await cell(page, 6, 4).getAttribute('aria-label')
    expect(e2Label).toContain('White')
    expect(e2Label).toContain('pawn')

    // e4 should be empty
    const e4Label = await cell(page, 4, 4).getAttribute('aria-label')
    expect(e4Label).toContain('empty')

    // Turn indicator should be player's turn
    await expect(page.getByText('Your Turn')).toBeVisible()
  })

  // ---------------------------------------------------------------
  // 8. Change Mode returns to setup screen
  // ---------------------------------------------------------------
  test('should return to setup screen when Change Mode is clicked', async ({ page }) => {
    await startPvCGame(page)

    // Board should be visible
    await expect(board(page)).toBeVisible()

    // Click Change Mode
    await page.getByRole('button', { name: 'Change Mode' }).click()

    // Should return to setup screen
    await expect(page.getByRole('heading', { name: 'Chess' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible()

    // Board should no longer be visible
    await expect(board(page)).not.toBeVisible()
  })

  // ---------------------------------------------------------------
  // 9. Open and close dialogs: Stats, Help, Achievements, History
  // ---------------------------------------------------------------
  test('should open and close the Stats dialog', async ({ page }) => {
    await startPvCGame(page)

    // Open Stats dialog
    await page.getByRole('button', { name: 'Stats' }).click()

    // Dialog should be visible with expected content
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Game Stats')).toBeVisible()
    await expect(page.getByText('Total Games')).toBeVisible()
    await expect(page.getByText('Wins')).toBeVisible()
    await expect(page.getByText('Losses')).toBeVisible()
    await expect(page.getByText('Win Rate')).toBeVisible()

    // Close dialog
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should open and close the Help (Tutorial) dialog', async ({ page }) => {
    await startPvCGame(page)

    // Open Help dialog
    await page.getByRole('button', { name: 'Help' }).click()

    // Tutorial dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Welcome to Chess!')).toBeVisible()

    // Navigate through steps
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('The Goal')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Your Pieces')).toBeVisible()

    // Use Back button
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByText('The Goal')).toBeVisible()

    // Skip to close
    await page.getByRole('button', { name: 'Skip' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should open and close the Achievements dialog', async ({ page }) => {
    await startPvCGame(page)

    // Open Achievements dialog
    await page.getByRole('button', { name: 'Achievements' }).click()

    // Achievements dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Achievements')).toBeVisible()
    await expect(page.getByText(/Unlocked/)).toBeVisible()
    await expect(page.getByText('Complete challenges to unlock achievements.')).toBeVisible()

    // Close dialog
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should open and close the Game History dialog', async ({ page }) => {
    await startPvCGame(page)

    // Open History dialog
    await page.getByRole('button', { name: 'History' }).click()

    // History dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Game History')).toBeVisible()
    await expect(page.getByText('No games played yet.')).toBeVisible()

    // Close dialog
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  // ---------------------------------------------------------------
  // 10. Resume saved game
  // ---------------------------------------------------------------
  test('should show Resume Saved Game button after starting and leaving a game', async ({ page }) => {
    await startPvCGame(page)

    // Make a move so the game has state to save
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)
    await cell(page, 4, 4).click()

    // Wait for move + AI response
    await page.waitForTimeout(3000)

    // Go back to setup screen
    await page.getByRole('button', { name: 'Change Mode' }).click()

    // The "Resume Saved Game" button should now be visible
    await expect(page.getByRole('button', { name: 'Resume Saved Game' })).toBeVisible()
  })

  test('should resume a saved game and restore the board state', async ({ page }) => {
    await startPvCGame(page)

    // Make a move: e2-e4
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)
    await cell(page, 4, 4).click()

    // Wait for move + AI response
    await page.waitForTimeout(3000)
    await expect(page.getByText('Your Turn')).toBeVisible({ timeout: 5000 })

    // Go back to setup
    await page.getByRole('button', { name: 'Change Mode' }).click()

    // Click Resume
    await page.getByRole('button', { name: 'Resume Saved Game' }).click()

    // Board should be visible with the game in progress
    await expect(board(page)).toBeVisible()
    await dismissTutorialIfPresent(page)

    // The e2 pawn should have moved - e4 should have white pawn (from the saved game)
    const e4Label = await cell(page, 4, 4).getAttribute('aria-label')
    expect(e4Label).toContain('White')
    expect(e4Label).toContain('pawn')

    // e2 should be empty (the pawn moved)
    const e2Label = await cell(page, 6, 4).getAttribute('aria-label')
    expect(e2Label).toContain('empty')
  })

  // ---------------------------------------------------------------
  // Additional tests for board structure and UI details
  // ---------------------------------------------------------------
  test('should display rank and file labels on the board', async ({ page }) => {
    await startPvCGame(page)

    // File labels (a-h)
    for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      await expect(page.locator('.board-frame').getByText(file, { exact: true })).toBeVisible()
    }

    // Rank labels (1-8)
    for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      await expect(page.locator('.board-frame').getByText(rank, { exact: true })).toBeVisible()
    }
  })

  test('should have proper light and dark square coloring', async ({ page }) => {
    await startPvCGame(page)

    // a1 (row 7, col 0) should be dark (7+0 = odd)
    await expect(cell(page, 7, 0)).toHaveClass(/chess-square-dark/)

    // a2 (row 6, col 0) should be light (6+0 = even)
    await expect(cell(page, 6, 0)).toHaveClass(/chess-square-light/)

    // b1 (row 7, col 1) should be light (7+1 = even)
    await expect(cell(page, 7, 1)).toHaveClass(/chess-square-light/)

    // h8 (row 0, col 7) should be dark (0+7 = odd)
    await expect(cell(page, 0, 7)).toHaveClass(/chess-square-dark/)
  })

  test('should have 64 cells on the board', async ({ page }) => {
    await startPvCGame(page)

    const cells = page.locator('[role="grid"] [role="gridcell"]')
    await expect(cells).toHaveCount(64)
  })

  test('should deselect a piece when clicking an empty non-highlighted cell', async ({ page }) => {
    await startPvCGame(page)

    // Select white pawn at e2
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)

    // Verify it is selected
    await expect(cell(page, 6, 4)).toHaveAttribute('aria-selected', 'true')

    // Click an empty cell that is NOT highlighted (e.g., a5 = row 3, col 0)
    await cell(page, 3, 0).click()
    await page.waitForTimeout(300)

    // The pawn should be deselected
    await expect(cell(page, 6, 4)).toHaveAttribute('aria-selected', 'false')
  })

  test('should switch between character cards on setup screen', async ({ page }) => {
    // Default should have medium (Coop) selected - look for the checkmark
    // Click on Bella (easy) card
    await page.getByText('Bella').click()

    // Bella should now be selected (difficulty badge "easy" visible on selected card)
    // Click on Bentley (hard) card
    await page.getByText('Bentley').click()

    // Start game with Bentley
    await page.getByRole('button', { name: 'Start Game' }).click()
    await expect(board(page)).toBeVisible()
    await dismissTutorialIfPresent(page)

    // Character info should show Bentley
    await expect(page.locator('[aria-label="Current opponent"]').getByText('Bentley')).toBeVisible()
  })

  test('should switch to PvP mode on setup screen and hide character cards', async ({ page }) => {
    // Switch to PvP mode
    await page.getByRole('button', { name: 'vs Player' }).click()

    // Character cards should not be visible
    await expect(page.getByText('Choose Your Opponent')).not.toBeVisible()

    // PvP description should be visible
    await expect(page.getByText('Play against a friend on the same device.')).toBeVisible()

    // Switch back to PvC
    await page.getByRole('button', { name: 'vs AI' }).click()

    // Character cards should be visible again
    await expect(page.getByText('Choose Your Opponent')).toBeVisible()
  })

  test('should display character info panel during PvC game', async ({ page }) => {
    await startPvCGame(page)

    // Character info region should be visible
    const opponentPanel = page.locator('[aria-label="Current opponent"]')
    await expect(opponentPanel).toBeVisible()

    // Should show the character name (default is Coop/medium)
    await expect(opponentPanel.getByText('Coop')).toBeVisible()
  })

  test('should not display character info panel during PvP game', async ({ page }) => {
    await startPvPGame(page)

    // Character info should NOT be visible
    await expect(page.locator('[aria-label="Current opponent"]')).not.toBeVisible()

    // Turn indicator should show color names
    await expect(page.getByText("White's Turn")).toBeVisible()
  })

  test('should change difficulty via Select component during gameplay', async ({ page }) => {
    await startPvCGame(page)

    // The difficulty selector should be visible (PvC mode)
    await expect(page.getByText('Your Opponent:')).toBeVisible()

    // Open the select dropdown
    await page.getByRole('combobox', { name: /difficulty/i }).click()

    // Select Bella (easy)
    await page.getByRole('option', { name: /Bella/i }).click()

    // Character panel should now show Bella
    await expect(page.locator('[aria-label="Current opponent"]').getByText('Bella')).toBeVisible()
  })

  test('should persist game state across page reload via Resume', async ({ page }) => {
    await startPvCGame(page)

    // Make a move: d2-d4
    await cell(page, 6, 3).click()
    await page.waitForTimeout(300)
    await cell(page, 4, 3).click()

    // Wait for the move and AI response
    await page.waitForTimeout(3000)
    await expect(page.getByText('Your Turn')).toBeVisible({ timeout: 5000 })

    // Reload the page (game auto-saves during play)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // We should see the setup screen with a Resume button since there is a saved game
    await expect(page.getByRole('button', { name: 'Resume Saved Game' })).toBeVisible()

    // Click Resume
    await page.getByRole('button', { name: 'Resume Saved Game' }).click()
    await expect(board(page)).toBeVisible()
    await dismissTutorialIfPresent(page)

    // d2 should be empty (pawn moved)
    const d2Label = await cell(page, 6, 3).getAttribute('aria-label')
    expect(d2Label).toContain('empty')

    // d4 should have a white pawn
    const d4Label = await cell(page, 4, 3).getAttribute('aria-label')
    expect(d4Label).toContain('White')
    expect(d4Label).toContain('pawn')
  })

  test('should show piece count regions with correct initial values', async ({ page }) => {
    await startPvCGame(page)

    // Piece count region should exist
    const pieceCountRegion = page.locator('[aria-label="Piece count"]')
    await expect(pieceCountRegion).toBeVisible()

    // Both sides should start with 16 pieces
    const counts = pieceCountRegion.locator('.text-xl, .text-2xl')
    await expect(counts.first()).toHaveText('16')
    await expect(counts.nth(1)).toHaveText('16')
  })

  test('should handle clicking on opponent pieces without selecting them', async ({ page }) => {
    await startPvCGame(page)

    // Try to click a black piece (e.g., black pawn at e7 = row 1, col 4)
    await cell(page, 1, 4).click()
    await page.waitForTimeout(300)

    // No piece should be selected (black pieces can't be selected when it's white's turn)
    await expect(cell(page, 1, 4)).toHaveAttribute('aria-selected', 'false')

    // No highlights should appear
    const highlighted = page.locator('.cell-highlighted')
    await expect(highlighted).toHaveCount(0)
  })

  test('should allow selecting a different piece after initial selection', async ({ page }) => {
    await startPvCGame(page)

    // Select white pawn at e2
    await cell(page, 6, 4).click()
    await page.waitForTimeout(300)
    await expect(cell(page, 6, 4)).toHaveAttribute('aria-selected', 'true')

    // Now select a different white pawn at d2 (row 6, col 3)
    await cell(page, 6, 3).click()
    await page.waitForTimeout(300)

    // d2 should now be selected
    await expect(cell(page, 6, 3)).toHaveAttribute('aria-selected', 'true')

    // e2 should no longer be selected
    await expect(cell(page, 6, 4)).toHaveAttribute('aria-selected', 'false')

    // Highlights should show d2's valid moves (d3 and d4)
    await expect(cell(page, 5, 3)).toHaveClass(/cell-highlighted/)
    await expect(cell(page, 4, 3)).toHaveClass(/cell-highlighted/)
  })

  test('should show the tutorial dialog on first visit after starting a game', async ({ page }) => {
    // Start game WITHOUT dismissing the tutorial
    await page.getByRole('button', { name: 'Start Game' }).click()
    await expect(board(page)).toBeVisible()

    // Tutorial should auto-show after a short delay
    await expect(page.getByText('Welcome to Chess!')).toBeVisible({ timeout: 2000 })

    // Walk through all 9 tutorial steps
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('The Goal')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Your Pieces')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('How Pieces Move')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Capturing Pieces')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Special Moves')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Check & Checkmate')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Choose Your Challenge')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Ready to Play!')).toBeVisible()

    // Last step should show "Let's Play!" button
    await page.getByRole('button', { name: "Let's Play!" }).click()

    // Tutorial should be dismissed
    await expect(page.getByText('Welcome to Chess!')).not.toBeVisible()
  })

  test('should not show tutorial on second visit after completing it', async ({ page }) => {
    // Mark tutorial as completed via localStorage
    await page.evaluate(() => localStorage.setItem('chess-tutorial-completed', 'true'))
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Start game
    await page.getByRole('button', { name: 'Start Game' }).click()
    await expect(board(page)).toBeVisible()

    // Wait past the tutorial show delay
    await page.waitForTimeout(1000)

    // Tutorial should NOT appear
    await expect(page.getByText('Welcome to Chess!')).not.toBeVisible()
  })

  test('should make a knight move and verify it moved correctly', async ({ page }) => {
    await startPvCGame(page)

    // Select white knight at g1 (row 7, col 6)
    await cell(page, 7, 6).click()
    await page.waitForTimeout(300)

    // Knight should be selected
    await expect(cell(page, 7, 6)).toHaveAttribute('aria-selected', 'true')

    // Valid destinations should be highlighted: f3 (row 5, col 5) and h3 (row 5, col 7)
    await expect(cell(page, 5, 5)).toHaveClass(/cell-highlighted/)
    await expect(cell(page, 5, 7)).toHaveClass(/cell-highlighted/)

    // Move knight to f3
    await cell(page, 5, 5).click()
    await page.waitForTimeout(800)

    // Knight should now be at f3
    const f3Label = await cell(page, 5, 5).getAttribute('aria-label')
    expect(f3Label).toContain('White')
    expect(f3Label).toContain('knight')

    // g1 should be empty
    const g1Label = await cell(page, 7, 6).getAttribute('aria-label')
    expect(g1Label).toContain('empty')
  })

  test('should properly label cells with algebraic notation in aria-labels', async ({ page }) => {
    await startPvCGame(page)

    // e1 (row 7, col 4) should contain the white king
    const e1Label = await cell(page, 7, 4).getAttribute('aria-label')
    expect(e1Label).toContain('e1')
    expect(e1Label).toContain('White')
    expect(e1Label).toContain('king')

    // d8 (row 0, col 3) should contain the black queen
    const d8Label = await cell(page, 0, 3).getAttribute('aria-label')
    expect(d8Label).toContain('d8')
    expect(d8Label).toContain('Black')
    expect(d8Label).toContain('queen')

    // a3 (row 5, col 0) should be empty
    const a3Label = await cell(page, 5, 0).getAttribute('aria-label')
    expect(a3Label).toContain('a3')
    expect(a3Label).toContain('empty')
  })
})
