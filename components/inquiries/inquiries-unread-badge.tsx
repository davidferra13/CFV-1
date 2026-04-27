'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPendingInquiryCount } from '@/lib/inquiries/actions'
import { useSSE } from '@/lib/realtime/sse-client'

/**
 * Client component that shows count of inquiries needing chef attention
 * (status: new + awaiting_chef). Subscribes to SSE for instant updates;
 * falls back to 120s polling. Used in the nav sidebar next to the Events label.
 *
 * @param sseChannel - Optional SSE channel (e.g. `chef-${tenantId}`). SSE disabled when omitted.
 */
export function InquiriesUnreadBadge({ sseChannel }: { sseChannel?: string } = {}) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    const isVisible =
      typeof document === 'undefined' || document.visibilityState === 'visible'
    if (!isVisible) return

    try {
      const pending = await getPendingInquiryCount()
      setCount(pending)
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
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xxs font-bold bg-blue-600 text-white ml-auto">
      {count > 99 ? '99+' : count}
    </span>
  )
}
