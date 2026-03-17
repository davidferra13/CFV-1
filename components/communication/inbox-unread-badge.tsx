'use client'

import { useEffect, useState } from 'react'
import { getUnreadThreadCount } from '@/lib/communication/actions'

/**
 * Client component that fetches and displays the unread inbox count.
 * Polls every 30 seconds so the badge stays current without a full page reload.
 * Used in the nav sidebar next to the Inbox label.
 */
export function InboxUnreadBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible'

    const fetchCount = async () => {
      if (!isVisible()) return

      try {
        const n = await getUnreadThreadCount()
        if (mounted) setCount(n)
      } catch {
        // Silently fail - badge is non-critical
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
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-600 text-white ml-auto">
      {count > 99 ? '99+' : count}
    </span>
  )
}
