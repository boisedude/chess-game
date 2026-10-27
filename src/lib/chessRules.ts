/**
 * Chess Rules Engine
 *
 * Pure functions for chess game logic. No React dependencies.
 * Exports: createInitialBoard, createInitialGameState, getValidMovesForPiece,
 * getAllValidMoves, applyMove, checkGameOver, computeNextGameState, hashBoard,
 * isInCheck, findKing, countPieces, getMaterialValue, updateCastlingRights, getNewEnPassant.
 *
 * Board orientation: Row 0 = Black back rank (rank 8), Row 7 = White back rank (rank 1).
 * Player 1 = White, Player 2 = Black.
 */

import type {
  Player,
  PieceType,
  Board,
  Position,
  Move,
  ValidMove,
  GameState,
  GameMode,
  Difficulty,
  CastlingRights,
  DrawReason,
  PromotionPiece,
} from '@/types/chess.types'
import { BOARD_SIZE, PIECE_VALUES } from '@/types/chess.types'
import { DRAW_MOVE_LIMIT, REPETITION_DRAW_COUNT, COMEBACK_MATERIAL_DEFICIT } from './gameConstants'

// ============================================================
// Board Creation
// ============================================================

const BACK_RANK: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']

/** Creates the standard chess starting position. */
export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  )

  // Black back rank (row 0)
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[0][col] = { player: 2, type: BACK_RANK[col] }
  }
  // Black pawns (row 1)
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[1][col] = { player: 2, type: 'pawn' }
  }
  // White pawns (row 6)
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[6][col] = { player: 1, type: 'pawn' }
  }
  // White back rank (row 7)
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[7][col] = { player: 1, type: BACK_RANK[col] }
  }

  return board
}

// ============================================================
// Utility functions
// ============================================================

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

function cloneBoard(board: Board): Board {
  // Pieces are never mutated in place, so rows are copied and piece objects shared.
  return board.map(row => row.slice())
}

function opponent(player: Player): Player {
  return player === 1 ? 2 : 1
}

/** Find the king position for a given player. */
export function findKing(board: Board, player: Player): Position | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece && piece.player === player && piece.type === 'king') {
        return { row, col }
      }
    }
  }
  return null
}

/** Count pieces for each player. Returns [whiteCount, blackCount]. */
export function countPieces(board: Board): [number, number] {
  let white = 0
  let black = 0
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece) {
        if (piece.player === 1) white++
        else black++
      }
    }
  }
  return [white, black]
}

/** Calculate total material value for a player. */
export function getMaterialValue(board: Board, player: Player): number {
  let value = 0
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece && piece.player === player) {
        value += PIECE_VALUES[piece.type]
      }
    }
  }
  return value
}

// ============================================================
// Attack detection
// ============================================================

/** Check if a square is attacked by the given player. */
export function isSquareAttacked(board: Board, square: Position, byPlayer: Player): boolean {
  const { row, col } = square

  // Pawn attacks
  const pawnDir = byPlayer === 1 ? 1 : -1 // White pawns attack upward (lower rows)
  for (const dc of [-1, 1]) {
    const pr = row + pawnDir
    const pc = col + dc
    if (inBounds(pr, pc)) {
      const p = board[pr][pc]
      if (p && p.player === byPlayer && p.type === 'pawn') return true
    }
  }

  // Knight attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ]
  for (const [dr, dc] of knightOffsets) {
    const nr = row + dr
    const nc = col + dc
    if (inBounds(nr, nc)) {
      const p = board[nr][nc]
      if (p && p.player === byPlayer && p.type === 'knight') return true
    }
  }

  // King attacks (adjacent squares)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const kr = row + dr
      const kc = col + dc
      if (inBounds(kr, kc)) {
        const p = board[kr][kc]
        if (p && p.player === byPlayer && p.type === 'king') return true
      }
    }
  }

  // Sliding pieces: bishop/queen (diagonals)
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  for (const [dr, dc] of diagonals) {
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c)) {
      const p = board[r][c]
      if (p) {
        if (p.player === byPlayer && (p.type === 'bishop' || p.type === 'queen')) return true
        break
      }
      r += dr
      c += dc
    }
  }

  // Sliding pieces: rook/queen (orthogonals)
  const orthogonals = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (const [dr, dc] of orthogonals) {
    let r = row + dr
    let c = col + dc
    while (inBounds(r, c)) {
      const p = board[r][c]
      if (p) {
        if (p.player === byPlayer && (p.type === 'rook' || p.type === 'queen')) return true
        break
      }
      r += dr
      c += dc
    }
  }

  return false
}

