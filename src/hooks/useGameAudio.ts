/**
 * useGameAudio Hook
 *
 * Procedural sound effects via Web Audio API. No audio files needed.
 * Exports: useGameAudio() -> { isMuted, toggleMute, playSound, play[Effect]... }
 */

import { useCallback, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { useSharedAudioContext } from '@/hooks/useSharedAudioContext'

type SoundEffect = 'pieceMove' | 'victory' | 'defeat' | 'draw' | 'click' | 'hover' | 'capture' | 'promotion' | 'achievementUnlock' | 'check' | 'castling'

const AUDIO_TIMING = {
  MOVE_DURATION: 0.08,
  VICTORY_NOTE_DELAY: 0.15,
  VICTORY_NOTE_DURATION: 0.3,
  DEFEAT_DURATION: 0.5,
  DRAW_DURATION: 0.3,
  CLICK_DURATION: 0.05,
  HOVER_DURATION: 0.03,
  CAPTURE_DURATION: 0.15,
  PROMOTION_DURATION: 0.4,
  ACHIEVEMENT_DURATION: 0.5,
  CHECK_DURATION: 0.12,
  CASTLING_DURATION: 0.2,
} as const

function createTone(ctx: AudioContext, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.onended = () => { osc.disconnect(); gain.disconnect() }
  return { osc, gain }
}

function playSingleTone(
  ctx: AudioContext,
  config: {
    startFreq: number
    endFreq?: number
    duration: number
    type?: OscillatorType
    peakGain?: number
    attackTime?: number
    startTime?: number
  }
) {
  const start = config.startTime ?? ctx.currentTime
  const { osc, gain } = createTone(ctx, config.type ?? 'sine')

  osc.frequency.setValueAtTime(config.startFreq, start)
  if (config.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(config.endFreq, start + config.duration)
  }

  const peak = config.peakGain ?? 0.15
  const attack = config.attackTime ?? 0.01
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.01, start + config.duration)

  osc.start(start)
  osc.stop(start + config.duration)
}

