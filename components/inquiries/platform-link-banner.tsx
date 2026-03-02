// Platform Link Banner
// Shows a prominent "Open in {Platform}" button for platform inquiries.
// Works for any platform that stores an external_link (Yhangry, future platforms).
// TakeAChef has its own specialized components (TacAddressLead, TacStatusPrompt)
// so this component is used for non-TAC platforms.
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const PLATFORM_DISPLAY: Record<string, { label: string; badge: string }> = {
  yhangry: { label: 'Yhangry', badge: 'Yhangry' },
  take_a_chef: { label: 'TakeAChef', badge: 'TakeAChef' },
}

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
  const display = PLATFORM_DISPLAY[platform] || {
    label: platform,
    badge: platform,
  }
  const displayName = clientName || 'A client'

  const statusMessage =
    status === 'new'
      ? `${displayName} sent you a request on ${display.label}. Open it on the platform to respond.`
      : status === 'awaiting_chef'
        ? `${displayName} is waiting for your response on ${display.label}.`
        : `View this inquiry on ${display.label} to manage it on the platform.`

  return (
    <div className="rounded-lg border border-purple-400/40 bg-purple-950/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="info">{display.badge}</Badge>
          <p className="text-sm font-medium text-stone-200 truncate">{statusMessage}</p>
        </div>

        <a href={externalLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Button variant="primary" size="sm" type="button">
            Open in {display.label}
          </Button>
        </a>
      </div>

      {externalInquiryId && (
        <p className="text-xs text-stone-500">
          {display.label} reference: {externalInquiryId}
        </p>
      )}
    </div>
  )
}
