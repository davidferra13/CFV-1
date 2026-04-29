'use client'

// Auto-refresher for the Staff Activity Board (Phase 8)
// Triggers a router.refresh() every N seconds to keep the board current.
// Designed for wall-mounted screens that run 24/7.

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { trackedRouterRefresh } from '@/lib/runtime/tracked-router-refresh'

type Props = {
  intervalSeconds: number
}

export function StaffBoardRefresher({ intervalSeconds }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const interval = setInterval(() => {
      trackedRouterRefresh(router, {
        pathname,
        source: 'staff-board-refresher',
        event: 'interval',
        reason: `${intervalSeconds}s poll`,
      })
    }, intervalSeconds * 1000)

    return () => clearInterval(interval)
  }, [intervalSeconds, pathname, router])

  return null
}
