'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  markPlatformResponded,
  markPlatformDeclined,
  markPlatformBooked,
  markPlatformProposalSent,
} from '@/lib/marketplace/platform-ui-actions'
import type {
  PlatformRecordSummary,
  PlatformPayoutSummary,
} from '@/lib/marketplace/platform-record-readers'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const PLATFORM_DISPLAY: Record<string, { label: string; badge: string; color: string }> = {
  take_a_chef: { label: 'Take a Chef', badge: 'TAC', color: 'text-purple-300' },
  yhangry: { label: 'Yhangry', badge: 'Yhangry', color: 'text-pink-300' },
  cozymeal: { label: 'Cozymeal', badge: 'Cozymeal', color: 'text-blue-300' },
  bark: { label: 'Bark', badge: 'Bark', color: 'text-green-300' },
  thumbtack: { label: 'Thumbtack', badge: 'Thumbtack', color: 'text-yellow-300' },
  gigsalad: { label: 'GigSalad', badge: 'GigSalad', color: 'text-orange-300' },
  theknot: { label: 'The Knot', badge: 'The Knot', color: 'text-rose-300' },
  privatechefmanager: { label: 'PCM', badge: 'PCM', color: 'text-indigo-300' },
  hireachef: { label: 'HireAChef', badge: 'HireAChef', color: 'text-teal-300' },
  cuisineistchef: { label: 'Cuisineist', badge: 'Cuisineist', color: 'text-cyan-300' },
  google_business: { label: 'Google Business', badge: 'Google', color: 'text-red-300' },
  wix_forms: { label: 'Wix', badge: 'Wix', color: 'text-sky-300' },
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  new: { label: 'New', variant: 'warning' },
  responded: { label: 'Responded', variant: 'info' },
  proposal_sent: { label: 'Proposal Sent', variant: 'info' },
  booked: { label: 'Booked', variant: 'success' },
  contact_revealed: { label: 'Contact Revealed', variant: 'success' },
  paid: { label: 'Paid', variant: 'success' },
  declined: { label: 'Declined', variant: 'error' },
}

const LINK_HEALTH_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' }
> = {
  unknown: { label: 'Link Unchecked', variant: 'default' },
  working: { label: 'Link Active', variant: 'success' },
  login_required: { label: 'Login Required', variant: 'warning' },
  expired: { label: 'Link Expired', variant: 'error' },
}

interface MarketplaceActionPanelProps {
  record: PlatformRecordSummary
  payout: PlatformPayoutSummary | null
  inquiryId: string
  clientName: string | null
  /** Fallback data from legacy inquiry fields when no platform_record exists */
  legacyFallback?: {
    platform: string
    externalLink: string | null
    externalInquiryId: string | null
    status: string
  } | null
}

