'use client'

// RemyContext — Shared state between the persistent Remy mascot and the chat drawer.
// Hoists lip-sync, drawer open/close, body state machine, and eye state so both
// sibling components can communicate without being nested inside each other.
//
// Architecture:
//   Body state → useBodyState (11-state reducer with idle timeout)
//   Lip-sync  → useRemyLipSync (text-driven viseme queue)
//   Eyes      → useAutoBlink (random blink + emotion overrides)
//
// Legacy: mascotState/setMascotState still exposed for backward compat
// during migration. Components should prefer bodyState/dispatchBody.

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRemyLipSync } from '@/lib/ai/use-remy-lip-sync'
import { useBodyState } from '@/lib/ai/remy-body-state'
import { useAutoBlink } from '@/lib/ai/remy-eye-blink'
import type { BodyState, BodyEvent } from '@/lib/ai/remy-body-state'
import type { EyeState } from '@/lib/ai/remy-eye-blink'
import type { Viseme, RemyEmotion } from '@/lib/ai/remy-visemes'

// Legacy type — kept for backward compat during migration
type MascotState = 'idle' | 'thinking' | 'success' | 'nudge' | 'sleeping'

interface RemyContextValue {
  // Drawer state
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void

  // Mascot chat state (separate from drawer)
  isMascotChatOpen: boolean
  openMascotChat: () => void
  closeMascotChat: () => void
  toggleMascotChat: () => void

  // Lip-sync (produced by streaming, consumed by mascot)
  currentViseme: Viseme
  isSpeaking: boolean
  currentEmotion: RemyEmotion
  feedText: (chunk: string) => void
  stopSpeaking: () => void
  resetLipSync: () => void
  setEmotion: (e: RemyEmotion) => void

  // Body animation state machine (new — 11 states)
  bodyState: BodyState
  dispatchBody: (event: BodyEvent) => void

  // Eye blink state (auto-blink engine)
  eyeState: EyeState

  // Legacy mascot state (bridges old components during migration)
  mascotState: MascotState
  setMascotState: (s: MascotState) => void

  // Loading state — drawer and mascot chat tracked separately
  isLoading: boolean
  setIsLoading: (l: boolean) => void
  isMascotLoading: boolean
  setIsMascotLoading: (l: boolean) => void
}

const RemyContext = createContext<RemyContextValue | null>(null)

export function useRemyContext() {
  const ctx = useContext(RemyContext)
  if (!ctx) throw new Error('useRemyContext must be used within <RemyProvider>')
  return ctx
}

/** Map legacy MascotState to BodyEvent for backward compat */
function mascotStateToBodyEvent(s: MascotState): BodyEvent | null {
  switch (s) {
    case 'thinking':
      return { type: 'RESPONSE_STARTED' }
    case 'success':
      return { type: 'SUCCESS' }
    case 'nudge':
      return { type: 'NUDGE' }
    case 'sleeping':
      return { type: 'IDLE_TIMEOUT' }
    case 'idle':
      return { type: 'INTERACT' }
    default:
      return null
  }
}

/** Map BodyState back to legacy MascotState for backward compat */
function bodyStateToMascotState(s: BodyState): MascotState {
  switch (s) {
    case 'thinking':
      return 'thinking'
    case 'celebrating':
      return 'success'
    case 'nudge':
      return 'nudge'
    case 'sleeping':
      return 'sleeping'
    default:
      return 'idle'
  }
}

export function RemyProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isMascotChatOpen, setIsMascotChatOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMascotLoading, setIsMascotLoading] = useState(false)

  // Body state machine — replaces the old simple mascotState
  const { bodyState, dispatchBody } = useBodyState()

  // Lip-sync engine — shared instance for both mascot and drawer avatars
  const lipSync = useRemyLipSync()

  // Auto-blink engine — eyes react to body state and emotion
  const eyeState = useAutoBlink({ bodyState, emotion: lipSync.currentEmotion })

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true)
    dispatchBody({ type: 'DRAWER_OPENED' })
  }, [dispatchBody])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    dispatchBody({ type: 'DRAWER_CLOSED' })
  }, [dispatchBody])

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => {
      if (!prev) dispatchBody({ type: 'DRAWER_OPENED' })
      else dispatchBody({ type: 'DRAWER_CLOSED' })
      return !prev
    })
  }, [dispatchBody])

  const openMascotChat = useCallback(() => {
    setIsMascotChatOpen(true)
    dispatchBody({ type: 'INTERACT' })
  }, [dispatchBody])

  const closeMascotChat = useCallback(() => {
    setIsMascotChatOpen(false)
  }, [])

  const toggleMascotChat = useCallback(() => {
    setIsMascotChatOpen((prev) => {
      if (!prev) dispatchBody({ type: 'INTERACT' })
      return !prev
    })
  }, [dispatchBody])

  // Legacy bridge: setMascotState dispatches body events
  const setMascotState = useCallback(
    (s: MascotState) => {
      const event = mascotStateToBodyEvent(s)
      if (event) dispatchBody(event)
    },
    [dispatchBody]
  )

  // Keyboard control: Escape closes whichever Remy surface is open.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isDrawerOpen) closeDrawer()
        else if (isMascotChatOpen) closeMascotChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, isMascotChatOpen, closeDrawer, closeMascotChat])

  // Listen for custom 'open-remy' event so nav buttons can open the drawer
  useEffect(() => {
    const handler = () => openDrawer()
    window.addEventListener('open-remy', handler)
    return () => window.removeEventListener('open-remy', handler)
  }, [openDrawer])

  const value: RemyContextValue = {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isMascotChatOpen,
    openMascotChat,
    closeMascotChat,
    toggleMascotChat,
    currentViseme: lipSync.currentViseme,
    isSpeaking: lipSync.isSpeaking,
    currentEmotion: lipSync.currentEmotion,
    feedText: lipSync.feedText,
    stopSpeaking: lipSync.stopSpeaking,
    resetLipSync: lipSync.reset,
    setEmotion: lipSync.setEmotion,
    bodyState,
    dispatchBody,
    eyeState,
    mascotState: bodyStateToMascotState(bodyState),
    setMascotState,
    isLoading,
    setIsLoading,
    isMascotLoading,
    setIsMascotLoading,
  }

  return <RemyContext.Provider value={value}>{children}</RemyContext.Provider>
}
