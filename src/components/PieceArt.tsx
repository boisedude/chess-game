/**
 * The chess set, drawn for this arcade: flat Staunton silhouettes on a
 * 100-unit box, one fill and one outline per side, with a few inner lines.
 * SVG rather than font glyphs, so the set looks the same on every device.
 */

import type { PieceType, Player } from '@/types/chess.types'

const BASE = 'M22 91 C22 83 27 80 34 80 H66 C73 80 78 83 78 91 Z'

/** Outline paths per piece, above the shared base. */
const BODY: Record<PieceType, string> = {
  pawn:
    'M50 21 A12 12 0 0 1 57.5 42.4 C62 44 64 46 64 49 H58 C57 61 61 68 68 74 C70 76 70 78 70 80 H30 C30 78 30 76 32 74 C39 68 43 61 42 49 H36 C36 46 38 44 42.5 42.4 A12 12 0 0 1 50 21 Z',
  rook:
    'M28 17 H38 V24 H45 V17 H55 V24 H62 V17 H72 V34 L65 41 V66 L72 74 V80 H28 V74 L35 66 V41 L28 34 Z',
  knight:
    'M33 80 C33 66 45 60 46 47 C41 50 37 56 30 56 C24 56 20 51 23 45 L37 27 C36 21 39 15 44 11 L49 19 C64 19 76 34 76 58 C76 68 73 75 71 80 Z',
  bishop:
    'M50 8 A5 5 0 0 1 53.6 16.5 C62 24 66 33 63 42 C62 45 60 47 58 48 C61 49 63 51 63 54 H58 C57 63 61 69 67 74 C69 76 70 78 70 80 H30 C30 78 31 76 33 74 C39 69 43 63 42 54 H37 C37 51 39 49 42 48 C40 47 38 45 37 42 C34 33 38 24 46.4 16.5 A5 5 0 0 1 50 8 Z',
  queen:
    'M50 10 A5 5 0 0 1 52.5 19.3 L58 43 L66.500 22.8 A5 5 0 1 1 71.5 24.6 L70 46 L80.6 31.6 A5 5 0 1 1 84.800 34.6 L70 62 C69 68 70 72 73 75 C74 77 74 78 74 80 H26 C26 78 26 77 27 75 C30 72 31 68 30 62 L15.200 34.6 A5 5 0 1 1 19.4 31.6 L30 46 L28.500 24.6 A5 5 0 1 1 33.500 22.8 L42 43 L47.500 19.3 A5 5 0 0 1 50 10 Z',
  king:
    'M46.500 5 H53.500 V11 H60 V18 H53.500 V25 C60 22 73 22 78 31 C83 41 76 52 69 60 C68 67 69 72 73 75 C74 77 74 78 74 80 H26 C26 78 26 77 27 75 C31 72 32 67 31 60 C24 52 17 41 22 31 C27 22 40 22 46.500 25 V18 H40 V11 H46.500 Z',
}

/** Inner lines: collars, the bishop's cut, the knight's eye and mane. */
const DETAIL: Record<PieceType, string> = {
  pawn: 'M34 80 H66',
  rook: 'M35 41 H65 M35 66 H65 M30 80 H70',
  knight: 'M36 36.500 A1.5 1.5 0 1 0 36.010 36.500 M49 19 C58 24 64 34 64 50 M27 49 L29 47 M35 80 H69',
  bishop: 'M54 25 L46 35 M42 48 H58 M32 80 H68',
  queen: 'M30 62 H70 M28 71 C40 68 60 68 72 71 M28 80 H72',
  king: 'M31 60 H69 M29 71 C40 68 60 68 71 71 M50 31 V54 M28 80 H72',
}

const PALETTE: Record<Player, { fill: string; line: string; detail: string }> = {
  1: { fill: '#f6f0e2', line: '#23282d', detail: '#23282d' },
  2: { fill: '#2c3136', line: '#0c0e10', detail: '#8a949c' },
}

interface PieceArtProps {
  type: PieceType
  player: Player
  className?: string
}

export function PieceArt({ type, player, className }: PieceArtProps) {
  const c = PALETTE[player]
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <g fill={c.fill} stroke={c.line} strokeWidth={3.2} strokeLinejoin="round">
        <path d={BODY[type]} />
        <path d={BASE} />
      </g>
      <path d={DETAIL[type]} fill="none" stroke={c.detail} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
