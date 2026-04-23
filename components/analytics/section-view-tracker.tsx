'use client'

import { useEffect, useRef } from 'react'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

type SectionViewTrackerProps = {
  moduleName: string
  pageName: string
  properties?: Record<string, string | number | boolean | null>
  className?: string
}

export function SectionViewTracker({
  moduleName,
  pageName,
  properties,
  className,
}: SectionViewTrackerProps) {
  const markerRef = useRef<HTMLDivElement | null>(null)
  const hasTrackedRef = useRef(false)

  useEffect(() => {
    const node = markerRef.current
    if (!node || hasTrackedRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (!isVisible || hasTrackedRef.current) return

        hasTrackedRef.current = true
        trackEvent(ANALYTICS_EVENTS.TRUST_MODULE_VIEWED, {
          page: pageName,
          module_name: moduleName,
          ...properties,
        })
        observer.disconnect()
      },
      {
        rootMargin: '0px 0px -15% 0px',
        threshold: 0.35,
      }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [moduleName, pageName, properties])

  return <div ref={markerRef} aria-hidden="true" className={className} />
}
