'use client'

// Auto-refresher for the Staff Activity Board (Phase 8)
// Triggers a router.refresh() every N seconds to keep the board current.
// Designed for wall-mounted screens that run 24/7.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  intervalSeconds: number
}

export function StaffBoardRefresher({ intervalSeconds }: Props) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, intervalSeconds * 1000)

    return () => clearInterval(interval)
  }, [intervalSeconds, router])

  return null
}
