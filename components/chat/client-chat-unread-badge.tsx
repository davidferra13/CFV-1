'use client'

import { useEffect, useState, useCallback } from 'react'
import { getTotalUnreadCount } from '@/lib/chat/actions'
import { useSSE } from '@/lib/realtime/sse-client'

/**
 * Self-fetching unread badge for the Messages nav item (client portal).
 * Subscribes to SSE for instant updates; falls back to 120s polling.
 *
 * @param sseChannel - Optional SSE channel (e.g. `user:${userId}`). SSE disabled when omitted.
 */
export function ClientChatUnreadBadge({ sseChannel }: { sseChannel?: string } = {}) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    const isVisible =
      typeof document === 'undefined' || document.visibilityState === 'visible'
    if (!isVisible) return
    try {
      const n = await getTotalUnreadCount()
      setCount(n)
    } catch {
      // Non-critical
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
      if (document.visibilityState === 'visible') void wrappedFetch()
    }

    void wrappedFetch()
    const interval = setInterval(() => void wrappedFetch(), 120_000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchCount])

  if (count <= 0) return null

  return (
    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e88f47] px-1 text-xxs font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