/** Check if the given player's king is in check. */
export function isInCheck(board: Board, player: Player): boolean {
  const kingPos = findKing(board, player)
  if (!kingPos) return false
  return isSquareAttacked(board, kingPos, opponent(player))
}

// ============================================================
// Move Generation (pseudo-legal, then filtered for check)
// ============================================================

function getPawnMoves(board: Board, pos: Position, player: Player, enPassantSquare: Position | null): ValidMove[] {
  const moves: ValidMove[] = []
  const { row, col } = pos
  const dir = player === 1 ? -1 : 1 // White moves up (decreasing row), Black moves down
  const startRow = player === 1 ? 6 : 1
  const promotionRow = player === 1 ? 0 : 7

  // Forward one
  const oneForward = row + dir
  if (inBounds(oneForward, col) && !board[oneForward][col]) {
    if (oneForward === promotionRow) {
      // Promotion - generate all 4 options
      const promotionPieces: PromotionPiece[] = ['queen', 'rook', 'bishop', 'knight']
      for (const promo of promotionPieces) {
        moves.push({
          from: pos, to: { row: oneForward, col },
          isCapture: false, isCastling: false, isEnPassant: false,
          isPromotion: true, promotedTo: promo,
        })
      }
    } else {
      moves.push({
        from: pos, to: { row: oneForward, col },
        isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
      })

      // Forward two from starting position
      const twoForward = row + 2 * dir
      if (row === startRow && inBounds(twoForward, col) && !board[twoForward][col]) {
        moves.push({
          from: pos, to: { row: twoForward, col },
          isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
        })
      }
    }
  }

  // Diagonal captures
  for (const dc of [-1, 1]) {
    const cr = row + dir
    const cc = col + dc
    if (!inBounds(cr, cc)) continue

    const target = board[cr][cc]
    if (target && target.player !== player) {
      if (cr === promotionRow) {
        const promotionPieces: PromotionPiece[] = ['queen', 'rook', 'bishop', 'knight']
        for (const promo of promotionPieces) {
          moves.push({
            from: pos, to: { row: cr, col: cc },
            isCapture: true, isCastling: false, isEnPassant: false,
            isPromotion: true, promotedTo: promo,
          })
        }
      } else {
        moves.push({
          from: pos, to: { row: cr, col: cc },
          isCapture: true, isCastling: false, isEnPassant: false, isPromotion: false,
        })
      }
    }

    // En passant
    if (enPassantSquare && cr === enPassantSquare.row && cc === enPassantSquare.col) {
      moves.push({
        from: pos, to: { row: cr, col: cc },
        isCapture: true, isCastling: false, isEnPassant: true, isPromotion: false,
      })
    }
  }

  return moves
}

function getKnightMoves(board: Board, pos: Position, player: Player): ValidMove[] {
  const moves: ValidMove[] = []
  const offsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ]
  for (const [dr, dc] of offsets) {
    const nr = pos.row + dr
    const nc = pos.col + dc
    if (!inBounds(nr, nc)) continue
    const target = board[nr][nc]
    if (target && target.player === player) continue
    moves.push({
      from: pos, to: { row: nr, col: nc },
      isCapture: !!target, isCastling: false, isEnPassant: false, isPromotion: false,
    })
  }
  return moves
}

