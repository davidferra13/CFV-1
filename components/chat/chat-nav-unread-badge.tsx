'use client'

import { useEffect, useState } from 'react'
import { getTotalUnreadCount } from '@/lib/chat/actions'

/**
 * Nav badge showing total unread chat message count.
 * Polls every 30s and refreshes on tab focus.
 */
export function ChatNavUnreadBadge() {
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
        // Non-critical - fail silently
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
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xxs font-bold bg-red-600 text-white ml-auto">
      {count > 99 ? '99+' : count}
    </span>
  )
}
