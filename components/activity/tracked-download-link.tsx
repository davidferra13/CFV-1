// TrackedDownloadLink - fires a document_downloaded activity event on click,
// then lets the download proceed normally. Fire-and-forget; never blocks the download.
'use client'

import { useCallback } from 'react'
import { buildActivityTrackPayload } from '@/lib/activity/client-payload'
import {
  consumeLivePrivacySurfacePrivateOnce,
  getLivePrivacySignalLabel,
  recordLivePrivacyReceipt,
  shouldShareActivitySignal,
  useLivePrivacy,
} from './live-privacy-controls'

interface TrackedDownloadLinkProps {
  href: string
  documentType: 'receipt' | 'foh_menu' | 'prep_sheet'
  entityId: string
  children: React.ReactNode
  className?: string
}

export function TrackedDownloadLink({
  href,
  documentType,
  entityId,
  children,
  className,
}: TrackedDownloadLinkProps) {
  const { state, isReady } = useLivePrivacy()

  const handleClick = useCallback(() => {
    if (!isReady) return
    const oneTimePrivate = consumeLivePrivacySurfacePrivateOnce('documents')
    const shouldShare = !oneTimePrivate && shouldShareActivitySignal('document_downloaded', state)

    recordLivePrivacyReceipt({
      signal: getLivePrivacySignalLabel('document_downloaded'),
      surface: 'documents',
      outcome: shouldShare ? 'shared' : 'private',
      detail: shouldShare
        ? 'ChefFlow shared this document download signal.'
        : oneTimePrivate
          ? 'ChefFlow kept this one-time document download private.'
          : 'ChefFlow kept this document download private.',
    })

    if (!shouldShare) return

    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        buildActivityTrackPayload({
          eventType: 'document_downloaded',
          entityType: documentType,
          entityId,
          metadata: { document_type: documentType },
        })
      ),
    }).catch(() => {
      // Silently ignore tracking failures
    })
  }, [documentType, entityId, isReady, state])

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  )
}
