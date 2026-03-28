'use client'

import { useEffect, useState } from 'react'
import { getInquiryStats } from '@/lib/inquiries/actions'

/**
 * Client component that shows count of inquiries needing chef attention
 * (status: new + awaiting_chef). Polls every 30 seconds.
 * Used in the nav sidebar next to the Inquiries label.
 */
export function InquiriesUnreadBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible'

    const fetchCount = async () => {
      if (!isVisible()) return

      try {
        const stats = await getInquiryStats()
        const pending = (stats.new ?? 0) + (stats.awaiting_chef ?? 0)
        if (mounted) setCount(pending)
      } catch {
        // Non-critical
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchCount()
      }
    }

    void fetchCount()
    const interval = setInterval(() => {
      void fetchCount()
    }, 30_000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (count <= 0) return null

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xxs font-bold bg-blue-600 text-white ml-auto">
      {count > 99 ? '99+' : count}
    </span>
  )
}
