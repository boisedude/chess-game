/**
 * useBackgroundMusic Hook
 *
 * Procedural ambient music via Web Audio API. No audio files.
 * Exports: useBackgroundMusic(isPlaying) -> { isMusicMuted, toggleMusicMute }
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { useSharedAudioContext } from '@/hooks/useSharedAudioContext'

const CHORD_PROGRESSION = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [130.81, 164.81, 196.0],
  [196.0, 246.94, 293.66],
]

const CHORD_DURATION = 4
const CROSSFADE_TIME = 1.5
const MASTER_GAIN = 0.04
const FILTER_FREQUENCY = 2000

export function useBackgroundMusic(isPlaying: boolean) {
  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.MUSIC_MUTED) === 'true'
    } catch {
      console.warn('chess: localStorage unavailable')
      return false
    }
  })

  const { audioContext, resumeContext } = useSharedAudioContext()

  const masterGainRef = useRef<GainNode | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeNodesRef = useRef<{ oscillators: OscillatorNode[]; gain: GainNode } | null>(null)
  const chordIndexRef = useRef(0)
  const isInitializedRef = useRef(false)

  const playChord = useCallback((frequencies: number[], ctx: AudioContext, masterGain: GainNode) => {
    const now = ctx.currentTime
    const chordGain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(FILTER_FREQUENCY, now)
    filter.Q.setValueAtTime(0.5, now)

    chordGain.connect(filter)
    filter.connect(masterGain)

    chordGain.gain.setValueAtTime(0, now)
    chordGain.gain.linearRampToValueAtTime(1, now + CROSSFADE_TIME)
    chordGain.gain.setValueAtTime(1, now + CHORD_DURATION - CROSSFADE_TIME)
    chordGain.gain.linearRampToValueAtTime(0, now + CHORD_DURATION)

    const oscillators: OscillatorNode[] = []

    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      oscGain.gain.setValueAtTime(0.3, now)
      osc.connect(oscGain)
      oscGain.connect(chordGain)
      osc.start(now)
      osc.stop(now + CHORD_DURATION + 0.1)
      oscillators.push(osc)

      const osc2 = ctx.createOscillator()
      const osc2Gain = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(freq * 1.002, now)
      osc2Gain.gain.setValueAtTime(0.15, now)
      osc2.connect(osc2Gain)
      osc2Gain.connect(chordGain)
      osc2.start(now)
      osc2.stop(now + CHORD_DURATION + 0.1)
      oscillators.push(osc2)
    })

    if (activeNodesRef.current) {
      const prev = activeNodesRef.current
      const prevNow = ctx.currentTime
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, prevNow)
      prev.gain.gain.linearRampToValueAtTime(0, prevNow + CROSSFADE_TIME)
    }

    activeNodesRef.current = { oscillators, gain: chordGain }
  }, [])

  const startMusic = useCallback(() => {
    if (!audioContext) return
    resumeContext()

    if (!masterGainRef.current) {
      masterGainRef.current = audioContext.createGain()
      masterGainRef.current.connect(audioContext.destination)
    }
    masterGainRef.current.gain.setValueAtTime(MASTER_GAIN, audioContext.currentTime)

    const chord = CHORD_PROGRESSION[chordIndexRef.current % CHORD_PROGRESSION.length]
    playChord(chord, audioContext, masterGainRef.current)
    chordIndexRef.current++

    intervalRef.current = setInterval(() => {
      if (!audioContext || !masterGainRef.current) return
      const nextChord = CHORD_PROGRESSION[chordIndexRef.current % CHORD_PROGRESSION.length]
      playChord(nextChord, audioContext, masterGainRef.current)
      chordIndexRef.current++
    }, CHORD_DURATION * 1000)

    isInitializedRef.current = true
  }, [audioContext, resumeContext, playChord])

  const stopMusic = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (masterGainRef.current && audioContext) {
      const now = audioContext.currentTime
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now)
      masterGainRef.current.gain.linearRampToValueAtTime(0, now + 0.5)
    }

    activeNodesRef.current = null
    isInitializedRef.current = false
  }, [audioContext])

  const toggleMusicMute = useCallback(() => {
    setIsMusicMuted(prev => {
      const newValue = !prev
      try {
        localStorage.setItem(STORAGE_KEYS.MUSIC_MUTED, String(newValue))
      } catch {
        console.warn('chess: localStorage unavailable')
      }
      return newValue
    })
  }, [])

  useEffect(() => {
    if (isPlaying && !isMusicMuted) {
      startMusic()
    } else {
      stopMusic()
    }

    return () => {
      stopMusic()
    }
  }, [isPlaying, isMusicMuted, startMusic, stopMusic])

  return {
    isMusicMuted,
    toggleMusicMute,
  }
}
