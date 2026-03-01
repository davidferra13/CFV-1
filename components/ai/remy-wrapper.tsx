'use client'

// RemyWrapper — Combines the persistent Remy mascot and chat drawer
// inside a shared context provider. Used in the chef portal layout.

import { useState, useCallback, useEffect } from 'react'
import { RemyProvider, useRemyContext } from '@/components/ai/remy-context'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyMascotChat } from '@/components/ai/remy-mascot-chat'
import { RemyDrawer } from '@/components/ai/remy-drawer'
import { useRemyNudges } from '@/lib/hooks/use-remy-nudges'

const MINIMIZED_KEY = 'remy-minimized'

function RemyInner() {
  const {
    toggleMascotChat,
    currentViseme,
    isSpeaking,
    currentEmotion,
    bodyState,
    eyeState,
    dispatchBody,
    isMascotChatOpen,
    isDrawerOpen,
    isMascotLoading,
    isLoading,
  } = useRemyContext()

  const { nudgeMessage, dismissNudge } = useRemyNudges({
    bodyState,
    dispatchBody,
    isMascotChatOpen,
    isDrawerOpen,
    isMascotLoading,
    isLoading,
  })

  const [minimized, setMinimized] = useState(false)

  // Restore minimized state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MINIMIZED_KEY)
      if (saved === 'true') setMinimized(true)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const toggleMinimize = useCallback(() => {
    setMinimized((prev) => {
      const next = !prev
      try {
        localStorage.setItem(MINIMIZED_KEY, String(next))
      } catch {
        // localStorage unavailable
      }
      return next
    })
  }, [])

  return (
    <>
      {/* Persistent Remy mascot — always visible at bottom-left */}
      <RemyMascotButton
        onClick={toggleMascotChat}
        bodyState={bodyState}
        eyeState={eyeState}
        viseme={currentViseme}
        isSpeaking={isSpeaking}
        emotion={currentEmotion}
        minimized={minimized}
        onToggleMinimize={toggleMinimize}
        onAnimComplete={() => dispatchBody({ type: 'ANIM_COMPLETE' })}
        nudgeMessage={nudgeMessage}
        onDismissNudge={dismissNudge}
        ariaLabel="Chat with Remy"
      />

      {/* Mascot inline chat — quick conversations above the mascot */}
      <RemyMascotChat />

      {/* Chat window — floating panel, bottom-right (Ctrl+K) */}
      <RemyDrawer />
    </>
  )
}

export function RemyWrapper() {
  return (
    <RemyProvider>
      <RemyInner />
    </RemyProvider>
  )
}
