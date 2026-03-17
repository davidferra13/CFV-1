'use client'

import { useEffect, useState } from 'react'
import { getCirclesUnreadCount } from '@/lib/hub/chef-circle-actions'

/**
 * Client component that fetches and displays the total unread circle message count.
 * Polls every 30 seconds. Used in the nav sidebar next to the Circles label.
 */
export function CirclesUnreadBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible'

    const fetchCount = async () => {
      if (!isVisible()) return

      try {
        const n = await getCirclesUnreadCount()
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
    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e88f47] px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
