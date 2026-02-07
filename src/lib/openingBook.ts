/**
 * Opening Book for Chess AI
 *
 * Provides book moves for the first ~8-10 moves of a game so that
 * Hard and Medium AI play established openings instead of calculating
 * from scratch. Easy AI never uses the book.
 *
 * The book is stored as a tree keyed by algebraic notation move sequences.
 * Lookup converts moveHistory → algebraic → tree traversal.
 * Moves are weighted by popularity (higher weight = more likely to be picked).
 */

import type { GameState, ValidMove, Move } from '@/types/chess.types'
import { getAllValidMoves } from './chessRules'
import { moveToAlgebraic } from './moveNotation'

// ============================================================
// Book Data Structure
// ============================================================

interface WeightedMove {
  move: string
  weight: number
}

interface BookNode {
  /** Possible response moves with weights (higher = more likely). */
  moves?: WeightedMove[]
  /** Children keyed by algebraic notation (without +/#) of the next move played. */
  children?: Record<string, BookNode>
}

/** Shorthand: create a weighted move with default weight 1. */
function m(move: string, weight = 1): WeightedMove {
  return { move, weight }
}

// ============================================================
// Opening Tree
//
// Notation is standard algebraic without check/checkmate suffixes.
// The tree is traversed by converting moveHistory to algebraic.
//
// Openings covered:
// - 1.e4: Italian, Ruy Lopez, Scotch, Vienna, Sicilian (Najdorf/Classical/Kan),
//         French, Caro-Kann, Scandinavian
// - 1.d4: QGD, QGA, Slav, King's Indian, Nimzo-Indian, Queen's Indian
// ============================================================

