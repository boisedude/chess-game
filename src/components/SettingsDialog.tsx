/**
 * Settings Dialog
 *
 * Modal for game preferences: animation speed, victory celebrations,
 * move notation visibility, and reduced motion accessibility toggle.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AnimationSpeed, GameSettings } from '@/hooks/useGameSettings'
import { ResetIcon } from '@radix-ui/react-icons'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: GameSettings
  onUpdateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void
  onReset: () => void
  isReducedMotion: boolean
  onToggleReducedMotion: () => void
}

function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="space-y-0.5">
        <div className="text-sm font-medium" id={`${id}-label`}>{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          aria-labelledby={`${id}-label`}
          role="switch"
          aria-checked={checked}
        />
        <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
        <div className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onUpdateSetting,
  onReset,
  isReducedMotion,
  onToggleReducedMotion,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <DialogDescription>
            Customize your chess gameplay experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Animation Speed */}
          <div className="space-y-2">
            <label htmlFor="animation-speed" className="text-sm font-semibold">Animation Speed</label>
            <p className="text-xs text-muted-foreground">
              Control celebration and transition speed
            </p>
            <Select
              value={settings.animationSpeed}
              onValueChange={(value: AnimationSpeed) =>
                onUpdateSetting('animationSpeed', value)
              }
            >
              <SelectTrigger id="animation-speed" className="w-full" aria-label="Select animation speed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off (Instant)</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="slow">Slow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggle Options */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Display</h3>

            <ToggleSwitch
              id="celebration"
              checked={settings.showVictoryCelebration}
              onChange={checked => onUpdateSetting('showVictoryCelebration', checked)}
              label="Victory Celebrations"
              description="Show confetti and effects when you win"
            />

            <ToggleSwitch
              id="notation"
              checked={settings.showMoveNotation}
              onChange={checked => onUpdateSetting('showMoveNotation', checked)}
              label="Move Notation"
              description="Show algebraic notation of moves played"
            />
          </div>

          {/* Accessibility */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Accessibility</h3>

            <ToggleSwitch
              id="reduced-motion"
              checked={isReducedMotion}
              onChange={() => onToggleReducedMotion()}
              label="Reduce Motion"
              description="Disable animations and celebrations (respects OS setting)"
            />
          </div>

          {/* Reset */}
          <div className="border-t pt-4">
            <Button
              onClick={onReset}
              variant="outline"
              className="w-full gap-2"
              type="button"
            >
              <ResetIcon className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