function getSlidingMoves(board: Board, pos: Position, player: Player, directions: number[][]): ValidMove[] {
  const moves: ValidMove[] = []
  for (const [dr, dc] of directions) {
    let r = pos.row + dr
    let c = pos.col + dc
    while (inBounds(r, c)) {
      const target = board[r][c]
      if (target) {
        if (target.player !== player) {
          moves.push({
            from: pos, to: { row: r, col: c },
            isCapture: true, isCastling: false, isEnPassant: false, isPromotion: false,
          })
        }
        break
      }
      moves.push({
        from: pos, to: { row: r, col: c },
        isCapture: false, isCastling: false, isEnPassant: false, isPromotion: false,
      })
      r += dr
      c += dc
    }
  }
  return moves
}

function getBishopMoves(board: Board, pos: Position, player: Player): ValidMove[] {
  return getSlidingMoves(board, pos, player, [[-1, -1], [-1, 1], [1, -1], [1, 1]])
}

function getRookMoves(board: Board, pos: Position, player: Player): ValidMove[] {
  return getSlidingMoves(board, pos, player, [[-1, 0], [1, 0], [0, -1], [0, 1]])
}

function getQueenMoves(board: Board, pos: Position, player: Player): ValidMove[] {
  return [
    ...getBishopMoves(board, pos, player),
    ...getRookMoves(board, pos, player),
  ]
}

function getKingMoves(board: Board, pos: Position, player: Player, castlingRights: CastlingRights): ValidMove[] {
  const moves: ValidMove[] = []
  const { row, col } = pos

  // Normal king moves (8 adjacent squares)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (!inBounds(nr, nc)) continue
      const target = board[nr][nc]
      if (target && target.player === player) continue
      moves.push({
        from: pos, to: { row: nr, col: nc },
        isCapture: !!target, isCastling: false, isEnPassant: false, isPromotion: false,
      })
    }
  }

  // Castling
  const opp = opponent(player)
  const isWhite = player === 1
  const backRank = isWhite ? 7 : 0

  // Only if king is on its starting square and not in check
  if (row === backRank && col === 4 && !isSquareAttacked(board, pos, opp)) {
    // Kingside castling
    const kingsideRight = isWhite ? castlingRights.whiteKingside : castlingRights.blackKingside
    if (kingsideRight) {
      const rookPos = board[backRank][7]
      if (
        rookPos && rookPos.type === 'rook' && rookPos.player === player &&
        !board[backRank][5] && !board[backRank][6] &&
        !isSquareAttacked(board, { row: backRank, col: 5 }, opp) &&
        !isSquareAttacked(board, { row: backRank, col: 6 }, opp)
      ) {
        moves.push({
          from: pos, to: { row: backRank, col: 6 },
          isCapture: false, isCastling: true, castlingSide: 'kingside',
          isEnPassant: false, isPromotion: false,
        })
      }
    }

    // Queenside castling
    const queensideRight = isWhite ? castlingRights.whiteQueenside : castlingRights.blackQueenside
    if (queensideRight) {
      const rookPos = board[backRank][0]
      if (
        rookPos && rookPos.type === 'rook' && rookPos.player === player &&
        !board[backRank][1] && !board[backRank][2] && !board[backRank][3] &&
        !isSquareAttacked(board, { row: backRank, col: 3 }, opp) &&
        !isSquareAttacked(board, { row: backRank, col: 2 }, opp)
      ) {
        moves.push({
          from: pos, to: { row: backRank, col: 2 },
          isCapture: false, isCastling: true, castlingSide: 'queenside',
          isEnPassant: false, isPromotion: false,
        })
      }
    }
  }

  return moves
}

