'use client'

import { useEffect, useState, useCallback } from 'react'
import { getUnreadThreadCount } from '@/lib/communication/actions'
import { useSSE } from '@/lib/realtime/sse-client'

/**
 * Client component that fetches and displays the unread inbox count.
 * Subscribes to SSE for instant updates; falls back to 120s polling.
 * Used in the nav sidebar next to the Inbox label.
 *
 * @param sseChannel - Optional SSE channel (e.g. `tenant:${tenantId}`). SSE disabled when omitted.
 */
export function InboxUnreadBadge({ sseChannel }: { sseChannel?: string } = {}) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    const isVisible =
      typeof document === 'undefined' || document.visibilityState === 'visible'
    if (!isVisible) return

    try {
      const n = await getUnreadThreadCount()
      setCount(n)
    } catch {
      // Silently fail - badge is non-critical
    }
  }, [])

  // SSE subscription: re-fetch on any message in the channel
  useSSE(sseChannel ?? '', {
    enabled: Boolean(sseChannel),
    onMessage: () => {
      void fetchCount()
    },
  })

  useEffect(() => {
    let mounted = true

    const wrappedFetch = async () => {
      if (!mounted) return
      await fetchCount()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void wrappedFetch()
      }
    }

    void wrappedFetch()
    const interval = setInterval(() => {
      void wrappedFetch()
    }, 120_000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchCount])

  if (count <= 0) return null

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xxs font-bold bg-red-600 text-white ml-auto">
      {count > 99 ? '99+' : count}
    </span>
  )
}
