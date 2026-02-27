'use client'

// RemyContext — Shared state between the persistent Remy mascot and the chat drawer.
// Hoists lip-sync, drawer open/close, and mascot state so both sibling components
// can communicate without being nested inside each other.

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRemyLipSync } from '@/lib/ai/use-remy-lip-sync'
import type { Viseme } from '@/lib/ai/remy-visemes'

type MascotState = 'idle' | 'thinking' | 'success' | 'nudge' | 'sleeping'

interface RemyContextValue {
  // Drawer state
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void

  // Lip-sync (produced by drawer streaming, consumed by mascot)
  currentViseme: Viseme
  isSpeaking: boolean
  feedText: (chunk: string) => void
  stopSpeaking: () => void
  resetLipSync: () => void

  // Mascot animation state
  mascotState: MascotState
  setMascotState: (s: MascotState) => void

  // Loading state (so mascot can show thinking indicator)
  isLoading: boolean
  setIsLoading: (l: boolean) => void
}

const RemyContext = createContext<RemyContextValue | null>(null)

export function useRemyContext() {
  const ctx = useContext(RemyContext)
  if (!ctx) throw new Error('useRemyContext must be used within <RemyProvider>')
  return ctx
}

export function RemyProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [mascotState, setMascotState] = useState<MascotState>('idle')
  const [isLoading, setIsLoading] = useState(false)

  // Lip-sync engine — shared instance for both mascot and drawer avatars
  const lipSync = useRemyLipSync()

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), [])

  // Keyboard shortcut: Ctrl+K / Cmd+K to toggle drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsDrawerOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  // Listen for custom 'open-remy' event so nav buttons can open the drawer
  useEffect(() => {
    const handler = () => setIsDrawerOpen(true)
    window.addEventListener('open-remy', handler)
    return () => window.removeEventListener('open-remy', handler)
  }, [])

  const value: RemyContextValue = {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    currentViseme: lipSync.currentViseme,
    isSpeaking: lipSync.isSpeaking,
    feedText: lipSync.feedText,
    stopSpeaking: lipSync.stopSpeaking,
    resetLipSync: lipSync.reset,
    mascotState,
    setMascotState,
    isLoading,
    setIsLoading,
  }

  return <RemyContext.Provider value={value}>{children}</RemyContext.Provider>
}