/** Get pseudo-legal moves for a piece, then filter for check safety. */
function getPseudoLegalMoves(board: Board, pos: Position, player: Player, castlingRights: CastlingRights, enPassantSquare: Position | null): ValidMove[] {
  const piece = board[pos.row][pos.col]
  if (!piece || piece.player !== player) return []

  switch (piece.type) {
    case 'pawn': return getPawnMoves(board, pos, player, enPassantSquare)
    case 'knight': return getKnightMoves(board, pos, player)
    case 'bishop': return getBishopMoves(board, pos, player)
    case 'rook': return getRookMoves(board, pos, player)
    case 'queen': return getQueenMoves(board, pos, player)
    case 'king': return getKingMoves(board, pos, player, castlingRights)
  }
}

/** Apply a move to a board clone (for check testing). Does not handle all special moves fully. */
function applyMoveToBoard(board: Board, move: ValidMove): Board {
  const newBoard = cloneBoard(board)
  const piece = newBoard[move.from.row][move.from.col]
  if (!piece) return newBoard

  // Handle en passant capture
  if (move.isEnPassant) {
    const capturedPawnRow = move.from.row // captured pawn is on same row as moving pawn
    newBoard[capturedPawnRow][move.to.col] = null
  }

  // Handle castling - move the rook too
  if (move.isCastling) {
    const backRank = move.from.row
    if (move.castlingSide === 'kingside') {
      newBoard[backRank][5] = newBoard[backRank][7]
      newBoard[backRank][7] = null
    } else {
      newBoard[backRank][3] = newBoard[backRank][0]
      newBoard[backRank][0] = null
    }
  }

  // Move piece
  newBoard[move.to.row][move.to.col] = piece
  newBoard[move.from.row][move.from.col] = null

  // Handle promotion
  if (move.isPromotion && move.promotedTo) {
    newBoard[move.to.row][move.to.col] = { player: piece.player, type: move.promotedTo }
  }

  return newBoard
}

/** Filter pseudo-legal moves to only legal ones (moves that don't leave own king in check). */
function filterLegalMoves(board: Board, moves: ValidMove[], player: Player): ValidMove[] {
  return moves.filter(move => {
    const newBoard = applyMoveToBoard(board, move)
    return !isInCheck(newBoard, player)
  })
}

/** Get all legal moves for a specific piece. */
export function getValidMovesForPiece(
  board: Board,
  pos: Position,
  castlingRights: CastlingRights,
  enPassantSquare: Position | null
): ValidMove[] {
  const piece = board[pos.row][pos.col]
  if (!piece) return []
  const pseudoLegal = getPseudoLegalMoves(board, pos, piece.player, castlingRights, enPassantSquare)
  return filterLegalMoves(board, pseudoLegal, piece.player)
}

/** Get all legal moves for a player. */
export function getAllValidMoves(
  board: Board,
  player: Player,
  castlingRights: CastlingRights,
  enPassantSquare: Position | null
): ValidMove[] {
  const allMoves: ValidMove[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece && piece.player === player) {
        const pieceMoves = getPseudoLegalMoves(board, { row, col }, player, castlingRights, enPassantSquare)
        allMoves.push(...pieceMoves)
      }
    }
  }
  return filterLegalMoves(board, allMoves, player)
}

// ============================================================
// Move Application
// ============================================================

/** Apply a validated move to produce a new board state. Returns the new board. */
export function applyMove(board: Board, move: ValidMove): Board {
  return applyMoveToBoard(board, move)
}

// ============================================================
// Game Over Detection
// ============================================================

/** Check if a player has insufficient material to checkmate. */
function getPlayerPieces(board: Board, player: Player): { type: PieceType; row: number; col: number }[] {
  const pieces: { type: PieceType; row: number; col: number }[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece && piece.player === player) {
        pieces.push({ type: piece.type, row, col })
      }
    }
  }
  return pieces
}

