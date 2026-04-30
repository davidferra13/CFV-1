'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import type { ActivityEventType } from '@/lib/activity/types'
import { buildActivityTrackPayload } from '@/lib/activity/client-payload'
import {
  consumeLivePrivacySurfacePrivateOnce,
  getLivePrivacySignalLabel,
  getLivePrivacySurfaceForEvent,
  recordLivePrivacyReceipt,
  shouldShareActivitySignal,
  useLivePrivacy,
} from './live-privacy-controls'

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
  const { state, isReady } = useLivePrivacy()

  const handleClick = useCallback(() => {
    if (!isReady) return
    const surface = getLivePrivacySurfaceForEvent(eventType)
    const oneTimePrivate = consumeLivePrivacySurfacePrivateOnce(surface)
    const shouldShare = !oneTimePrivate && shouldShareActivitySignal(eventType, state)

    recordLivePrivacyReceipt({
      signal: getLivePrivacySignalLabel(eventType),
      surface: surface ?? 'presence',
      outcome: shouldShare ? 'shared' : 'private',
      detail: shouldShare
        ? 'ChefFlow shared this live navigation signal.'
        : oneTimePrivate
          ? 'ChefFlow kept this one-time navigation signal private.'
          : 'ChefFlow kept this navigation signal private.',
    })

    if (!shouldShare) return

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
  }, [entityId, entityType, eventType, isReady, metadata, state])

  return (
    <Link href={href} onClick={handleClick} className={className} target={target} rel={rel}>
      {children}
    </Link>
  )
}
