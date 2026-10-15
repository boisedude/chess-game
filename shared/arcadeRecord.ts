/**
 * Arcade-wide Bentley record, kept on mcooper.com.
 *
 * The server counts two things, and the endpoint names are easy to read
 * backwards, so every game goes through this module instead of calling
 * fetch itself:
 *
 *   bentley-win.php   increments "wins"   = games a PLAYER won against Bentley
 *   bentley-loss.php  increments "losses" = games BENTLEY won
 *
 * Both are POST-only and the server checks the request Origin, so they only
 * work from a page served by mcooper.com. Calls from a dev server fail
 * quietly. Only call these for a finished game against Bentley with a human
 * on the other side (not player-vs-player, not an AI-vs-AI demo).
 */

const API_BASE = 'https://www.mcooper.com/api'

export interface ArcadeRecord {
  playerWins: number
  bentleyWins: number
  total: number
  bentleyWinRate: number
}

async function post(endpoint: 'bentley-win.php' | 'bentley-loss.php'): Promise<void> {
  try {
    await fetch(`${API_BASE}/${endpoint}`, { method: 'POST', keepalive: true })
  } catch {
    // Offline, blocked, or running outside mcooper.com. The game goes on.
  }
}

/** The player beat Bentley. */
export function recordPlayerBeatBentley(): Promise<void> {
  return post('bentley-win.php')
}

/** Bentley beat the player. Draws are not recorded. */
export function recordBentleyBeatPlayer(): Promise<void> {
  return post('bentley-loss.php')
}

/** Current arcade-wide record, or null if it cannot be read. */
export async function fetchArcadeRecord(signal?: AbortSignal): Promise<ArcadeRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/bentley-stats.php`, { signal })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.success !== true) return null
    const playerWins = Number(data.wins)
    const bentleyWins = Number(data.losses)
    if (!Number.isFinite(playerWins) || !Number.isFinite(bentleyWins)) return null
    const total = playerWins + bentleyWins
    return {
      playerWins,
      bentleyWins,
      total,
      bentleyWinRate: total > 0 ? Math.round((bentleyWins / total) * 1000) / 10 : 0,
    }
  } catch {
    return null
  }
}
