import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MarketplaceInquiryContext } from '@/lib/marketplace/platform-records'
import { formatCurrency } from '@/lib/utils/currency'

interface MarketplaceActionPanelProps {
  context: MarketplaceInquiryContext | null
  inquiryStatus: string
  clientName: string | null
}

type LinkKind = keyof MarketplaceInquiryContext['urls']

function getRelativeTime(value: string | null): string | null {
  if (!value) return null
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

function getHealthVariant(
  linkHealth: MarketplaceInquiryContext['linkHealth']
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (linkHealth === 'working') return 'success'
  if (linkHealth === 'login_required') return 'warning'
  if (linkHealth === 'expired') return 'error'
  return 'info'
}

function getLinkLabel(kind: LinkKind, platformLabel: string): string {
  if (kind === 'request') return 'Open request'
  if (kind === 'proposal') return 'Open proposal'
  if (kind === 'guestContact') return 'Open guest contact'
  if (kind === 'booking') return 'Open booking'
  if (kind === 'menu') return 'Open menu'
  return `Open in ${platformLabel}`
}

function getPrimaryKind(
  context: MarketplaceInquiryContext,
  inquiryStatus: string
): LinkKind | null {
  const order =
    inquiryStatus === 'confirmed'
      ? (['booking', 'guestContact', 'menu', 'proposal', 'request', 'external'] as LinkKind[])
      : inquiryStatus === 'new' || inquiryStatus === 'awaiting_chef'
        ? (['request', 'proposal', 'external', 'guestContact', 'booking', 'menu'] as LinkKind[])
        : (['proposal', 'request', 'external', 'guestContact', 'booking', 'menu'] as LinkKind[])

  return order.find((kind) => Boolean(context.urls[kind])) ?? null
}

function buildSecondaryLinks(
  context: MarketplaceInquiryContext,
  primaryKind: LinkKind | null
): Array<{ kind: LinkKind; href: string; label: string }> {
  const seen = new Set<string>()
  const links: Array<{ kind: LinkKind; href: string; label: string }> = []

  for (const kind of ['request', 'proposal', 'guestContact', 'booking', 'menu', 'external'] as LinkKind[]) {
    const href = context.urls[kind]
    if (!href || kind === primaryKind || seen.has(href)) continue
    seen.add(href)
    links.push({
      kind,
      href,
      label: getLinkLabel(kind, context.platformLabel),
    })
  }

  return links
}

export function MarketplaceActionPanel({
  context,
  inquiryStatus,
  clientName,
}: MarketplaceActionPanelProps) {
  if (!context) return null

  const primaryKind = getPrimaryKind(context, inquiryStatus)
  const primaryHref = primaryKind ? context.urls[primaryKind] : null
  const secondaryLinks = buildSecondaryLinks(context, primaryKind)
  const lastSnapshotLabel = getRelativeTime(context.lastSnapshotAt)
  const lastActionLabel = getRelativeTime(context.lastActionAt)
  const displayName = clientName || 'This client'

  const linkHelp =
    context.linkHealth === 'login_required'
      ? `${context.platformLabel} may ask you to sign in first, but Chef Flow is still pointing to the right record.`
      : context.linkHealth === 'expired'
        ? `This deep link may have expired. Reopen the record in ${context.platformLabel}, then use Capture current page to refresh it.`
        : `Chef Flow stores the direct ${context.platformLabel} link and the latest captured snapshot here.`

  return (
    <Card className="p-6 border-sky-900/50 bg-sky-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-stone-100">Marketplace Control</h2>
            <Badge variant="info">{context.platformLabel}</Badge>
            <Badge variant={getHealthVariant(context.linkHealth)}>
              {context.linkHealth === 'login_required'
                ? 'Login may be required'
                : context.linkHealth === 'expired'
                  ? 'Link expired'
                  : context.linkHealth === 'working'
                    ? 'Deep link ready'
                    : 'Deep link stored'}
            </Badge>
          </div>
          <p className="text-sm text-stone-300">
            {displayName} is being managed through {context.platformLabel}. {linkHelp}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
            {context.externalInquiryId && <span>Reference: {context.externalInquiryId}</span>}
            {lastSnapshotLabel && <span>Last snapshot: {lastSnapshotLabel}</span>}
            {lastActionLabel && <span>Last marketplace action: {lastActionLabel}</span>}
            {context.lastCaptureType && (
              <span>Latest capture: {context.lastCaptureType.replace(/_/g, ' ')}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {primaryHref && primaryKind && (
            <Button
              href={primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
            >
              {getLinkLabel(primaryKind, context.platformLabel)}
            </Button>
          )}
          <Button href="/marketplace/capture" variant="secondary">
            Capture current page
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Next action</p>
          <p className="text-sm text-stone-200">
            {context.nextActionRequired || 'Open the marketplace record and continue the handoff.'}
          </p>
          {context.nextActionBy && (
            <p className="text-xs text-stone-400">
              Waiting on: <span className="text-stone-300">{context.nextActionBy}</span>
            </p>
          )}
          {context.statusOnPlatform && (
            <p className="text-xs text-stone-400">
              Platform status: <span className="text-stone-300">{context.statusOnPlatform}</span>
            </p>
          )}
          {context.statusDetail && <p className="text-xs text-stone-500">{context.statusDetail}</p>}
          {context.lastLinkError && <p className="text-xs text-amber-300">{context.lastLinkError}</p>}
        </div>

        <div className="space-y-2 rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Latest snapshot</p>
          {context.latestSnapshot ? (
            <>
              {context.latestSnapshot.summary && (
                <p className="text-sm text-stone-200">{context.latestSnapshot.summary}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                {context.latestSnapshot.extractedBookingDate && (
                  <span>Date: {context.latestSnapshot.extractedBookingDate}</span>
                )}
                {context.latestSnapshot.extractedGuestCount != null && (
                  <span>Guests: {context.latestSnapshot.extractedGuestCount}</span>
                )}
                {context.latestSnapshot.extractedLocation && (
                  <span>Location: {context.latestSnapshot.extractedLocation}</span>
                )}
                {context.latestSnapshot.extractedEmail && (
                  <span>Email: {context.latestSnapshot.extractedEmail}</span>
                )}
                {context.latestSnapshot.extractedPhone && (
                  <span>Phone: {context.latestSnapshot.extractedPhone}</span>
                )}
                {context.latestSnapshot.extractedAmountCents != null && (
                  <span>Amount: {formatCurrency(context.latestSnapshot.extractedAmountCents)}</span>
                )}
              </div>
              {context.latestSnapshot.notes && (
                <p className="whitespace-pre-wrap text-xs text-stone-400">
                  {context.latestSnapshot.notes}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400">
              No marketplace snapshot saved yet. Use Capture current page after opening the live
              record.
            </p>
          )}
        </div>
      </div>

      {context.payout && (
        <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Marketplace payout</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-300">
            {context.payout.grossBookingCents != null && (
              <span>Gross: {formatCurrency(context.payout.grossBookingCents)}</span>
            )}
            {context.payout.commissionPercent != null && (
              <span>Commission: {context.payout.commissionPercent}%</span>
            )}
            {context.payout.netPayoutCents != null && (
              <span>Expected net: {formatCurrency(context.payout.netPayoutCents)}</span>
            )}
            <span>Status: {context.payout.payoutStatus}</span>
            {context.payout.payoutArrivalDate && (
              <span>Arrival: {context.payout.payoutArrivalDate}</span>
            )}
          </div>
          {context.payout.notes && <p className="mt-2 text-xs text-stone-400">{context.payout.notes}</p>}
        </div>
      )}

      {secondaryLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {secondaryLinks.map((link) => (
            <Button
              key={`${link.kind}-${link.href}`}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="sm"
            >
              {link.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}
