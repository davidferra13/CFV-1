'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { storeLastActivePath } from '@/lib/session/recovery'

/**
 * Invisible component that tracks route changes and stores
 * the last active path for session recovery.
 * Mount once in the chef layout.
 */
export function RouteTracker() {
  const pathname = usePathname()
  const lastRef = useRef<string>('')

  useEffect(() => {
    if (pathname && pathname !== lastRef.current) {
      lastRef.current = pathname
      storeLastActivePath(pathname)
    }
  }, [pathname])

  return null
}
