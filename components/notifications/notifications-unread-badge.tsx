'use client'

import { useEffect, useState } from 'react'
import { getUnreadCount } from '@/lib/notifications/actions'

/**
 * Client component that fetches and displays the unread notification count.
 * Polls every 30 seconds. Used in the nav sidebar next to the Notifications label.
 */
export function NotificationsUnreadBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible'

    const fetchCount = async () => {
      if (!isVisible()) return

      try {
        const n = await getUnreadCount()
        if (mounted) setCount(n)
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
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xxs font-bold bg-amber-600 text-white ml-auto">
      {count > 99 ? '99+' : count}
    </span>
  )
}