export function MarketplaceActionPanel({
  record,
  payout,
  inquiryId,
  clientName,
}: MarketplaceActionPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const display = PLATFORM_DISPLAY[record.platform] || {
    label: record.platform,
    badge: record.platform,
    color: 'text-stone-300',
  }

  const statusInfo = STATUS_BADGE[record.statusOnPlatform || 'new'] || STATUS_BADGE.new
  const linkInfo = LINK_HEALTH_BADGE[record.linkHealth] || LINK_HEALTH_BADGE.unknown

  const handleAction = (action: () => Promise<void>, label: string) => {
    setActionError(null)
    startTransition(async () => {
      try {
        await action()
        toast.success(label)
        router.refresh()
      } catch (err: any) {
        setActionError(err.message || 'Action failed')
        toast.error(`Failed: ${err.message || 'Unknown error'}`)
      }
    })
  }

  // Determine which action buttons to show based on current status
  const showRespondButton = record.statusOnPlatform === 'new'
  const showProposalButton =
    record.statusOnPlatform === 'new' || record.statusOnPlatform === 'responded'
  const showBookedButton =
    record.statusOnPlatform !== 'booked' &&
    record.statusOnPlatform !== 'paid' &&
    record.statusOnPlatform !== 'declined'
  const showDeclineButton =
    record.statusOnPlatform !== 'declined' &&
    record.statusOnPlatform !== 'booked' &&
    record.statusOnPlatform !== 'paid'

  const primaryUrl = record.requestUrl || record.externalUrl

  return (
    <Card className="border-purple-400/40 bg-purple-950/30 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="info">{display.badge}</Badge>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Badge variant={linkInfo.variant}>{linkInfo.label}</Badge>
        </div>

        {primaryUrl && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open(primaryUrl, '_blank', 'noopener,noreferrer')}
            className="shrink-0"
          >
            Open in {display.label}
          </Button>
        )}
      </div>

      {/* Status message */}
      {record.nextActionRequired && (
        <p className="text-sm text-stone-300">
          {record.nextActionBy === 'chef' ? 'You need to: ' : 'Waiting: '}
          {record.nextActionRequired}
        </p>
      )}

      {/* Payout info */}
      {payout && payout.grossBookingCents && (
        <div className="flex items-center gap-4 text-sm border-t border-stone-700/50 pt-2">
          <span className="text-stone-400">
            Gross:{' '}
            <span className="text-stone-200 font-medium">
              ${(payout.grossBookingCents / 100).toFixed(2)}
            </span>
          </span>
          {payout.commissionPercent != null && (
            <span className="text-stone-400">
              Commission: <span className="text-red-400">{payout.commissionPercent}%</span>
            </span>
          )}
          {payout.netPayoutCents != null && (
            <span className="text-stone-400">
              Net:{' '}
              <span className="text-green-400 font-medium">
                ${(payout.netPayoutCents / 100).toFixed(2)}
              </span>
            </span>
          )}
          <Badge
            variant={
              payout.payoutStatus === 'paid'
                ? 'success'
                : payout.payoutStatus === 'pending'
                  ? 'warning'
                  : 'default'
            }
          >
            {payout.payoutStatus}
          </Badge>
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex items-center gap-2 flex-wrap border-t border-stone-700/50 pt-2">
        {showRespondButton && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              handleAction(() => markPlatformResponded(inquiryId), 'Marked as responded')
            }
          >
            I Responded
          </Button>
        )}
        {showProposalButton && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => handleAction(() => markPlatformProposalSent(inquiryId), 'Proposal sent')}
          >
            Proposal Sent
          </Button>
        )}
        {showBookedButton && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => handleAction(() => markPlatformBooked(inquiryId), 'Marked as booked')}
          >
            Client Booked
          </Button>
        )}
        {showDeclineButton && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() => handleAction(() => markPlatformDeclined(inquiryId), 'Declined')}
          >
            Decline
          </Button>
        )}

        {/* Deep links */}
        {record.proposalUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(record.proposalUrl!, '_blank', 'noopener,noreferrer')}
          >
            View Proposal
          </Button>
        )}
        {record.bookingUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(record.bookingUrl!, '_blank', 'noopener,noreferrer')}
          >
            View Booking
          </Button>
        )}
        {record.guestContactUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(record.guestContactUrl!, '_blank', 'noopener,noreferrer')}
          >
            Guest Contact
          </Button>
        )}
      </div>

      {/* Error state */}
      {actionError && <p className="text-xs text-red-400">{actionError}</p>}

      {/* Reference info */}
      {record.externalInquiryId && (
        <p className="text-xs text-stone-500">
          {display.label} ref: {record.externalInquiryId}
        </p>
      )}
    </Card>
  )
}

/**
 * Fallback banner for inquiries that don't have a platform_record yet
 * (pre-write-through). Shows the same "Open in {Platform}" button from legacy fields.
 */
export function MarketplaceFallbackBanner({
  platform,
  externalLink,
  externalInquiryId,
  clientName,
  status,
}: {
  platform: string
  externalLink: string
  externalInquiryId: string | null
  clientName: string | null
  status: string
}) {
  const display = PLATFORM_DISPLAY[platform] || {
    label: platform,
    badge: platform,
    color: 'text-stone-300',
  }
  const displayName = clientName || 'A client'

  const statusMessage =
    status === 'new'
      ? `${displayName} sent you a request on ${display.label}. Open it on the platform to respond.`
      : status === 'awaiting_chef'
        ? `${displayName} is waiting for your response on ${display.label}.`
        : `View this inquiry on ${display.label}.`

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
          onClick={() => window.open(externalLink, '_blank', 'noopener,noreferrer')}
          className="shrink-0"
        >
          Open in {display.label}
        </Button>
      </div>

      {externalInquiryId && (
        <p className="text-xs text-stone-500">
          {display.label} reference: {externalInquiryId}
        </p>
      )}
    </div>
  )
}
