/**
 * The "More" menu in the control row: every action that is not New game,
 * Undo or Hint lives here, so the row is one line on a phone.
 * No dependency: a button, a list, and the keyboard handling a menu needs.
 * Import with: import { MoreMenu } from '@shared/MoreMenu'
 * Styles are the .arcade-menu classes in arcade.css.
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronDownIcon } from './icons'

export interface MoreMenuItem {
  label: string
  onSelect: () => void
  /** Red text, for Resign and other actions that end or erase something. */
  destructive?: boolean
  disabled?: boolean
  /** Draw a rule above this item to start a new group. */
  separated?: boolean
}

interface MoreMenuProps {
  /** Falsy entries are skipped, so callers can write `condition && item`. */
  items: (MoreMenuItem | false | null | undefined)[]
  label?: string
  disabled?: boolean
}

export function MoreMenu({ items, label = 'More', disabled = false }: MoreMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const shown = items.filter((item): item is MoreMenuItem => Boolean(item))

  useEffect(() => {
    if (!open) return
    const first = listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    first?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step === 0 && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (current + step + buttons.length) % buttons.length
    buttons[next].focus()
  }

  if (shown.length === 0) return null

  return (
    <div className="arcade-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="arcade-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <ChevronDownIcon size={16} />
      </button>
      {open && (
        <div id={menuId} ref={listRef} className="arcade-menu-list" role="menu" tabIndex={-1} aria-label={label} onKeyDown={onListKeyDown}>
          {shown.map((item) => (
            <div key={item.label} role="none">
              {item.separated && <div className="arcade-menu-rule" role="separator" />}
              <button
                type="button"
                role="menuitem"
                className="arcade-menu-item"
                data-destructive={item.destructive ? 'true' : undefined}
                disabled={item.disabled}
                onClick={() => {
                  close(false)
                  item.onSelect()
                }}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
