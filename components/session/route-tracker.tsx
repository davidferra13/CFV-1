'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { storeLastActivePath } from '@/lib/session/recovery'
import { logSurfaceVisit } from '@/lib/surfaces/analytics/usage-tracking'

/**
 * Invisible component that tracks route changes and stores
 * the last active path for session recovery, and logs surface
 * visits for usage analytics.
 * Mount once in the chef layout.
 */
export function RouteTracker() {
  const pathname = usePathname()
  const lastRef = useRef<string>('')

  useEffect(() => {
    if (pathname && pathname !== lastRef.current) {
      lastRef.current = pathname
      storeLastActivePath(pathname)
      // Fire-and-forget: log surface visit for usage analytics
      logSurfaceVisit(pathname)
    }
  }, [pathname])

  return null
}