const OPENING_BOOK: BookNode = {
  // Root: AI plays as White (move 1)
  moves: [m('e4', 3), m('d4', 2)],
  children: {
    // ================================================================
    // 1.e4 lines
    // ================================================================
    'e4': {
      moves: [m('e5', 3), m('c5', 3), m('e6', 2), m('c6', 2), m('d5', 1)],
      children: {
        // ----------------------------------------------------------
        // 1.e4 e5
        // ----------------------------------------------------------
        'e5': {
          moves: [m('Nf3', 4), m('Bc4', 1), m('Nc3', 1)],
          children: {
            // 1.e4 e5 2.Nf3
            'Nf3': {
              moves: [m('Nc6', 4), m('Nf6', 1)],
              children: {
                // 1.e4 e5 2.Nf3 Nc6
                'Nc6': {
                  moves: [m('Bb5', 3), m('Bc4', 3), m('d4', 1)],
                  children: {
                    // Italian Game: 1.e4 e5 2.Nf3 Nc6 3.Bc4
                    'Bc4': {
                      moves: [m('Bc5', 3), m('Nf6', 2)],
                      children: {
                        // Giuoco Piano: 3...Bc5
                        'Bc5': {
                          moves: [m('c3', 2), m('d3', 2)],
                          children: {
                            'c3': { moves: [m('Nf6', 2), m('d6', 1)] },
                            'd3': { moves: [m('Nf6', 2), m('d6', 1)] },
                          },
                        },
                        // Two Knights: 3...Nf6
                        'Nf6': {
                          moves: [m('d3', 2), m('Ng5', 1)],
                          children: {
                            'd3': { moves: [m('Bc5', 2), m('Be7', 1)] },
                            'Ng5': { moves: [m('d5', 3)] },
                          },
                        },
                      },
                    },
                    // Ruy Lopez: 1.e4 e5 2.Nf3 Nc6 3.Bb5
                    'Bb5': {
                      moves: [m('a6', 3), m('Nf6', 2), m('Bc5', 1)],
                      children: {
                        // Morphy Defense: 3...a6
                        'a6': {
                          moves: [m('Ba4', 3), m('Bxc6', 1)],
                          children: {
                            'Ba4': {
                              moves: [m('Nf6', 3), m('b5', 1)],
                              children: {
                                'Nf6': {
                                  moves: [m('O-O', 3)],
                                  children: {
                                    'O-O': {
                                      moves: [m('Be7', 3), m('Nxe4', 1)],
                                      children: {
                                        'Be7': { moves: [m('Re1', 2), m('d3', 1)] },
                                        'Nxe4': { moves: [m('d4')] },
                                      },
                                    },
                                  },
                                },
                                'b5': { moves: [m('Bb3')] },
                              },
                            },
                            'Bxc6': { moves: [m('dxc6')] },
                          },
                        },
                        // Berlin Defense: 3...Nf6
                        'Nf6': {
                          moves: [m('O-O', 3)],
                          children: {
                            'O-O': { moves: [m('Nxe4', 2), m('Bc5', 1)] },
                          },
                        },
                      },
                    },
                    // Scotch Game: 1.e4 e5 2.Nf3 Nc6 3.d4
                    'd4': {
                      moves: [m('exd4', 3)],
                      children: {
                        'exd4': {
                          moves: [m('Nxd4', 3)],
                          children: {
                            'Nxd4': {
                              moves: [m('Nf6', 2), m('Bc5', 2)],
                              children: {
                                'Bc5': { moves: [m('Be3', 2), m('Nxc6', 1)] },
                                'Nf6': { moves: [m('Nxc6', 2), m('Nc3', 1)] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                // Petroff Defense: 1.e4 e5 2.Nf3 Nf6
                'Nf6': {
                  moves: [m('Nxe5', 2), m('d4', 1)],
                  children: {
                    'Nxe5': {
                      moves: [m('d6', 3)],
                      children: {
                        'd6': { moves: [m('Nf3', 2), m('Nc4', 1)] },
                      },
                    },
                  },
                },
              },
            },
            // 1.e4 e5 2.Bc4 (Italian without Nf3)
            'Bc4': {
              moves: [m('Nf6', 2), m('Bc5', 1)],
              children: {
                'Nf6': { moves: [m('d3', 2), m('Nf3', 1)] },
              },
            },
            // 1.e4 e5 2.Nc3 (Vienna)
            'Nc3': {
              moves: [m('Nf6', 3), m('Nc6', 1)],
              children: {
                'Nf6': { moves: [m('Bc4', 2), m('f4', 1)] },
              },
            },
          },
        },
        // ----------------------------------------------------------
        // 1.e4 c5 (Sicilian Defense)
        // ----------------------------------------------------------
        'c5': {
          moves: [m('Nf3', 4), m('Nc3', 1)],
          children: {
            'Nf3': {
              moves: [m('d6', 3), m('Nc6', 2), m('e6', 2)],
              children: {
                // Najdorf path: 1.e4 c5 2.Nf3 d6
                'd6': {
                  moves: [m('d4', 3)],
                  children: {
                    'd4': {
                      moves: [m('cxd4', 3)],
                      children: {
                        'cxd4': {
                          moves: [m('Nxd4', 3)],
                          children: {
                            'Nxd4': {
                              moves: [m('Nf6', 3), m('a6', 1)],
                              children: {
                                'Nf6': {
                                  moves: [m('Nc3', 3)],
                                  children: {
                                    // 5.Nc3 a6 (Najdorf)
                                    'Nc3': {
                                      moves: [m('a6', 3), m('Nc6', 1)],
                                      children: {
                                        'a6': { moves: [m('Be2', 2), m('Bg5', 2), m('Bc4', 1)] },
                                        'Nc6': { moves: [m('Bg5', 2), m('Be2', 1)] },
                                      },
                                    },
                                  },
                                },
                                'a6': { moves: [m('Nc3', 2), m('Be2', 1)] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                // Classical Sicilian: 1.e4 c5 2.Nf3 Nc6
                'Nc6': {
                  moves: [m('d4', 3)],
                  children: {
                    'd4': {
                      moves: [m('cxd4', 3)],
                      children: {
                        'cxd4': {
                          moves: [m('Nxd4', 3)],
                          children: {
                            'Nxd4': {
                              moves: [m('Nf6', 2), m('e6', 1)],
                              children: {
                                'Nf6': { moves: [m('Nc3')] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                // Scheveningen/Kan: 1.e4 c5 2.Nf3 e6
                'e6': {
                  moves: [m('d4', 3)],
                  children: {
                    'd4': {
                      moves: [m('cxd4', 3)],
                      children: {
                        'cxd4': {
                          moves: [m('Nxd4', 3)],
                          children: {
                            'Nxd4': { moves: [m('a6', 2), m('Nf6', 2), m('Nc6', 1)] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            // Closed Sicilian: 1.e4 c5 2.Nc3
            'Nc3': {
              moves: [m('Nc6', 2), m('d6', 1)],
            },
          },
        },
        // ----------------------------------------------------------
        // 1.e4 e6 (French Defense)
        // ----------------------------------------------------------
        'e6': {
          moves: [m('d4', 3)],
          children: {
            'd4': {
              moves: [m('d5', 3)],
              children: {
                'd5': {
                  moves: [m('Nc3', 3), m('Nd2', 2), m('e5', 2)],
                  children: {
                    // Classical/Winawer: 3.Nc3
                    'Nc3': {
                      moves: [m('Bb4', 2), m('Nf6', 2)],
                      children: {
                        'Bb4': {
                          moves: [m('e5', 3)],
                          children: {
                            'e5': { moves: [m('c5', 2), m('Ne7', 1)] },
                          },
                        },
                        'Nf6': {
                          moves: [m('Bg5', 2), m('e5', 1)],
                        },
                      },
                    },
                    // Tarrasch: 3.Nd2
                    'Nd2': {
                      moves: [m('Nf6', 2), m('c5', 2)],
                      children: {
                        'Nf6': { moves: [m('e5')] },
                        'c5': { moves: [m('exd5', 2), m('Ngf3', 1)] },
                      },
                    },
                    // Advance: 3.e5
                    'e5': {
                      moves: [m('c5', 3)],
                      children: {
                        'c5': {
                          moves: [m('c3', 3)],
                          children: {
                            'c3': { moves: [m('Nc6', 2), m('Qb6', 1)] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // ----------------------------------------------------------
        // 1.e4 c6 (Caro-Kann Defense)
        // ----------------------------------------------------------
        'c6': {
          moves: [m('d4', 3)],
          children: {
            'd4': {
              moves: [m('d5', 3)],
              children: {
                'd5': {
                  moves: [m('Nc3', 2), m('Nd2', 1), m('e5', 1), m('exd5', 2)],
                  children: {
                    // Main Line: 3.Nc3
                    'Nc3': {
                      moves: [m('dxe4', 3)],
                      children: {
                        'dxe4': {
                          moves: [m('Nxe4', 3)],
                          children: {
                            'Nxe4': {
                              moves: [m('Bf5', 3), m('Nd7', 1)],
                              children: {
                                'Bf5': {
                                  moves: [m('Ng3', 2), m('Nc5', 1)],
                                  children: {
                                    'Ng3': { moves: [m('Bg6', 3)] },
                                  },
                                },
                                'Nd7': { moves: [m('Nf3', 2), m('Bc4', 1)] },
                              },
                            },
                          },
                        },
                      },
                    },
                    // Exchange: 3.exd5
                    'exd5': {
                      moves: [m('cxd5', 3)],
                      children: {
                        'cxd5': {
                          moves: [m('Bd3', 2), m('c4', 1)],
                          children: {
                            'Bd3': { moves: [m('Nc6', 2), m('Nf6', 1)] },
                          },
                        },
                      },
                    },
                    // Advance: 3.e5
                    'e5': {
                      moves: [m('Bf5', 3)],
                      children: {
                        'Bf5': { moves: [m('Nf3', 2), m('Nc3', 1)] },
                      },
                    },
                    // Short System: 3.Nd2
                    'Nd2': {
                      moves: [m('dxe4', 2)],
                      children: {
                        'dxe4': { moves: [m('Nxe4')] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // ----------------------------------------------------------
        // 1.e4 d5 (Scandinavian Defense)
        // ----------------------------------------------------------
        'd5': {
          moves: [m('exd5', 3)],
          children: {
            'exd5': {
              moves: [m('Qxd5', 3), m('Nf6', 1)],
              children: {
                'Qxd5': {
                  moves: [m('Nc3', 3)],
                  children: {
                    'Nc3': {
                      moves: [m('Qa5', 3), m('Qd6', 1)],
                      children: {
                        'Qa5': { moves: [m('d4', 2), m('Nf3', 1)] },
                        'Qd6': { moves: [m('d4')] },
                      },
                    },
                  },
                },
                'Nf6': {
                  moves: [m('d4', 2)],
                  children: {
                    'd4': { moves: [m('Nxd5', 2), m('Bg4', 1)] },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ================================================================
    // 1.d4 lines
    // ================================================================
    'd4': {
      moves: [m('d5', 3), m('Nf6', 3)],
      children: {
        // ----------------------------------------------------------
        // 1.d4 d5
        // ----------------------------------------------------------
        'd5': {
          moves: [m('c4', 3), m('Nf3', 1)],
          children: {
            // Queen's Gambit: 1.d4 d5 2.c4
            'c4': {
              moves: [m('e6', 3), m('c6', 2), m('dxc4', 1)],
              children: {
                // QGD: 1.d4 d5 2.c4 e6
                'e6': {
                  moves: [m('Nc3', 3), m('Nf3', 1)],
                  children: {
                    'Nc3': {
                      moves: [m('Nf6', 3)],
                      children: {
                        'Nf6': {
                          moves: [m('Bg5', 3), m('Nf3', 2)],
                          children: {
                            'Bg5': {
                              moves: [m('Be7', 3), m('Nbd7', 1)],
                              children: {
                                'Be7': { moves: [m('e3', 2), m('Nf3', 2)] },
                              },
                            },
                            'Nf3': { moves: [m('Be7', 2), m('Bb4', 1)] },
                          },
                        },
                      },
                    },
                    'Nf3': {
                      moves: [m('Nf6', 3)],
                      children: {
                        'Nf6': { moves: [m('Nc3', 2), m('Bg5', 1)] },
                      },
                    },
                  },
                },
                // Slav: 1.d4 d5 2.c4 c6
                'c6': {
                  moves: [m('Nf3', 2), m('Nc3', 2)],
                  children: {
                    'Nf3': {
                      moves: [m('Nf6', 3)],
                      children: {
                        'Nf6': {
                          moves: [m('Nc3', 3)],
                          children: {
                            'Nc3': { moves: [m('dxc4', 2), m('e6', 1)] },
                          },
                        },
                      },
                    },
                    'Nc3': {
                      moves: [m('Nf6', 3)],
                      children: {
                        'Nf6': {
                          moves: [m('Nf3', 2), m('e3', 1)],
                        },
                      },
                    },
                  },
                },
                // QGA: 1.d4 d5 2.c4 dxc4
                'dxc4': {
                  moves: [m('Nf3', 2), m('e3', 2)],
                  children: {
                    'Nf3': {
                      moves: [m('Nf6', 2), m('a6', 1)],
                      children: {
                        'Nf6': { moves: [m('e3')] },
                      },
                    },
                    'e3': {
                      moves: [m('Nf6', 2), m('e6', 1)],
                      children: {
                        'Nf6': { moves: [m('Bxc4')] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // ----------------------------------------------------------
        // 1.d4 Nf6 (Indian Defense)
        // ----------------------------------------------------------
        'Nf6': {
          moves: [m('c4', 3)],
          children: {
            'c4': {
              moves: [m('e6', 3), m('g6', 3)],
              children: {
                // 1.d4 Nf6 2.c4 g6 (King's Indian)
                'g6': {
                  moves: [m('Nc3', 3)],
                  children: {
                    'Nc3': {
                      moves: [m('Bg7', 3)],
                      children: {
                        'Bg7': {
                          moves: [m('e4', 3)],
                          children: {
                            'e4': {
                              moves: [m('d6', 3), m('O-O', 1)],
                              children: {
                                'd6': {
                                  moves: [m('Nf3', 2), m('Be2', 2)],
                                  children: {
                                    'Nf3': { moves: [m('O-O', 3)] },
                                    'Be2': { moves: [m('O-O', 3)] },
                                  },
                                },
                                'O-O': { moves: [m('Nf3', 2), m('Be2', 1)] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                // 1.d4 Nf6 2.c4 e6 (Nimzo/QID)
                'e6': {
                  moves: [m('Nc3', 3), m('Nf3', 2)],
                  children: {
                    // Nimzo-Indian: 1.d4 Nf6 2.c4 e6 3.Nc3
                    'Nc3': {
                      moves: [m('Bb4', 3)],
                      children: {
                        'Bb4': {
                          moves: [m('e3', 2), m('Qc2', 2), m('Nf3', 1)],
                          children: {
                            'e3': {
                              moves: [m('O-O', 2), m('c5', 1)],
                              children: {
                                'O-O': { moves: [m('Bd3', 2), m('Nf3', 1)] },
                              },
                            },
                            'Qc2': {
                              moves: [m('O-O', 2), m('d5', 1)],
                            },
                          },
                        },
                      },
                    },
                    // Queen's Indian: 1.d4 Nf6 2.c4 e6 3.Nf3
                    'Nf3': {
                      moves: [m('b6', 3), m('d5', 1)],
                      children: {
                        'b6': {
                          moves: [m('g3', 2), m('a3', 1), m('e3', 1)],
                          children: {
                            'g3': {
                              moves: [m('Bb7', 3)],
                              children: {
                                'Bb7': { moves: [m('Bg2')] },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

// ============================================================
// Lookup Logic
// ============================================================

/** Strip check/checkmate suffixes from algebraic notation for comparison. */
function stripCheckSuffix(notation: string): string {
  return notation.replace(/[+#]$/, '')
}

/**
 * Build a simple algebraic notation string from a ValidMove + board state.
 * Does not include check/checkmate or disambiguation suffixes
 * (not needed for book matching in opening positions).
 */
function validMoveToNotation(state: GameState, move: ValidMove): string {
  const piece = state.board[move.from.row][move.from.col]
  if (!piece) return ''

  // Build a minimal Move object for moveToAlgebraic
  const moveObj: Move = {
    from: move.from,
    to: move.to,
    player: state.currentPlayer,
    piece: piece.type,
    isCapture: move.isCapture,
    isCastling: move.isCastling,
    castlingSide: move.castlingSide,
    isEnPassant: move.isEnPassant,
    isPromotion: move.isPromotion,
    promotedTo: move.promotedTo,
    isCheck: false,
    isCheckmate: false,
  }

  if (move.isCapture) {
    const captured = state.board[move.to.row][move.to.col]
    if (captured) {
      moveObj.captured = captured.type
    } else if (move.isEnPassant) {
      moveObj.captured = 'pawn'
    }
  }

  return stripCheckSuffix(moveToAlgebraic(moveObj))
}

/** Select a move from weighted options using weighted random selection. */
function selectWeighted(moves: WeightedMove[]): string {
  const totalWeight = moves.reduce((sum, m) => sum + m.weight, 0)
  let roll = Math.random() * totalWeight
  for (const entry of moves) {
    roll -= entry.weight
    if (roll <= 0) return entry.move
  }
  return moves[moves.length - 1].move
}

/**
 * Look up a book move for the current game state.
 * Returns a matching ValidMove or null if no book move is available.
 */
export function getBookMove(state: GameState): ValidMove | null {
  // Convert moveHistory to algebraic notation keys (without +/# suffixes)
  const historyKeys = state.moveHistory.map((m) => stripCheckSuffix(moveToAlgebraic(m)))

  // Walk the opening tree
  let node: BookNode = OPENING_BOOK
  for (const key of historyKeys) {
    if (!node.children || !node.children[key]) {
      return null // Off book
    }
    node = node.children[key]
  }

  // At the current position — pick a weighted random book response
  if (!node.moves || node.moves.length === 0) {
    return null
  }

  const bookNotation = selectWeighted(node.moves)

  // Find the matching ValidMove from all legal moves
  const validMoves = getAllValidMoves(
    state.board,
    state.currentPlayer,
    state.castlingRights,
    state.enPassantSquare,
  )

  for (const vm of validMoves) {
    const vmNotation = validMoveToNotation(state, vm)
    if (vmNotation === bookNotation) {
      return vm
    }
  }

  // Book notation didn't match any legal move (shouldn't happen with correct data)
  return null
}
