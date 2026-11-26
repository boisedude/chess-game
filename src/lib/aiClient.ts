/**
 * Promise wrapper around the AI worker. Lazily creates the worker; if Workers
 * are unavailable or fail, searches run synchronously on the main thread.
 */

import { getAIMove } from '@/lib/aiStrategies'
import { createAIWorker } from '@/lib/createAIWorker'

const FALLBACK_TIME_MS = 150

type AIArgs = Parameters<typeof getAIMove>
type AIResult = ReturnType<typeof getAIMove>

interface Pending {
  args: AIArgs
  resolve: (move: AIResult) => void
  reject: (e: unknown) => void
}

let worker: Worker | null = null
let workerBroken = false
let nextId = 1
const pending = new Map<number, Pending>()

function runSync(p: Pending): void {
  try {
    // No worker: the search blocks the page, so give it a fraction of the usual time.
    const [state, player, difficulty, options] = p.args
    const timeMs = Math.min(options?.timeMs ?? FALLBACK_TIME_MS, FALLBACK_TIME_MS)
    p.resolve(getAIMove(state, player, difficulty, { ...options, timeMs }))
  } catch (e) {
    p.reject(e)
  }
}

/** Worker failed: answer everything outstanding on the main thread and stop using it. */
function failOver(): void {
  workerBroken = true
  if (worker) {
    worker.terminate()
    worker = null
  }
  const waiting = [...pending.values()]
  pending.clear()
  waiting.forEach(runSync)
}

function getWorker(): Worker | null {
  if (workerBroken) return null
  if (worker) return worker
  if (typeof Worker === 'undefined') {
    workerBroken = true
    return null
  }
  try {
    const w = createAIWorker()
    w.onmessage = (e: MessageEvent<{ id: number; move: AIResult }>) => {
      const p = pending.get(e.data.id)
      if (!p) return
      pending.delete(e.data.id)
      p.resolve(e.data.move)
    }
    w.onerror = () => failOver()
    w.onmessageerror = () => failOver()
    worker = w
    return w
  } catch {
    workerBroken = true
    return null
  }
}

export function requestAIMove(...args: AIArgs): Promise<AIResult> {
  return new Promise<AIResult>((resolve, reject) => {
    const entry: Pending = { args, resolve, reject }
    const w = getWorker()
    if (!w) {
      runSync(entry)
      return
    }
    const id = nextId++
    pending.set(id, entry)
    try {
      w.postMessage({ id, args })
    } catch {
      pending.delete(id)
      failOver()
      runSync(entry)
    }
  })
}
