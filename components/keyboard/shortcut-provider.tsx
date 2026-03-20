'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SHORTCUTS } from '@/lib/keyboard/shortcuts'

const CHORD_TIMEOUT_MS = 800

/** Returns true if the currently-focused element is a text input. */
function isTypingTarget(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

/**
 * Shows a brief toast when a shortcut fires.
 * Creates a lightweight DOM element that auto-removes after 1.2s.
 */
function showShortcutToast(label: string) {
  const existing = document.getElementById('shortcut-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'shortcut-toast'
  toast.textContent = label
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#292524',
    color: '#d6d3d1',
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    zIndex: '9999',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease-in-out',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  })

  document.body.appendChild(toast)
  // Trigger fade-in on next frame
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
  })

  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 200)
  }, 1200)
}

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const lastKeyRef = useRef<string | null>(null)
  const lastKeyTimeRef = useRef<number>(0)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Never fire shortcuts while the user is typing
      if (isTypingTarget()) return

      // Ignore when any modifier key is held (avoid conflicting with browser/OS shortcuts)
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
        // Exception: '?' requires Shift on most keyboards
        if (e.key !== '?') return
      }

      const key = e.key.toLowerCase()
      const now = Date.now()

      // Escape clears buffer
      if (e.key === 'Escape') {
        lastKeyRef.current = null
        return
      }

      // Check single-key shortcuts first
      const singleMatch = SHORTCUTS.find((s) => s.keys.length === 1 && s.keys[0] === e.key)
      if (singleMatch) {
        e.preventDefault()
        lastKeyRef.current = null
        if (singleMatch.action) {
          window.dispatchEvent(new CustomEvent(singleMatch.action))
        }
        if (singleMatch.href) {
          showShortcutToast(singleMatch.label)
          router.push(singleMatch.href)
        }
        return
      }

      // Check chord shortcuts (two-key sequences)
      const prevKey = lastKeyRef.current
      const elapsed = now - lastKeyTimeRef.current

      if (prevKey && elapsed <= CHORD_TIMEOUT_MS) {
        const chordMatch = SHORTCUTS.find(
          (s) => s.keys.length === 2 && s.keys[0] === prevKey && s.keys[1] === key
        )
        if (chordMatch) {
          e.preventDefault()
          lastKeyRef.current = null
          lastKeyTimeRef.current = 0
          if (chordMatch.action) {
            window.dispatchEvent(new CustomEvent(chordMatch.action))
          }
          if (chordMatch.href) {
            showShortcutToast(chordMatch.label)
            router.push(chordMatch.href)
          }
          return
        }
      }

      // Store this key as potential first key of a chord
      lastKeyRef.current = key
      lastKeyTimeRef.current = now
    },
    [router]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return <>{children}</>
}
