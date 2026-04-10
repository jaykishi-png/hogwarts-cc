import { useEffect, useCallback } from 'react'

interface ShortcutHandlers {
  onComplete?: () => void
  onSnooze?: () => void
  onOpen?: () => void
  onSelectNext?: () => void
  onSelectPrev?: () => void
  onEscape?: () => void
  onSelectAll?: () => void
  onTriage?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  const handle = useCallback((e: KeyboardEvent) => {
    if (!enabled) return
    // Skip if typing in an input/textarea
    const tag = (e.target as HTMLElement).tagName.toLowerCase()
    if (['input', 'textarea', 'select'].includes(tag)) return
    if ((e.target as HTMLElement).isContentEditable) return

    switch (e.key.toLowerCase()) {
      case 'd':
        e.preventDefault()
        handlers.onComplete?.()
        break
      case 's':
        e.preventDefault()
        handlers.onSnooze?.()
        break
      case 'o':
        e.preventDefault()
        handlers.onOpen?.()
        break
      case 'arrowdown':
        e.preventDefault()
        handlers.onSelectNext?.()
        break
      case 'arrowup':
        e.preventDefault()
        handlers.onSelectPrev?.()
        break
      case 'escape':
        handlers.onEscape?.()
        break
      case 'a':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          handlers.onSelectAll?.()
        }
        break
      case 't':
        e.preventDefault()
        handlers.onTriage?.()
        break
    }
  }, [enabled, handlers])

  useEffect(() => {
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handle])
}