/** Check for insufficient material draw (K vs K, K+N vs K, K+B vs K, K+B vs K+B same color). */
export function hasInsufficientMaterial(board: Board): boolean {
  const white = getPlayerPieces(board, 1)
  const black = getPlayerPieces(board, 2)

  const whiteNonKing = white.filter(p => p.type !== 'king')
  const blackNonKing = black.filter(p => p.type !== 'king')

  // K vs K
  if (whiteNonKing.length === 0 && blackNonKing.length === 0) return true

  // K+N vs K or K vs K+N
  if (whiteNonKing.length === 0 && blackNonKing.length === 1 && blackNonKing[0].type === 'knight') return true
  if (blackNonKing.length === 0 && whiteNonKing.length === 1 && whiteNonKing[0].type === 'knight') return true

  // K+B vs K or K vs K+B
  if (whiteNonKing.length === 0 && blackNonKing.length === 1 && blackNonKing[0].type === 'bishop') return true
  if (blackNonKing.length === 0 && whiteNonKing.length === 1 && whiteNonKing[0].type === 'bishop') return true

  // K+B vs K+B (same color bishops)
  if (whiteNonKing.length === 1 && blackNonKing.length === 1 &&
      whiteNonKing[0].type === 'bishop' && blackNonKing[0].type === 'bishop') {
    const wSquareColor = (whiteNonKing[0].row + whiteNonKing[0].col) % 2
    const bSquareColor = (blackNonKing[0].row + blackNonKing[0].col) % 2
    if (wSquareColor === bSquareColor) return true
  }

  return false
}

/** Create a position hash for 3-fold repetition detection. */
export function hashBoard(board: Board, currentPlayer: Player, castlingRights: CastlingRights, enPassantSquare: Position | null): string {
  let hash = ''
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece) {
        hash += `${piece.player}${piece.type === 'knight' ? 'n' : piece.type[0]}${row}${col}`
      }
    }
  }
  hash += `|${currentPlayer}`
  hash += `|${castlingRights.whiteKingside ? 'K' : ''}${castlingRights.whiteQueenside ? 'Q' : ''}${castlingRights.blackKingside ? 'k' : ''}${castlingRights.blackQueenside ? 'q' : ''}`
  if (enPassantSquare) {
    hash += `|ep${enPassantSquare.row}${enPassantSquare.col}`
  }
  return hash
}

export interface GameOverResult {
  isOver: boolean
  winner: Player | null
  drawReason?: DrawReason
}

/** Check all game-ending conditions. */
export function checkGameOver(
  board: Board,
  currentPlayer: Player,
  castlingRights: CastlingRights,
  enPassantSquare: Position | null,
  halfmoveClock: number,
  positionHistory: string[]
): GameOverResult {
  const validMoves = getAllValidMoves(board, currentPlayer, castlingRights, enPassantSquare)

  if (validMoves.length === 0) {
    if (isInCheck(board, currentPlayer)) {
      // Checkmate - the other player wins
      return { isOver: true, winner: opponent(currentPlayer) }
    } else {
      // Stalemate
      return { isOver: true, winner: null, drawReason: 'stalemate' }
    }
  }

  // 50-move rule (100 half-moves)
  if (halfmoveClock >= DRAW_MOVE_LIMIT) {
    return { isOver: true, winner: null, drawReason: 'fifty_move' }
  }

  // 3-fold repetition
  const currentHash = hashBoard(board, currentPlayer, castlingRights, enPassantSquare)
  const repetitions = positionHistory.filter(h => h === currentHash).length
  if (repetitions >= REPETITION_DRAW_COUNT) {
    return { isOver: true, winner: null, drawReason: 'threefold_repetition' }
  }

  // Insufficient material
  if (hasInsufficientMaterial(board)) {
    return { isOver: true, winner: null, drawReason: 'insufficient_material' }
  }

  return { isOver: false, winner: null }
}

// ============================================================
// Shared Helpers (used by both computeNextGameState and AI minimax)
// ============================================================

