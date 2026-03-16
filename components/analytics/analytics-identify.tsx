'use client'

import { useEffect, useRef } from 'react'
import { identifyUser } from '@/lib/analytics/posthog'

interface AnalyticsIdentifyProps {
  userId: string
  email: string
  role: string
  traits?: Record<string, string | number | boolean>
}

/**
 * Client component that identifies the current user for PostHog analytics.
 * Renders nothing - purely a side-effect component.
 *
 * Place inside any authenticated layout to associate analytics events
 * with the logged-in user.
 */
export function AnalyticsIdentify({ userId, email, role, traits }: AnalyticsIdentifyProps) {
  const identified = useRef(false)

  useEffect(() => {
    if (identified.current) return
    identified.current = true

    // Small delay to let PostHog provider finish initializing
    const timer = setTimeout(() => {
      identifyUser(userId, { email, role, ...traits })
    }, 500)

    return () => clearTimeout(timer)
  }, [userId, email, role, traits])

  return null
}
