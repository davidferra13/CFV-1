// BreadcrumbTracker - Client-side component that silently tracks chef navigation.
// Placed in the chef layout. Records every route change and batches writes to the API.
// Non-blocking: failures never affect the app.

'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useCallback } from 'react'
import type { BreadcrumbBatchItem } from '@/lib/activity/breadcrumb-types'

const BATCH_INTERVAL_MS = 5000 // Flush every 5 seconds
const MAX_BATCH_SIZE = 30

// Generate a session ID that persists for the browser tab lifetime
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = window.sessionStorage.getItem('cf-breadcrumb-session')
  if (!sid) {
    sid = `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    window.sessionStorage.setItem('cf-breadcrumb-session', sid)
  }
  return sid
}

export function BreadcrumbTracker() {
  const pathname = usePathname()
  const prevPathRef = useRef<string | null>(null)
  const queueRef = useRef<BreadcrumbBatchItem[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionId = useRef('')

  // Initialize session ID on mount
  useEffect(() => {
    sessionId.current = getSessionId()
  }, [])

  const flush = useCallback(async () => {
    if (queueRef.current.length === 0) return

    const items = queueRef.current.splice(0, MAX_BATCH_SIZE)

    try {
      await fetch('/api/activity/breadcrumbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
    } catch {
      // Non-blocking - breadcrumb tracking should never break the app
    }
  }, [])

  // Set up periodic flush
  useEffect(() => {
    flushTimerRef.current = setInterval(flush, BATCH_INTERVAL_MS)

    // Flush on page unload
    const handleUnload = () => {
      if (queueRef.current.length > 0) {
        const items = queueRef.current.splice(0)
        // Use sendBeacon for reliable delivery during unload
        try {
          navigator.sendBeacon(
            '/api/activity/breadcrumbs',
            new Blob([JSON.stringify({ items })], { type: 'application/json' })
          )
        } catch {
          // Last resort - ignore
        }
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
      window.removeEventListener('beforeunload', handleUnload)
      // Flush remaining on unmount
      void flush()
    }
  }, [flush])

  // Track route changes
  useEffect(() => {
    if (!pathname) return

    const referrer = prevPathRef.current
    prevPathRef.current = pathname

    // Skip if same path (e.g. re-render without navigation)
    if (referrer === pathname) return

    queueRef.current.push({
      breadcrumb_type: 'page_view',
      path: pathname,
      referrer_path: referrer || undefined,
      session_id: sessionId.current,
      timestamp: new Date().toISOString(),
    })

    // Auto-flush if queue is getting big
    if (queueRef.current.length >= MAX_BATCH_SIZE) {
      void flush()
    }
  }, [pathname, flush])

  // No UI - this is a silent tracker
  return null
}

/**
 * Track a non-navigation interaction (click, form open, tab switch, search).
 * Call this from any component to record an interaction breadcrumb.
 */
export function trackBreadcrumb(
  type: 'click' | 'form_open' | 'tab_switch' | 'search',
  label: string,
  metadata?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return

  const sid = window.sessionStorage.getItem('cf-breadcrumb-session') || ''
  const path = window.location.pathname

  // Fire and forget - non-blocking
  fetch('/api/activity/breadcrumbs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          breadcrumb_type: type,
          path,
          label,
          session_id: sid,
          metadata,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  }).catch(() => {})
}