/** Update castling rights after a move. */
export function updateCastlingRights(rights: CastlingRights, board: Board, move: ValidMove): CastlingRights {
  const newRights = { ...rights }
  const piece = board[move.from.row][move.from.col]
  if (!piece) return newRights

  if (piece.type === 'king') {
    if (piece.player === 1) {
      newRights.whiteKingside = false
      newRights.whiteQueenside = false
    } else {
      newRights.blackKingside = false
      newRights.blackQueenside = false
    }
  }

  // Rook moved
  if (move.from.row === 7 && move.from.col === 0) newRights.whiteQueenside = false
  if (move.from.row === 7 && move.from.col === 7) newRights.whiteKingside = false
  if (move.from.row === 0 && move.from.col === 0) newRights.blackQueenside = false
  if (move.from.row === 0 && move.from.col === 7) newRights.blackKingside = false

  // Rook captured
  if (move.to.row === 7 && move.to.col === 0) newRights.whiteQueenside = false
  if (move.to.row === 7 && move.to.col === 7) newRights.whiteKingside = false
  if (move.to.row === 0 && move.to.col === 0) newRights.blackQueenside = false
  if (move.to.row === 0 && move.to.col === 7) newRights.blackKingside = false

  return newRights
}

/** Get new en passant square after a move. Returns null if no en passant opportunity. */
export function getNewEnPassant(board: Board, move: ValidMove): Position | null {
  const piece = board[move.from.row][move.from.col]
  if (piece && piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
    return {
      row: (move.from.row + move.to.row) / 2,
      col: move.from.col,
    }
  }
  return null
}

// ============================================================
// State Transitions
// ============================================================

