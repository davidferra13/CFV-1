'use client'

/**
 * AiOutageBanner - Full-width banner shown when AI has been offline for 2+ minutes.
 * Polls /api/ai/health every 30s. Only renders after sustained outage (not a single blip).
 * Dismissible per session. Auto-hides when AI recovers.
 */

import { useState, useEffect, useRef } from 'react'

export function AiOutageBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const offlineSince = useRef<number | null>(null)

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        const res = await fetch('/api/ai/health', { cache: 'no-store' })
        const isDown = !res.ok
        let data: { status?: string } | null = null
        if (res.ok) {
          try {
            data = await res.json()
          } catch {
            /* ignore */
          }
        }
        const offline = isDown || (data?.status !== 'all_healthy' && data?.status !== 'degraded')

        if (!mounted) return

        if (offline) {
          if (!offlineSince.current) {
            offlineSince.current = Date.now()
          }
          // Show banner after 2 minutes of sustained outage
          if (Date.now() - offlineSince.current >= 120_000) {
            setVisible(true)
          }
        } else {
          offlineSince.current = null
          setVisible(false)
          setDismissed(false)
        }
      } catch {
        if (!mounted) return
        if (!offlineSince.current) {
          offlineSince.current = Date.now()
        }
        if (Date.now() - offlineSince.current >= 120_000) {
          setVisible(true)
        }
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (!visible || dismissed) return null

  return (
    <div
      className="bg-amber-900/80 border-b border-amber-700 px-4 py-2 flex items-center justify-between text-sm"
      role="alert"
    >
      <p className="text-amber-100">
        AI features (Remy, auto-drafts, analysis) are temporarily unavailable. Other features work
        normally. This banner will disappear when AI recovers.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 text-amber-300 hover:text-amber-100 text-xs font-medium shrink-0"
        aria-label="Dismiss AI outage banner"
      >
        Dismiss
      </button>
    </div>
  )
}
