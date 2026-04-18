'use client'

/**
 * AiStatusDot - Lightweight AI availability indicator for non-admin users.
 * Shows a colored dot in the nav: green (ready), amber (degraded), hidden (online is default).
 * Only becomes visible when AI is degraded or offline. No controls, no popover.
 *
 * Admin users see the full OllamaStatusBadge instead; this is for regular users only.
 */

import { useState, useEffect } from 'react'

type AiState = 'ready' | 'degraded' | 'offline'

export function AiStatusDot() {
  const [state, setState] = useState<AiState>('ready')

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        const res = await fetch('/api/ai/health', { cache: 'no-store' })
        if (!res.ok) {
          if (mounted) setState('offline')
          return
        }
        const data = await res.json()
        if (mounted) {
          if (data.status === 'all_healthy') setState('ready')
          else if (data.status === 'degraded') setState('degraded')
          else setState('offline')
        }
      } catch {
        if (mounted) setState('offline')
      }
    }

    check()
    const interval = setInterval(check, 60_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  // Don't show anything when AI is healthy (default state, no noise)
  if (state === 'ready') return null

  return (
    <div
      className="relative flex items-center justify-center h-8 w-8"
      title={
        state === 'degraded'
          ? 'AI features may be slower than usual'
          : 'AI features are temporarily unavailable'
      }
      role="status"
      aria-label={
        state === 'degraded'
          ? 'AI features may be slower than usual'
          : 'AI features are temporarily unavailable'
      }
    >
      <span
        className={`h-2 w-2 rounded-full ${
          state === 'degraded' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
        }`}
      />
    </div>
  )
}
