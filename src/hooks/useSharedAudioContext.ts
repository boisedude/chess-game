/**
 * Shared AudioContext Hook
 *
 * Module-level singleton AudioContext shared by useGameAudio and useBackgroundMusic.
 * Exports: useSharedAudioContext() -> { audioContext, resumeContext }
 */

type WebkitWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

let sharedAudioContext: AudioContext | null = null

function getOrCreateAudioContext(): AudioContext | null {
  if (sharedAudioContext) return sharedAudioContext

  if (typeof window === 'undefined') return null

  try {
    const AudioContextClass =
      window.AudioContext || (window as WebkitWindow).webkitAudioContext
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass()
    }
  } catch {
    console.warn('chess: Web Audio API not supported')
  }

  return sharedAudioContext
}

export function useSharedAudioContext(): {
  audioContext: AudioContext | null
  resumeContext: () => void
} {
  const audioContext = getOrCreateAudioContext()

  const resumeContext = () => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        console.warn('chess: Failed to resume AudioContext')
      })
    }
  }

  return { audioContext, resumeContext }
}
