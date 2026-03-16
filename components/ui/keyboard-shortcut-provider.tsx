'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShortcutsHelpPanel } from './shortcuts-help-panel'

/** Returns true if the currently-focused element is a text input. */
function isTypingTarget(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

type ChordAction = () => void

interface Chord {
  first: string
  second: string
  action: ChordAction
}

export function KeyboardShortcutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)

  // Track the last key pressed and when it was pressed
  const lastKeyRef = useRef<string | null>(null)
  const lastKeyTimeRef = useRef<number>(0)

  const chordsRef = useRef<Chord[]>([
    { first: 'g', second: 'd', action: () => router.push('/dashboard') },
    { first: 'g', second: 'c', action: () => router.push('/clients') },
    { first: 'g', second: 'i', action: () => router.push('/inquiries') },
    { first: 'g', second: 'e', action: () => router.push('/events') },
    { first: 'g', second: 'f', action: () => router.push('/finance') },
    { first: 'g', second: 's', action: () => router.push('/settings') },
    { first: 'n', second: 'i', action: () => router.push('/inquiries/new') },
    { first: 'n', second: 'e', action: () => router.push('/events/new') },
    { first: 'n', second: 'q', action: () => router.push('/quotes/new') },
    { first: 'n', second: 'c', action: () => router.push('/clients/new') },
  ])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Never fire shortcuts while the user is typing
    if (isTypingTarget()) return

    const key = e.key.toLowerCase()
    const now = Date.now()

    // --- Single-key shortcuts ---

    // Escape - close help panel
    if (e.key === 'Escape') {
      setHelpOpen(false)
      lastKeyRef.current = null
      return
    }

    // '?' - show help panel
    if (e.key === '?') {
      e.preventDefault()
      setHelpOpen((prev) => !prev)
      lastKeyRef.current = null
      return
    }

    // '/' - open search (dispatch custom event for search components to listen to)
    if (e.key === '/') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('open-search'))
      lastKeyRef.current = null
      return
    }

    // Cmd+K or Ctrl+K - open command palette (handled by CommandPalette component in capture phase)
    if (key === 'k' && (e.metaKey || e.ctrlKey)) {
      return
    }

    // Cmd+J or Ctrl+J - open Remy drawer
    if (key === 'j' && (e.metaKey || e.ctrlKey)) {
      return
    }

    // --- Chord shortcuts ---
    const prevKey = lastKeyRef.current
    const prevTime = lastKeyTimeRef.current
    const elapsed = now - prevTime

    if (prevKey && elapsed <= 1000) {
      // We have a candidate chord - check for a match
      const chord = chordsRef.current.find((c) => c.first === prevKey && c.second === key)
      if (chord) {
        e.preventDefault()
        chord.action()
        lastKeyRef.current = null
        lastKeyTimeRef.current = 0
        return
      }
    }

    // Store this key as the potential first key of a chord
    lastKeyRef.current = key
    lastKeyTimeRef.current = now
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <>
      {children}
      <ShortcutsHelpPanel isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
