/**
 * Audio Controls Component
 *
 * Two ghost icon buttons for the top bar: sound effects and music.
 * A muted button is dimmed and struck through.
 */

import { Button } from './ui/button'
import { VolumeIcon, VolumeOffIcon, MusicIcon } from '@shared/icons'

interface AudioControlsProps {
  isSfxMuted: boolean
  isMusicMuted: boolean
  onToggleSfx: () => void
  onToggleMusic: () => void
}

export function AudioControls({ isSfxMuted, isMusicMuted, onToggleSfx, onToggleMusic }: AudioControlsProps) {
  return (
    <>
      <Button
        onClick={onToggleSfx}
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0"
        aria-label={isSfxMuted ? 'Unmute sounds' : 'Mute sounds'}
        title={isSfxMuted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {isSfxMuted ? <VolumeOffIcon /> : <VolumeIcon />}
      </Button>
      <Button
        onClick={onToggleMusic}
        variant="ghost"
        size="icon"
        className="relative h-11 w-11 shrink-0"
        aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
        title={isMusicMuted ? 'Unmute music' : 'Mute music'}
      >
        <span className={isMusicMuted ? 'opacity-50' : ''}>
          <MusicIcon />
        </span>
        {isMusicMuted && (
          <span aria-hidden="true" className="absolute h-0.5 w-6 rotate-45 rounded bg-current" />
        )}
      </Button>
    </>
  )
}
