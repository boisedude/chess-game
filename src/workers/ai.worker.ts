/**
 * AI search worker. Runs getAIMove off the main thread.
 * Protocol: { id, args: [state, player, difficulty] } -> { id, move }.
 */

import { getAIMove } from '@/lib/aiStrategies'

type AIArgs = Parameters<typeof getAIMove>

interface AIRequest {
  id: number
  args: AIArgs
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<AIRequest>) => void) | null
  postMessage: (message: { id: number; move: ReturnType<typeof getAIMove> }) => void
}

ctx.onmessage = (e: MessageEvent<AIRequest>) => {
  const { id, args } = e.data
  ctx.postMessage({ id, move: getAIMove(...args) })
}
