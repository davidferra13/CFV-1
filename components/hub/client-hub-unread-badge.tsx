'use client'

import { useEffect, useState } from 'react'
import { getMyHubUnreadCount } from '@/lib/hub/notification-actions'

/**
 * Client-side polling badge for unread hub messages.
 * Used in client nav sidebar next to the My Hub label.
 */
export function ClientHubUnreadBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible'

    const fetchCount = async () => {
      if (!isVisible()) return
      try {
        const n = await getMyHubUnreadCount()
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
    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e88f47] px-1 text-xxs font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
