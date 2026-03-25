'use client'

// Overlay Queue - ensures only one overlay renders at a time.
// Lower priority number = higher importance. When multiple overlays
// are ready, only the highest-priority one is visible.
//
// Toasts (Sonner) and inline UI don't participate - this is only
// for full/partial-screen overlays that compete for attention.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type OverlayEntry = {
  priority: number
  ready: boolean
}

type OverlayQueueContextValue = {
  register: (id: string, priority: number) => void
  unregister: (id: string) => void
  setReady: (id: string, ready: boolean) => void
  activeOverlay: string | null
}

// ─── Context ────────────────────────────────────────────────────────────────

const OverlayQueueContext = createContext<OverlayQueueContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────────────────────────

export function OverlayQueueProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Map<string, OverlayEntry>>(new Map())

  const register = useCallback((id: string, priority: number) => {
    setEntries((prev) => {
      const next = new Map(prev)
      next.set(id, { priority, ready: false })
      return next
    })
  }, [])

  const unregister = useCallback((id: string) => {
    setEntries((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const setReady = useCallback((id: string, ready: boolean) => {
    setEntries((prev) => {
      const existing = prev.get(id)
      if (!existing || existing.ready === ready) return prev
      const next = new Map(prev)
      next.set(id, { ...existing, ready })
      return next
    })
  }, [])

  // Compute active overlay: lowest priority number among ready entries
  const activeOverlay = useMemo(() => {
    let best: string | null = null
    let bestPriority = Infinity

    for (const [id, entry] of entries) {
      if (entry.ready && entry.priority < bestPriority) {
        best = id
        bestPriority = entry.priority
      }
    }

    return best
  }, [entries])

  const value = useMemo(
    () => ({ register, unregister, setReady, activeOverlay }),
    [register, unregister, setReady, activeOverlay]
  )

  return <OverlayQueueContext.Provider value={value}>{children}</OverlayQueueContext.Provider>
}

// ─── Consumer hook ──────────────────────────────────────────────────────────

/**
 * Register an overlay with the queue.
 *
 * @param id    - Unique overlay identifier (e.g. 'welcome', 'feedback-nudge')
 * @param priority - Lower = more important. 0 = welcome, 10 = feedback nudge.
 * @param ready - Whether this overlay wants to show right now.
 * @returns { visible } - true only when this overlay is the active one.
 */
export function useOverlaySlot(id: string, priority: number, ready: boolean): { visible: boolean } {
  const ctx = useContext(OverlayQueueContext)
  const registeredRef = useRef(false)

  // Register on mount, unregister on unmount
  useEffect(() => {
    if (!ctx) return
    ctx.register(id, priority)
    registeredRef.current = true
    return () => {
      ctx.unregister(id)
      registeredRef.current = false
    }
    // id and priority are stable for the lifetime of the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, id, priority])

  // Sync ready state
  useEffect(() => {
    if (!ctx || !registeredRef.current) return
    ctx.setReady(id, ready)
  }, [ctx, id, ready])

  if (!ctx) return { visible: ready }

  return { visible: ctx.activeOverlay === id }
}
