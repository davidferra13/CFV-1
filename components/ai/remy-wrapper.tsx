'use client'

// RemyWrapper — Combines the persistent Remy mascot and chat drawer
// inside a shared context provider. Used in the chef portal layout.

import { useState, useCallback, useEffect } from 'react'
import { RemyProvider, useRemyContext } from '@/components/ai/remy-context'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyDrawer } from '@/components/ai/remy-drawer'

const MINIMIZED_KEY = 'remy-minimized'

function RemyInner() {
  const {
    toggleDrawer,
    currentViseme,
    isSpeaking,
    currentEmotion,
    bodyState,
    eyeState,
    dispatchBody,
  } = useRemyContext()

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
        onClick={toggleDrawer}
        bodyState={bodyState}
        eyeState={eyeState}
        viseme={currentViseme}
        isSpeaking={isSpeaking}
        emotion={currentEmotion}
        minimized={minimized}
        onToggleMinimize={toggleMinimize}
        onAnimComplete={() => dispatchBody({ type: 'ANIM_COMPLETE' })}
        ariaLabel="Toggle Remy chat (Ctrl+K)"
      />

      {/* Chat drawer — right side panel */}
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
