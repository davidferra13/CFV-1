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

    const fetchCount = async () => {
      try {
        const n = await getCirclesUnreadCount()
        if (mounted) setCount(n)
      } catch {
        // Non-critical
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30_000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (count <= 0) return null

  return (
    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e88f47] px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
