'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  flushDiscoveryDestinationOutcome,
  mergeAnonymousDiscoveryHistory,
} from '@/lib/discovery/track-discovery-click'

export function DiscoveryOutcomeTracker() {
  const pathname = usePathname()

  useEffect(() => {
    mergeAnonymousDiscoveryHistory()
    flushDiscoveryDestinationOutcome()
  }, [pathname])

  return null
}