export function useGameAudio() {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AUDIO_MUTED) === 'true'
  })

  const { audioContext } = useSharedAudioContext()

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev
      localStorage.setItem(STORAGE_KEYS.AUDIO_MUTED, String(newValue))
      return newValue
    })
  }, [])

  const playPieceMove = useCallback(() => {
    if (isMuted || !audioContext) return
    playSingleTone(audioContext, {
      startFreq: 500, endFreq: 200, duration: AUDIO_TIMING.MOVE_DURATION, peakGain: 0.2,
    })
  }, [isMuted, audioContext])

  const playVictory = useCallback(() => {
    if (isMuted || !audioContext) return
    const now = audioContext.currentTime;
    [262, 330, 392, 523].forEach((freq, i) => {
      playSingleTone(audioContext, {
        startFreq: freq,
        duration: AUDIO_TIMING.VICTORY_NOTE_DURATION,
        type: 'triangle',
        peakGain: 0.2,
        attackTime: 0.05,
        startTime: now + i * AUDIO_TIMING.VICTORY_NOTE_DELAY,
      })
    })
  }, [isMuted, audioContext])

  const playDefeat = useCallback(() => {
    if (isMuted || !audioContext) return
    playSingleTone(audioContext, {
      startFreq: 300, endFreq: 100, duration: AUDIO_TIMING.DEFEAT_DURATION,
      type: 'sawtooth', peakGain: 0.2, attackTime: 0.05,
    })
  }, [isMuted, audioContext])

  const playDraw = useCallback(() => {
    if (isMuted || !audioContext) return
    for (const freq of [220, 330]) {
      playSingleTone(audioContext, {
        startFreq: freq, duration: AUDIO_TIMING.DRAW_DURATION, peakGain: 0.15, attackTime: 0.05,
      })
    }
  }, [isMuted, audioContext])

  const playClick = useCallback(() => {
    if (isMuted || !audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime
    const { osc, gain } = createTone(ctx, 'square')
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + AUDIO_TIMING.CLICK_DURATION)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO_TIMING.CLICK_DURATION)
    osc.start(now)
    osc.stop(now + AUDIO_TIMING.CLICK_DURATION)
  }, [isMuted, audioContext])

  const playHover = useCallback(() => {
    if (isMuted || !audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime
    const { osc, gain } = createTone(ctx, 'sine')
    osc.frequency.setValueAtTime(600, now)
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO_TIMING.HOVER_DURATION)
    osc.start(now)
    osc.stop(now + AUDIO_TIMING.HOVER_DURATION)
  }, [isMuted, audioContext])

  const playCapture = useCallback(() => {
    if (isMuted || !audioContext) return
    playSingleTone(audioContext, {
      startFreq: 300, endFreq: 80, duration: AUDIO_TIMING.CAPTURE_DURATION,
      type: 'triangle', peakGain: 0.25,
    })
  }, [isMuted, audioContext])

  const playPromotion = useCallback(() => {
    if (isMuted || !audioContext) return
    const ctx = audioContext
    const now = ctx.currentTime
    playSingleTone(ctx, {
      startFreq: 200, endFreq: 800, duration: 0.25, peakGain: 0.12, attackTime: 0.05,
    })
    for (const freq of [523, 659, 784]) {
      const { osc, gain } = createTone(ctx, 'triangle')
      osc.frequency.setValueAtTime(freq, now + 0.15)
      gain.gain.setValueAtTime(0, now + 0.15)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.01, now + AUDIO_TIMING.PROMOTION_DURATION)
      osc.start(now + 0.15)
      osc.stop(now + AUDIO_TIMING.PROMOTION_DURATION)
    }
  }, [isMuted, audioContext])

  const playAchievementUnlock = useCallback(() => {
    if (isMuted || !audioContext) return
    const now = audioContext.currentTime;
    [784, 1047].forEach((freq, i) => {
      playSingleTone(audioContext, {
        startFreq: freq,
        duration: AUDIO_TIMING.ACHIEVEMENT_DURATION - i * 0.1,
        peakGain: 0.15,
        attackTime: 0.03,
        startTime: now + i * 0.12,
      })
    })
  }, [isMuted, audioContext])

  const playCheck = useCallback(() => {
    if (isMuted || !audioContext) return
    playSingleTone(audioContext, {
      startFreq: 880, endFreq: 440, duration: AUDIO_TIMING.CHECK_DURATION,
      type: 'triangle', peakGain: 0.2, attackTime: 0.01,
    })
  }, [isMuted, audioContext])

  const playCastling = useCallback(() => {
    if (isMuted || !audioContext) return
    const now = audioContext.currentTime
    playSingleTone(audioContext, {
      startFreq: 400, endFreq: 200, duration: AUDIO_TIMING.CASTLING_DURATION / 2, peakGain: 0.15,
      startTime: now,
    })
    playSingleTone(audioContext, {
      startFreq: 500, endFreq: 250, duration: AUDIO_TIMING.CASTLING_DURATION / 2, peakGain: 0.15,
      startTime: now + AUDIO_TIMING.CASTLING_DURATION / 2,
    })
  }, [isMuted, audioContext])

  const playSound = useCallback(
    (effect: SoundEffect) => {
      const handlers: Record<SoundEffect, () => void> = {
        pieceMove: playPieceMove,
        victory: playVictory,
        defeat: playDefeat,
        draw: playDraw,
        click: playClick,
        hover: playHover,
        capture: playCapture,
        promotion: playPromotion,
        achievementUnlock: playAchievementUnlock,
        check: playCheck,
        castling: playCastling,
      }
      handlers[effect]()
    },
    [playPieceMove, playVictory, playDefeat, playDraw, playClick, playHover, playCapture, playPromotion, playAchievementUnlock, playCheck, playCastling]
  )

  return {
    isMuted,
    toggleMute,
    playSound,
    playPieceMove,
    playVictory,
    playDefeat,
    playDraw,
    playClick,
    playHover,
    playCapture,
    playPromotion,
    playAchievementUnlock,
    playCheck,
    playCastling,
  }
}
