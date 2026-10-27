import { createInitialBoard, getAllValidMoves, applyMove, updateCastlingRights, getNewEnPassant } from '@/lib/chessRules'
import type { Board, CastlingRights, Position, Player, PieceType, Piece } from '@/types/chess.types'
function perft(b: Board, p: Player, c: CastlingRights, ep: Position|null, d: number): number {
  const ms = getAllValidMoves(b,p,c,ep)
  if (d===1) return ms.length
  let n=0
  for (const m of ms) n+=perft(applyMove(b,m),(p===1?2:1) as Player,updateCastlingRights(c,b,m),getNewEnPassant(b,m),d-1)
  return n
}
function fromFen(rows: string[]): Board {
  const map: Record<string, PieceType> = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'}
  return rows.map(r=>{const out: (Piece | null)[] = [];for(const ch of r){if(/\d/.test(ch)){for(let i=0;i<+ch;i++)out.push(null)}else out.push({player:ch===ch.toUpperCase()?1:2,type:map[ch.toLowerCase()]})}return out})
}
const all = {whiteKingside:true,whiteQueenside:true,blackKingside:true,blackQueenside:true}
test('start', () => { expect(perft(createInitialBoard(),1,all,null,4)).toBe(197281) })
test('kiwipete', () => {
  const b = fromFen(['r3k2r','p1ppqpb1','bn2pnp1','3PN3','1p2P3','2N2Q1p','PPPBBPPP','R3K2R'])
  expect(perft(b,1,all,null,3)).toBe(97862)
})
test('pos3', () => {
  const b = fromFen(['8','2p5','3p4','KP5r','1R3p1k','8','4P1P1','8'])
  expect(perft(b,1,{whiteKingside:false,whiteQueenside:false,blackKingside:false,blackQueenside:false},null,4)).toBe(43238)
})
test('pos4 promotions', () => {
  const b = fromFen(['r3k2r','Pppp1ppp','1b3nbN','nP6','BBP1P3','q4N2','Pp1P2PP','R2Q1RK1'])
  expect(perft(b,1,{whiteKingside:false,whiteQueenside:false,blackKingside:true,blackQueenside:true},null,3)).toBe(9467)
})
