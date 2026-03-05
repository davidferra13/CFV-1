'use client'

import { useEffect, useRef } from 'react'
import { trackPageView } from '@/lib/analytics/posthog'

type PublicPageViewProps = {
  pageName: string
  properties?: Record<string, string | number | boolean>
}

export function PublicPageView({ pageName, properties }: PublicPageViewProps) {
  const hasTrackedRef = useRef(false)

  useEffect(() => {
    if (hasTrackedRef.current) return
    hasTrackedRef.current = true
    trackPageView(pageName, properties)
  }, [pageName, properties])

  return null
}
