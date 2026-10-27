/**
 * Worker construction lives alone here because it uses import.meta, which Jest
 * cannot compile. Tests mock this module.
 */
export function createAIWorker(): Worker {
  return new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' })
}
