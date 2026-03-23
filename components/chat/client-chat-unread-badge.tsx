'use client'

import { useEffect, useState } from 'react'
import { getTotalUnreadCount } from '@/lib/chat/actions'

/**
 * Self-fetching unread badge for the Messages nav item.
 * Polls every 30 seconds and re-fetches on tab focus.
 */
export function ClientChatUnreadBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible'

    const fetchCount = async () => {
      if (!isVisible()) return
      try {
        const n = await getTotalUnreadCount()
        if (mounted) setCount(n)
      } catch {
        // Non-critical
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void fetchCount()
    }

    void fetchCount()
    const interval = setInterval(() => void fetchCount(), 30_000)
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
