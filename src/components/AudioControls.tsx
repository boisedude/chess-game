/**
 * Audio Controls Component
 *
 * Two icon buttons: SFX mute toggle and music mute toggle.
 * Music icon uses custom SVG with strikethrough line when muted.
 */

import { Button } from './ui/button'
import { SpeakerLoudIcon, SpeakerOffIcon } from '@radix-ui/react-icons'

interface AudioControlsProps {
  isSfxMuted: boolean
  isMusicMuted: boolean
  onToggleSfx: () => void
  onToggleMusic: () => void
}

export function AudioControls({ isSfxMuted, isMusicMuted, onToggleSfx, onToggleMusic }: AudioControlsProps) {
  return (
    <div className="flex gap-1">
      <Button
        onClick={onToggleSfx}
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label={isSfxMuted ? 'Unmute sounds' : 'Mute sounds'}
        title={isSfxMuted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {isSfxMuted ? (
          <SpeakerOffIcon className="h-4 w-4" />
        ) : (
          <SpeakerLoudIcon className="h-4 w-4" />
        )}
      </Button>
      <Button
        onClick={onToggleMusic}
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
        title={isMusicMuted ? 'Unmute music' : 'Mute music'}
      >
        <svg
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 ${isMusicMuted ? 'opacity-50' : ''}`}
        >
          <path
            d="M12 3.5C12 2.67 11.33 2 10.5 2C9.67 2 9 2.67 9 3.5C9 4.33 9.67 5 10.5 5C10.67 5 10.83 4.97 11 4.93V10.5C11 11.33 10.33 12 9.5 12C8.67 12 8 11.33 8 10.5C8 9.67 8.67 9 9.5 9C9.67 9 9.83 9.03 10 9.07V3.5H12ZM5 5.5C5 4.67 4.33 4 3.5 4C2.67 4 2 4.67 2 5.5C2 6.33 2.67 7 3.5 7C3.67 7 3.83 6.97 4 6.93V12.5C4 13.33 3.33 14 2.5 14C1.67 14 1 13.33 1 12.5C1 11.67 1.67 11 2.5 11C2.67 11 2.83 11.03 3 11.07V5.5H5Z"
            fill="currentColor"
          />
          {isMusicMuted && (
            <line x1="1" y1="14" x2="13" y2="2" stroke="currentColor" strokeWidth="1.5" />
          )}
        </svg>
      </Button>
    </div>
  )
}
