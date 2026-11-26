import { engineLegalMoves, findBestMove, perft } from '@/lib/engine'
import { getAIMove } from '@/lib/aiStrategies'
import { computeNextGameState, createInitialGameState, getAllValidMoves } from '@/lib/chessRules'
import type { GameState, ValidMove } from '@/types/chess.types'
import { fromFen, square } from '@/test-utils/fen'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('engine move generation (perft)', () => {
  const cases: [string, string, number, number][] = [
    ['start', START, 4, 197281],
    ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
    ['rook ending', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
    ['promotions', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
    ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
  ]
  it.each(cases)('%s', (_name, fen, depth, expected) => {
    const { state, player } = fromFen(fen)
    expect(perft(state, player, depth)).toBe(expected)
  })
})

/** Small deterministic generator so the fuzz tests replay the same games. */
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function key(m: { from: ValidMove['from']; to: ValidMove['to']; promotedTo?: string }): string {
  return square(m.from) + square(m.to) + (m.promotedTo ?? '')
}

describe('engine agrees with the rules module', () => {
  it('lists the same legal moves through 30 random games', () => {
    const random = seeded(7)
    let positions = 0
    for (let game = 0; game < 30; game++) {
      let state: GameState = createInitialGameState('pvp', 'hard')
      for (let ply = 0; ply < 120 && state.status === 'playing'; ply++) {
        const rules = getAllValidMoves(state.board, state.currentPlayer, state.castlingRights, state.enPassantSquare)
        const engine = engineLegalMoves(state, state.currentPlayer)
        expect(engine.map(key).sort()).toEqual(rules.map(key).sort())
        positions++
        state = computeNextGameState(state, rules[Math.floor(random() * rules.length)])
      }
    }
    expect(positions).toBeGreaterThan(1500)
  })
})

describe('engine search', () => {
  const best = (fen: string, depth: number) => {
    const { state, player } = fromFen(fen)
    const r = findBestMove(state, player, { maxDepth: depth })!
    return { move: square(r.from) + square(r.to), score: r.score, promotedTo: r.promotedTo }
  }

  it('mates in one', () => {
    expect(best('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 2).move).toBe('a1a8')
  })

  it('finds a smothered mate in two by sacrificing the queen', () => {
    // 1.Qg8+ Rxg8 2.Nf7#
    const r = best('r6k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1', 4)
    expect(r.move).toBe('b3g8')
    expect(r.score).toBeGreaterThan(29000)
  })

  it('finds a mate in three', () => {
    // 1.Rh8+ Kxh8 2.Qh6+ Kg8 3.Qg7# (bishop on b2 covers the long diagonal)
    const r = best('6k1/5p2/6p1/8/8/3Q4/1B6/6KR w - - 0 1', 6)
    expect(r.score).toBeGreaterThan(29000)
  })

  it('wins a piece with a fork', () => {
    // Nc7+ forks king and rook
    expect(best('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', 4).move).toBe('d5c7')
  })

  it('saves a queen that a pawn attacks', () => {
    const r = best('4k3/8/8/3q4/4P3/8/8/4K3 b - - 0 1', 4)
    expect(r.score).toBeGreaterThan(700)
  })

  it('declines a pawn that costs the queen', () => {
    // Qxb7 is met by Rb8 and the queen has no way out past a6 and c6
    const r = best('r4rk1/1p3ppp/p1n5/8/8/8/PQ3PPP/6K1 w - - 0 1', 5)
    expect(r.move).not.toBe('b2b7')
  })

  it('underpromotes when a queen would stalemate or a knight mates', () => {
    // f8=N# is mate; f8=Q is not
    const r = best('8/5P1k/5K2/8/8/8/8/6R1 w - - 0 1', 4)
    expect(r.score).toBeGreaterThan(29000)
  })

  it('returns null when it has been mated', () => {
    const { state, player } = fromFen('4k3/8/8/8/8/8/5PPP/4r1K1 w - - 0 1')
    expect(findBestMove(state, player, { maxDepth: 3 })).toBeNull()
  })

  it('converts king and rook against king', () => {
    let { state } = fromFen('8/8/8/4k3/8/8/8/R3K3 w - - 0 1')
    for (let ply = 0; ply < 70 && state.status === 'playing'; ply++) {
      const r = findBestMove(state, state.currentPlayer, { maxDepth: 8 })!
      const move = state.validMoves.find((m) => key(m) === key(r))!
      state = computeNextGameState(state, move)
    }
    expect(state.status).toBe('won')
    expect(state.winner).toBe(1)
  })

  it('answers inside its time budget', () => {
    const { state, player } = fromFen('r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 0 9')
    const t = Date.now()
    const r = findBestMove(state, player, { timeMs: 200 })!
    expect(Date.now() - t).toBeLessThan(450)
    expect(r.depth).toBeGreaterThanOrEqual(4)
  })
})

describe('getAIMove', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%s only ever plays legal moves', (difficulty) => {
    const random = seeded(11)
    let state: GameState = createInitialGameState('pvc', difficulty)
    for (let ply = 0; ply < 60 && state.status === 'playing'; ply++) {
      const legal = getAllValidMoves(state.board, state.currentPlayer, state.castlingRights, state.enPassantSquare)
      const move =
        ply % 2 === 0
          ? legal[Math.floor(random() * legal.length)]
          : getAIMove(state, state.currentPlayer, difficulty, { timeMs: 20 })!
      expect(legal).toContainEqual(move)
      state = computeNextGameState(state, move)
    }
  })

  it('returns null when there is no legal move', () => {
    const { state, player } = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
    expect(getAIMove(state, player, 'hard')).toBeNull()
  })
})
