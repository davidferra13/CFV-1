'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import type { ActivityEventType } from '@/lib/activity/types'
import { buildActivityTrackPayload } from '@/lib/activity/client-payload'

interface TrackedActivityLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  target?: string
  rel?: string
  eventType?: ActivityEventType
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export function TrackedActivityLink({
  href,
  children,
  className,
  target,
  rel,
  eventType = 'page_viewed',
  entityType,
  entityId,
  metadata,
}: TrackedActivityLinkProps) {
  const handleClick = useCallback(() => {
    fetch('/api/activity/track', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        buildActivityTrackPayload({
          eventType,
          entityType,
          entityId,
          metadata,
        })
      ),
    }).catch(() => {
      // Silently ignore tracking failures.
    })
  }, [entityId, entityType, eventType, metadata])

  return (
    <Link href={href} onClick={handleClick} className={className} target={target} rel={rel}>
      {children}
    </Link>
  )
}
