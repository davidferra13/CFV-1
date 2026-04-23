'use client'

import { useRef } from 'react'
import type { VideoHTMLAttributes } from 'react'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

type TrackedVideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  analyticsName: string
  analyticsProps?: Record<string, string | number | boolean | null>
}

export function TrackedVideo({
  analyticsName,
  analyticsProps,
  onPlay,
  ...props
}: TrackedVideoProps) {
  const hasTrackedPlayRef = useRef(false)

  return (
    <video
      {...props}
      onPlay={(event) => {
        if (!hasTrackedPlayRef.current) {
          hasTrackedPlayRef.current = true
          trackEvent(ANALYTICS_EVENTS.PRODUCT_DEMO_PLAYED, {
            demo_name: analyticsName,
            ...analyticsProps,
          })
        }
        onPlay?.(event)
      }}
    />
  )
}
