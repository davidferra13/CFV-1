'use client'

// RemyWrapper — Combines the persistent Remy mascot (bottom-left),
// quick chat (above mascot), and the full chat window (bottom-right)
// inside a shared context provider. Both chat interfaces can be open
// simultaneously. Used in the chef portal layout.

import { MessageSquare, Bot, X, Move } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RemyProvider, useRemyContext } from '@/components/ai/remy-context'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyMascotChat } from '@/components/ai/remy-mascot-chat'
import { RemyDrawer } from '@/components/ai/remy-drawer'
import { useRemyNudges } from '@/lib/hooks/use-remy-nudges'
import { useRemyDisplayMode } from '@/lib/hooks/use-remy-display-mode'

type RemyDockCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

const REMY_DOCK_CORNER_STORAGE_KEY = 'cf:remy:chef:dock-corner'
const DOCK_CORNERS: RemyDockCorner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
const DOCK_CORNER_CLASS: Record<RemyDockCorner, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-72',
  'top-right': 'top-20 right-4',
  'top-left': 'top-20 left-72',
}
const FORM_FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]'
const DENSE_OVERLAY_SELECTOR = '[role="dialog"][aria-modal="true"], dialog[open]'
const REMY_ROOT_SELECTOR = '[data-remy-root]'

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches(FORM_FIELD_SELECTOR)
}

function hasExternalDenseOverlay(): boolean {
  if (typeof document === 'undefined') return false
  const overlays = document.querySelectorAll<HTMLElement>(DENSE_OVERLAY_SELECTOR)
  for (const overlay of overlays) {
    if (overlay.closest(REMY_ROOT_SELECTOR)) continue
    return true
  }
  return false
}

