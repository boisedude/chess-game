/**
 * Chess Game Type Definitions
 *
 * Core domain types for the chess game engine.
 * Exports: Player, PieceType, Piece, Board, GameState, Move, ValidMove, UndoState,
 * LeaderboardEntry, CastlingRights, BOARD_SIZE, PIECE_SYMBOLS, PIECE_VALUES.
 *
 * Player 1 = White (human), Player 2 = Black (AI or second human).
 * Board is 8x8, Row 0 = Black back rank (rank 8), Row 7 = White back rank (rank 1).
 */

export type Player = 1 | 2
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'

export interface Piece {
  player: Player
  type: PieceType
}

export type CellValue = Piece | null
export const BOARD_SIZE = 8
export type Board = CellValue[][]

/** Game lifecycle: setup -> playing -> won | draw */
export type GameStatus = 'setup' | 'playing' | 'won' | 'draw'
export type GameMode = 'pvp' | 'pvc'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Position {
  row: number
  col: number
}

export interface CastlingRights {
  whiteKingside: boolean
  whiteQueenside: boolean
  blackKingside: boolean
  blackQueenside: boolean
}

/** Promotion piece type (pawn can become any of these) */
export type PromotionPiece = 'queen' | 'rook' | 'bishop' | 'knight'

/** Recorded move including special move metadata */
export interface Move {
  from: Position
  to: Position
  player: Player
  piece: PieceType
  captured?: PieceType
  isCapture: boolean
  isCastling: boolean
  castlingSide?: 'kingside' | 'queenside'
  isEnPassant: boolean
  isPromotion: boolean
  promotedTo?: PieceType
  isCheck: boolean
  isCheckmate: boolean
  /** Disambiguation string for algebraic notation (file, rank, or both) when multiple same-type pieces can reach the same square */
  disambiguation?: string
}

/** Candidate move for selection/AI. score is optionally set by AI evaluation. */
export interface ValidMove {
  from: Position
  to: Position
  isCapture: boolean
  isCastling: boolean
  castlingSide?: 'kingside' | 'queenside'
  isEnPassant: boolean
  isPromotion: boolean
  promotedTo?: PieceType
  score?: number
}

/** Snapshot for single-level undo. Stored before player's move. */
export interface UndoState {
  board: Board
  currentPlayer: Player
  lastMove?: Move
  whiteCount: number
  blackCount: number
  validMoves: ValidMove[]
  castlingRights: CastlingRights
  enPassantSquare: Position | null
  halfmoveClock: number
  fullmoveNumber: number
  isInCheck: boolean
}

/** Draw reason for display */
export type DrawReason = 'stalemate' | 'fifty_move' | 'threefold_repetition' | 'insufficient_material' | 'agreement'

/** Pending promotion state */
export interface PendingPromotion {
  from: Position
  to: Position
  player: Player
}

/** Complete game state. Central data structure for the entire game. */
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  mode: GameMode
  difficulty: Difficulty
  moveHistory: Move[]
  lastMove?: Move
  whiteCount: number
  blackCount: number
  validMoves: ValidMove[]
  castlingRights: CastlingRights
  enPassantSquare: Position | null
  halfmoveClock: number
  fullmoveNumber: number
  isInCheck: boolean
  drawReason?: DrawReason
  undoState: UndoState | null
  /** Board hashes for 3-fold repetition draw detection */
  positionHistory: string[]
  /** Pending pawn promotion awaiting player choice */
  pendingPromotion: PendingPromotion | null
  /** Achievement tracking */
  hadQueenCaptured: boolean
  promotedPawnCount: number
  castledThisGame: boolean
  usedEnPassant: boolean
  wasDownByMaterial: boolean
}

/** Single-player cumulative stats, persisted in localStorage. */
export interface LeaderboardEntry {
  playerName: string
  wins: number
  losses: number
  draws: number
  winStreak: number
  longestWinStreak: number
  largestWinMargin: number
  perfectGames: number
  totalGames: number
  totalCaptures: number
}

/** Unicode symbols for each piece type by player.
 * Both players use the filled set (U+265A-265F) for consistent cross-platform rendering.
 * U+FE0E forces text presentation to prevent emoji rendering on Windows.
 * Visual distinction is handled by CSS classes (chess-piece-white / chess-piece-black).
 */
export const PIECE_SYMBOLS: Record<Player, Record<PieceType, string>> = {
  1: {
    king: '\u265A\uFE0E',
    queen: '\u265B\uFE0E',
    rook: '\u265C\uFE0E',
    bishop: '\u265D\uFE0E',
    knight: '\u265E\uFE0E',
    pawn: '\u265F\uFE0E',
  },
  2: {
    king: '\u265A\uFE0E',
    queen: '\u265B\uFE0E',
    rook: '\u265C\uFE0E',
    bishop: '\u265D\uFE0E',
    knight: '\u265E\uFE0E',
    pawn: '\u265F\uFE0E',
  },
}

/** Material values in centipawns */
export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
}
