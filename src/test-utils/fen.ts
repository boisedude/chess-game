import type { Board, CastlingRights, GameState, PieceType, Player, Position } from '@/types/chess.types'
import { createInitialGameState, getAllValidMoves } from '@/lib/chessRules'

const TYPES: Record<string, PieceType> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }

/** Build a GameState from a FEN string, for tests. */
export function fromFen(fen: string): { state: GameState; player: Player } {
  const [placement, turn, castling, enPassant, halfmove] = fen.split(' ')
  const board: Board = placement.split('/').map((rank) => {
    const row: Board[number] = []
    for (const ch of rank) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) row.push(null)
      else row.push({ player: ch === ch.toUpperCase() ? 1 : 2, type: TYPES[ch.toLowerCase()] })
    }
    return row
  })
  const player: Player = turn === 'b' ? 2 : 1
  const castlingRights: CastlingRights = {
    whiteKingside: castling.includes('K'),
    whiteQueenside: castling.includes('Q'),
    blackKingside: castling.includes('k'),
    blackQueenside: castling.includes('q'),
  }
  const enPassantSquare: Position | null =
    enPassant && enPassant !== '-' ? { row: 8 - Number(enPassant[1]), col: enPassant.charCodeAt(0) - 97 } : null
  const state: GameState = {
    ...createInitialGameState('pvc', 'hard'),
    board,
    currentPlayer: player,
    castlingRights,
    enPassantSquare,
    halfmoveClock: Number(halfmove ?? 0),
    moveHistory: [],
    positionHistory: [],
  }
  state.validMoves = getAllValidMoves(board, player, castlingRights, enPassantSquare)
  return { state, player }
}

export function square(pos: Position): string {
  return String.fromCharCode(97 + pos.col) + (8 - pos.row)
}
