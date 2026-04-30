// Platform Link Banner
// Shows a prominent source link button for platform inquiries.
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getSafeSourcePlatformBadge,
  getSafeSourcePlatformLabel,
} from '@/lib/marketplace/source-platform-display'

interface PlatformLinkBannerProps {
  platform: string
  externalLink: string
  externalInquiryId: string | null
  clientName: string | null
  status: string
}

export function PlatformLinkBanner({
  platform,
  externalLink,
  externalInquiryId,
  clientName,
  status,
}: PlatformLinkBannerProps) {
  const display = {
    label: getSafeSourcePlatformLabel(platform),
    badge: getSafeSourcePlatformBadge(platform),
  }
  const displayName = clientName || 'A client'

  const statusMessage =
    status === 'new'
      ? `${displayName} sent you a request on a source platform. Open the source to respond.`
      : status === 'awaiting_chef'
        ? `${displayName} is waiting for your response on the source platform.`
        : 'View this inquiry on the source platform.'

  return (
    <div className="rounded-lg border border-purple-400/40 bg-purple-950/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="info">{display.badge}</Badge>
          <p className="text-sm font-medium text-stone-200 truncate">{statusMessage}</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          Open source
        </Button>
      </div>

      {externalInquiryId && (
        <p className="text-xs text-stone-500">Source reference: {externalInquiryId}</p>
      )}
    </div>
  )
}