function RemyInner() {
  const {
    toggleMascotChat,
    toggleDrawer,
    closeDrawer,
    isDrawerOpen,
    currentViseme,
    isSpeaking,
    currentEmotion,
    bodyState,
    eyeState,
    dispatchBody,
    isMascotChatOpen,
    closeMascotChat,
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
  const { mode, isMobile, isHydrated, setMode } = useRemyDisplayMode({
    storageKey: 'cf:remy:chef:display-mode',
    desktopDefault: 'docked',
    mobileDefault: 'hidden',
  })
  const [dockCorner, setDockCorner] = useState<RemyDockCorner>('bottom-right')
  const denseSuppressionActiveRef = useRef(false)
  const preDenseSuppressionModeRef = useRef<'hidden' | 'docked' | 'expanded'>('docked')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(REMY_DOCK_CORNER_STORAGE_KEY)
    if (stored && DOCK_CORNERS.includes(stored as RemyDockCorner)) {
      setDockCorner(stored as RemyDockCorner)
    }
  }, [])

  const cycleDockCorner = useCallback(() => {
    setDockCorner((previous) => {
      const idx = DOCK_CORNERS.indexOf(previous)
      const next = DOCK_CORNERS[(idx + 1) % DOCK_CORNERS.length]
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(REMY_DOCK_CORNER_STORAGE_KEY, next)
      }
      return next
    })
  }, [])

  // Keep launcher on the right side for tighter desktop widths so it does not
  // collide with the sidebar/content rail.
  useEffect(() => {
    if (typeof window === 'undefined' || isMobile) return

    const normalizeCorner = () => {
      if (window.innerWidth >= 1440) return
      if (dockCorner === 'bottom-left' || dockCorner === 'top-left') {
        const next = dockCorner === 'bottom-left' ? 'bottom-right' : 'top-right'
        setDockCorner(next)
        window.localStorage.setItem(REMY_DOCK_CORNER_STORAGE_KEY, next)
      }
    }

    normalizeCorner()
    window.addEventListener('resize', normalizeCorner)
    return () => window.removeEventListener('resize', normalizeCorner)
  }, [dockCorner, isMobile])

  useEffect(() => {
    if (mode !== 'expanded' && isMascotChatOpen) {
      closeMascotChat()
    }
  }, [mode, isMascotChatOpen, closeMascotChat])

  useEffect(() => {
    // Hidden mode should be a hard off state. Close the drawer if anything
    // (keyboard shortcut, custom events) opens it while hidden.
    if (mode === 'hidden' && isDrawerOpen) {
      closeDrawer()
    }
  }, [mode, isDrawerOpen, closeDrawer])

  // If a chef starts typing in a form while the mascot is expanded, dock Remy
  // automatically so he does not block fields.
  useEffect(() => {
    if (isMobile || mode !== 'expanded' || isDrawerOpen || isMascotChatOpen) return

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableTarget(event.target)) return
      setMode('docked')
    }

    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [isMobile, isDrawerOpen, isMascotChatOpen, mode, setMode])

  // Dense workflow guard: if a non-Remy modal is open, hide Remy launcher
  // temporarily so forms/tables have full screen space.
  useEffect(() => {
    if (typeof document === 'undefined' || isMobile) return

    const syncDenseSuppression = () => {
      const hasDenseOverlay = hasExternalDenseOverlay()

      if (hasDenseOverlay) {
        if (!denseSuppressionActiveRef.current && mode !== 'hidden') {
          denseSuppressionActiveRef.current = true
          preDenseSuppressionModeRef.current = mode
          setMode('hidden')
        }
        return
      }

      if (denseSuppressionActiveRef.current) {
        denseSuppressionActiveRef.current = false
        const restoreMode = preDenseSuppressionModeRef.current
        if (mode === 'hidden' && restoreMode !== 'hidden') {
          setMode(restoreMode)
        }
      }
    }

    syncDenseSuppression()

    const observer = new MutationObserver(syncDenseSuppression)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-modal', 'open', 'data-state', 'class', 'style'],
    })

    return () => observer.disconnect()
  }, [isMobile, mode, setMode])

  // Ambient life: trigger occasional subtle body movement while idle so Remy
  // does not feel like a static stare.
  useEffect(() => {
    if (
      isMobile ||
      mode !== 'expanded' ||
      isDrawerOpen ||
      isMascotChatOpen ||
      isMascotLoading ||
      isLoading
    ) {
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const schedule = () => {
      const delayMs = 26000 + Math.floor(Math.random() * 18000)
      timer = setTimeout(() => {
        if (cancelled) return
        if (!document.hidden) {
          dispatchBody({ type: 'NUDGE' })
        }
        schedule()
      }, delayMs)
    }

    schedule()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [dispatchBody, isDrawerOpen, isLoading, isMascotChatOpen, isMascotLoading, isMobile, mode])

  if (!isHydrated) return null

  return (
    <>
      {/* Desktop-only character mode */}
      {!isMobile && mode === 'expanded' && (
        <>
          <RemyMascotButton
            onClick={toggleMascotChat}
            bodyState={bodyState}
            eyeState={eyeState}
            viseme={currentViseme}
            isSpeaking={isSpeaking}
            emotion={currentEmotion}
            onToggleMinimize={() => setMode('docked')}
            onHide={() => setMode('hidden')}
            onAnimComplete={() => dispatchBody({ type: 'ANIM_COMPLETE' })}
            nudgeMessage={nudgeMessage}
            onDismissNudge={dismissNudge}
            allowSleepHat={false}
            showHoverBubble={false}
            ariaLabel="Chat with Remy"
          />
          <RemyMascotChat />
        </>
      )}

      {/* Docked launcher controls (desktop only, non-intrusive) */}
      {!isMobile && mode !== 'hidden' && !isDrawerOpen && (
        <div
          data-remy-root
          className={`group/remy-dock fixed z-40 flex items-center gap-2 ${DOCK_CORNER_CLASS[dockCorner]}`}
        >
          {mode === 'docked' && (
            <button
              type="button"
              onClick={cycleDockCorner}
              className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-stone-300 opacity-0 shadow-md transition-all hover:bg-stone-800 group-hover/remy-dock:pointer-events-auto group-hover/remy-dock:opacity-100"
              aria-label="Move Remy launcher"
              title="Move launcher"
            >
              <Move className="h-4 w-4" />
            </button>
          )}
          {mode === 'docked' && (
            <button
              type="button"
              onClick={() => setMode('expanded')}
              className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-stone-300 opacity-0 shadow-md transition-all hover:bg-stone-800 group-hover/remy-dock:pointer-events-auto group-hover/remy-dock:opacity-100"
              aria-label="Show Remy character"
              title="Show character"
            >
              <Bot className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode('hidden')}
            className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-stone-300 opacity-0 shadow-md transition-all hover:bg-stone-800 group-hover/remy-dock:pointer-events-auto group-hover/remy-dock:opacity-100"
            aria-label="Hide Remy launcher"
            title="Hide launcher"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-remy-chat-toggle
            onClick={toggleDrawer}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/30 bg-brand-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-brand-700 active:scale-95"
            aria-label="Open Remy chat window"
            title="Open chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Full chat window */}
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
