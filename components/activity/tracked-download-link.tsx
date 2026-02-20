// TrackedDownloadLink — fires a document_downloaded activity event on click,
// then lets the download proceed normally. Fire-and-forget; never blocks the download.
'use client'

import { useCallback } from 'react'

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
  const handleClick = useCallback(() => {
    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'document_downloaded',
        entity_type: documentType,
        entity_id: entityId,
        metadata: { document_type: documentType },
      }),
    }).catch(() => {
      // Silently ignore tracking failures
    })
  }, [documentType, entityId])

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
