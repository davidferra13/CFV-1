'use client'

// RemyWrapper — Combines the persistent Remy mascot (bottom-left),
// quick chat (above mascot), and the full chat window (bottom-right)
// inside a shared context provider. Both chat interfaces can be open
// simultaneously. Used in the chef portal layout.

import { useState, useCallback, useEffect } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { RemyProvider, useRemyContext } from '@/components/ai/remy-context'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyMascotChat } from '@/components/ai/remy-mascot-chat'
import { RemyDrawer } from '@/components/ai/remy-drawer'
import { useRemyNudges } from '@/lib/hooks/use-remy-nudges'

const MINIMIZED_KEY = 'remy-minimized'

function RemyInner() {
  const {
    toggleMascotChat,
    toggleDrawer,
    isDrawerOpen,
    currentViseme,
    isSpeaking,
    currentEmotion,
    bodyState,
    eyeState,
    dispatchBody,
    isMascotChatOpen,
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

      {/* Toggle button for the full chat window — bottom-right, always visible */}
      {!isDrawerOpen && (
        <button
          type="button"
          data-remy-chat-toggle
          onClick={toggleDrawer}
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:scale-105 active:scale-95 border border-brand-500/30"
          aria-label="Open Remy chat window"
          title="Open chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Full chat window — floating panel, bottom-right */}
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
