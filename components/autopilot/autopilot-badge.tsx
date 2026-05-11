'use client'

import { useEffect, useState } from 'react'
import { getAutopilotQueueCount } from '@/lib/autopilot/actions'

/**
 * Badge that shows how many client events need a status update.
 * Polls every 60s - less aggressive than inbox (updates are less time-critical).
 */
export function AutopilotBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const isVisible = () =>
      typeof document === 'undefined' || document.visibilityState === 'visible'

    const fetchCount = async () => {
      if (!isVisible()) return
      try {
        const n = await getAutopilotQueueCount()
        if (mounted) setCount(n)
      } catch {
        // Non-critical
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void fetchCount()
    }

    void fetchCount()
    const interval = setInterval(() => void fetchCount(), 60_000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (count <= 0) return null

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xxs font-bold bg-amber-500 text-white ml-auto">
      {count > 99 ? '99+' : count}
    </span>
  )
}