/** Compute the next game state after applying a move. Pure state transition. */
export function computeNextGameState(state: GameState, move: ValidMove): GameState {
  const piece = state.board[move.from.row][move.from.col]
  if (!piece) throw new Error('No piece at move source')

  const newBoard = applyMove(state.board, move)
  const nextPlayer = opponent(state.currentPlayer)

  // Update castling rights and en passant square
  const newCastlingRights = updateCastlingRights(state.castlingRights, state.board, move)
  const newEnPassantSquare = getNewEnPassant(state.board, move)

  // Update halfmove clock (resets on pawn move or capture)
  const newHalfmoveClock = (piece.type === 'pawn' || move.isCapture) ? 0 : state.halfmoveClock + 1

  // Update fullmove number (increments after Black's move)
  const newFullmoveNumber = state.currentPlayer === 2 ? state.fullmoveNumber + 1 : state.fullmoveNumber

  // Count pieces
  const [whiteCount, blackCount] = countPieces(newBoard)

  // Check if next player is in check
  const nextPlayerInCheck = isInCheck(newBoard, nextPlayer)

  // Build the recorded move
  const captured = state.board[move.to.row][move.to.col]
  const capturedType = move.isEnPassant ? 'pawn' : (captured ? captured.type : undefined)

  // Check for checkmate (for move recording)
  const nextMoves = getAllValidMoves(newBoard, nextPlayer, newCastlingRights, newEnPassantSquare)
  const isCheckmate = nextPlayerInCheck && nextMoves.length === 0

  // Compute disambiguation for algebraic notation (needed when two same-type pieces can reach same square)
  let disambiguation: string | undefined
  if (piece.type !== 'pawn' && piece.type !== 'king') {
    const sameTypeMoves = state.validMoves.filter(
      (m) => m.to.row === move.to.row && m.to.col === move.to.col &&
             (m.from.row !== move.from.row || m.from.col !== move.from.col) &&
             state.board[m.from.row][m.from.col]?.type === piece.type
    )
    if (sameTypeMoves.length > 0) {
      const sameFile = sameTypeMoves.some((m) => m.from.col === move.from.col)
      const sameRank = sameTypeMoves.some((m) => m.from.row === move.from.row)
      const COL_LETTERS = 'abcdefgh'
      if (!sameFile) {
        disambiguation = COL_LETTERS[move.from.col]
      } else if (!sameRank) {
        disambiguation = String(8 - move.from.row)
      } else {
        disambiguation = COL_LETTERS[move.from.col] + String(8 - move.from.row)
      }
    }
  }

  const recordedMove: Move = {
    from: move.from,
    to: move.to,
    player: state.currentPlayer,
    piece: piece.type,
    captured: capturedType,
    isCapture: move.isCapture,
    isCastling: move.isCastling,
    castlingSide: move.castlingSide,
    isEnPassant: move.isEnPassant,
    isPromotion: move.isPromotion,
    promotedTo: move.promotedTo,
    isCheck: nextPlayerInCheck,
    isCheckmate,
    disambiguation,
  }

  // Update position history for repetition detection
  const positionHash = hashBoard(newBoard, nextPlayer, newCastlingRights, newEnPassantSquare)
  const newPositionHistory = [...state.positionHistory, positionHash]

  // Achievement tracking updates
  const hadQueenCaptured = state.hadQueenCaptured || (move.isCapture && capturedType === 'queen')
  const promotedPawnCount = state.promotedPawnCount + (move.isPromotion ? 1 : 0)
  const castledThisGame = state.castledThisGame || move.isCastling
  const usedEnPassant = state.usedEnPassant || move.isEnPassant

  // Track material deficit for comeback achievement
  const whiteMaterial = getMaterialValue(newBoard, 1)
  const blackMaterial = getMaterialValue(newBoard, 2)
  const playerMaterial = whiteMaterial // Player is always white (player 1)
  const opponentMaterial = blackMaterial
  const wasDownByMaterial = state.wasDownByMaterial || (playerMaterial + COMEBACK_MATERIAL_DEFICIT < opponentMaterial)

  // Check game over
  const gameOver = checkGameOver(newBoard, nextPlayer, newCastlingRights, newEnPassantSquare, newHalfmoveClock, newPositionHistory)

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    status: gameOver.isOver ? (gameOver.winner ? 'won' : 'draw') : 'playing',
    winner: gameOver.winner,
    drawReason: gameOver.drawReason,
    moveHistory: [...state.moveHistory, recordedMove],
    lastMove: recordedMove,
    whiteCount,
    blackCount,
    validMoves: nextMoves,
    castlingRights: newCastlingRights,
    enPassantSquare: newEnPassantSquare,
    halfmoveClock: newHalfmoveClock,
    fullmoveNumber: newFullmoveNumber,
    isInCheck: nextPlayerInCheck,
    positionHistory: newPositionHistory,
    pendingPromotion: null,
    hadQueenCaptured,
    promotedPawnCount,
    castledThisGame,
    usedEnPassant,
    wasDownByMaterial,
  }
}

/** Creates initial game state. */
export function createInitialGameState(mode: GameMode = 'pvc', difficulty: Difficulty = 'medium'): GameState {
  const board = createInitialBoard()
  const castlingRights: CastlingRights = {
    whiteKingside: true,
    whiteQueenside: true,
    blackKingside: true,
    blackQueenside: true,
  }
  const validMoves = getAllValidMoves(board, 1, castlingRights, null)

  // Seed the initial position into history for accurate 3-fold repetition detection
  const initialHash = hashBoard(board, 1, castlingRights, null)

  return {
    board,
    currentPlayer: 1,
    status: 'playing',
    winner: null,
    mode,
    difficulty,
    moveHistory: [],
    lastMove: undefined,
    whiteCount: 16,
    blackCount: 16,
    validMoves,
    castlingRights,
    enPassantSquare: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    isInCheck: false,
    undoState: null,
    positionHistory: [initialHash],
    pendingPromotion: null,
    hadQueenCaptured: false,
    promotedPawnCount: 0,
    castledThisGame: false,
    usedEnPassant: false,
    wasDownByMaterial: false,
  }
}
