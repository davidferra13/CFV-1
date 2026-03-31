import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Clock3,
  FileText,
  HandCoins,
  Scale,
} from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { getTakeAChefCommandCenter } from '@/lib/gmail/take-a-chef-command-center'
import { getMarketplaceCommandCenter } from '@/lib/marketplace/command-center-actions'
import { getMarketplaceROI } from '@/lib/marketplace/roi-actions'
import { getMarketplaceScorecard } from '@/lib/marketplace/scorecard-actions'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = {
  title: 'Marketplace Command Center',
}

function formatLeadAge(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h old`
  return `${Math.floor(hours / 24)}d old`
}

function formatEventDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMoney(cents: number | null): string {
  return cents != null ? formatCurrency(cents) : '-'
}

function leadBadgeVariant(status: 'new' | 'awaiting_chef'): 'warning' | 'info' {
  return status === 'new' ? 'warning' : 'info'
}

function bookingStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'confirmed' || status === 'completed') return 'success'
  if (status === 'cancelled') return 'error'
  if (status === 'draft' || status === 'tentative') return 'warning'
  return 'default'
}

function payoutStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'paid') return 'success'
  if (status === 'issue') return 'error'
  if (status === 'scheduled') return 'info'
  if (status === 'pending') return 'warning'
  return 'default'
}

function commissionVariant(state: string): 'default' | 'success' | 'warning' | 'error' {
  if (state === 'matched') return 'success'
  if (state === 'missing') return 'warning'
  if (state === 'mismatch') return 'error'
  return 'default'
}

function formatCapturedAt(value: string | null): string {
  if (!value) return 'Captured recently'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function MarketplacePage() {
  const [data, allPlatforms, roi, scorecard] = await Promise.all([
    getTakeAChefCommandCenter(),
    getMarketplaceCommandCenter(),
    getMarketplaceROI(),
    getMarketplaceScorecard(),
  ])
  const isEmpty =
    data.leads.length === 0 &&
    data.proposalFollowUps.length === 0 &&
    data.menuFollowUps.length === 0 &&
    data.upcomingBookings.length === 0 &&
    data.payoutWatchlist.length === 0 &&
    data.summary.untouchedLeadCount === 0 &&
    data.summary.awaitingChefCount === 0 &&
    allPlatforms.leads.length === 0 &&
    allPlatforms.upcomingBookings.length === 0

  // Non-TAC leads (Yhangry, Cozymeal, Bark, etc.)
  const otherPlatformLeads = allPlatforms.leads.filter((l) => l.channel !== 'take_a_chef')
  const otherPlatformBookings = allPlatforms.upcomingBookings.filter(
    (b) => b.channel !== 'take_a_chef'
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/dashboard" className="transition-colors hover:text-stone-300">
            Dashboard
          </Link>
          <span className="text-stone-600">/</span>
          <span className="text-stone-300">Marketplace</span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Marketplace Command Center</h1>
            <p className="mt-1 max-w-3xl text-sm text-stone-400">
              All your marketplace leads in one place: Take a Chef, Yhangry, Cozymeal, Bark,
              Thumbtack, and more. Capture, convert, keep the client.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/inquiries?channel=take_a_chef"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
            >
              All TAC inquiries
            </Link>
            <Link
              href="/settings/integrations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
            >
              Integration settings
            </Link>
            <Link
              href="/marketplace/capture"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Capture live page
            </Link>
          </div>
        </div>
      </div>

      {/* Marketplace ROI - Commission Savings */}
      {(roi.directRebookingCount > 0 || roi.totalMarketplaceClients > 0) && (
        <Card>
          <CardContent className="py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-stone-400">Direct Rebooking Savings</p>
                <p className="mt-1 text-3xl font-bold text-emerald-400">
                  {formatCurrency(roi.estimatedCommissionSavedCents)}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  estimated commission saved across {roi.directRebookingCount} direct rebooking
                  {roi.directRebookingCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-stone-100">{roi.totalMarketplaceClients}</p>
                  <p className="text-xs text-stone-500">marketplace clients</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-100">{roi.clientsWhoRebooked}</p>
                  <p className="text-xs text-stone-500">converted to direct</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-100">
                    {formatCurrency(roi.directRebookingRevenueCents)}
                  </p>
                  <p className="text-xs text-stone-500">direct rebooking revenue</p>
                </div>
              </div>
            </div>
            {roi.platformBreakdown.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 border-t border-stone-800 pt-3">
                {roi.platformBreakdown.map((p) => (
                  <div key={p.channel} className="text-xs text-stone-400">
                    <span className="font-medium text-stone-300">{p.label}:</span> {p.firstBookings}{' '}
                    clients, {p.directRebookings} direct rebookings
                    {p.estimatedSavedCents > 0 && (
                      <span className="text-emerald-400">
                        {' '}
                        ({formatCurrency(p.estimatedSavedCents)} saved)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Marketplace Scorecard */}
      {scorecard.totalInquiries > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marketplace Scorecard</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              How fast you respond, how often you convert, and where the money comes from.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg bg-stone-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">Response Time</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {scorecard.medianResponseHours != null
                    ? scorecard.medianResponseHours < 1
                      ? `${Math.round(scorecard.medianResponseHours * 60)}m`
                      : `${scorecard.medianResponseHours}h`
                    : 'N/A'}
                </p>
                <p className="text-xs text-stone-500">median</p>
              </div>
              <div className="rounded-lg bg-stone-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">Within 24h</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {scorecard.respondedWithin24hPercent != null
                    ? `${scorecard.respondedWithin24hPercent}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-stone-500">of responses</p>
              </div>
              <div className="rounded-lg bg-stone-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">Proposal Rate</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {scorecard.proposalSentPercent != null
                    ? `${scorecard.proposalSentPercent}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-stone-500">
                  {scorecard.proposalSentCount} of {scorecard.totalInquiries}
                </p>
              </div>
              <div className="rounded-lg bg-stone-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">Conversion</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {scorecard.conversionPercent != null ? `${scorecard.conversionPercent}%` : 'N/A'}
                </p>
                <p className="text-xs text-stone-500">
                  {scorecard.bookedCount} booked of {scorecard.totalInquiries}
                </p>
              </div>
              <div className="rounded-lg bg-stone-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">Gross Booked</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {formatCurrency(scorecard.grossBookedCents)}
                </p>
                <p className="text-xs text-stone-500">
                  avg{' '}
                  {scorecard.avgBookingCents != null
                    ? formatCurrency(scorecard.avgBookingCents)
                    : '-'}{' '}
                  / booking
                </p>
              </div>
              <div className="rounded-lg bg-stone-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">Est. Commission</p>
                <p className="mt-1 text-xl font-bold text-amber-400">
                  {formatCurrency(scorecard.estimatedCommissionCents)}
                </p>
                <p className="text-xs text-stone-500">paid to platforms</p>
              </div>
            </div>

            {/* Direct conversion metric */}
            {scorecard.totalMarketplaceClients > 0 && (
              <div className="mt-4 flex items-center gap-4 rounded-lg border border-stone-800 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-300">Direct Conversion Rate</p>
                  <p className="text-xs text-stone-500">
                    {scorecard.directConvertedClients} of {scorecard.totalMarketplaceClients}{' '}
                    marketplace clients rebooked direct (no commission)
                  </p>
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {scorecard.directConversionPercent != null
                    ? `${scorecard.directConversionPercent}%`
                    : '0%'}
                </p>
              </div>
            )}

            {/* Per-platform breakdown */}
            {scorecard.platformScores.length > 1 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-800 text-left text-xs uppercase tracking-wide text-stone-500">
                      <th className="pb-2 pr-4">Platform</th>
                      <th className="pb-2 pr-4 text-right">Inquiries</th>
                      <th className="pb-2 pr-4 text-right">Booked</th>
                      <th className="pb-2 pr-4 text-right">Conv %</th>
                      <th className="pb-2 pr-4 text-right">Response</th>
                      <th className="pb-2 text-right">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.platformScores.map((p) => (
                      <tr key={p.channel} className="border-b border-stone-800/50">
                        <td className="py-2 pr-4 font-medium text-stone-200">{p.label}</td>
                        <td className="py-2 pr-4 text-right text-stone-300">{p.inquiries}</td>
                        <td className="py-2 pr-4 text-right text-stone-300">{p.booked}</td>
                        <td className="py-2 pr-4 text-right text-stone-300">
                          {p.conversionPercent != null ? `${p.conversionPercent}%` : '-'}
                        </td>
                        <td className="py-2 pr-4 text-right text-stone-300">
                          {p.medianResponseHours != null
                            ? p.medianResponseHours < 1
                              ? `${Math.round(p.medianResponseHours * 60)}m`
                              : `${p.medianResponseHours}h`
                            : '-'}
                        </td>
                        <td className="py-2 text-right text-stone-300">
                          {formatCurrency(p.grossBookedCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-base font-medium text-stone-200">No marketplace activity yet.</p>
            <p className="mt-2 text-sm text-stone-400">
              Connect Gmail and let ChefFlow pull in Take a Chef requests, then this page becomes
              the fastest way to run that channel.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/settings/integrations"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Connect Gmail
              </Link>
              <Link
                href="/import"
                className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
              >
                Import past activity
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Untouched Leads"
              value={data.summary.untouchedLeadCount}
              icon={ClipboardList}
              subtitle="Brand-new requests with no action yet"
            />
            <StatCard
              label="Your Reply"
              value={data.summary.awaitingChefCount}
              icon={Clock3}
              subtitle="Requests waiting on your response"
            />
            <StatCard
              label="Stale Leads"
              value={data.summary.staleLeadCount}
              icon={AlertTriangle}
              subtitle="New requests older than 24 hours"
            />
            <StatCard
              label="Proposal Follow-Up"
              value={data.summary.proposalFollowUpCount}
              icon={FileText}
              subtitle="Quoted requests still waiting on a decision"
            />
            <StatCard
              label="Menu Follow-Up"
              value={data.summary.menuFollowUpCount}
              icon={ChefHat}
              subtitle="Captured menus that still need to be reflected in ChefFlow"
            />
            <StatCard
              label="Upcoming TAC Bookings"
              value={data.summary.upcomingBookingCount}
              icon={CalendarDays}
              subtitle="Linked events still on the books"
            />
            <StatCard
              label="Payout Watch"
              value={data.summary.payoutWatchCount}
              icon={HandCoins}
              subtitle="Pending or problematic payout records"
            />
            <StatCard
              label="Commission Mismatches"
              value={data.summary.commissionMismatchCount}
              icon={Scale}
              subtitle="Events where expected and logged fees disagree"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Lead Action Queue</CardTitle>
                  <p className="mt-1 text-sm text-stone-400">
                    Work the requests most likely to slip if you do nothing.
                  </p>
                </div>
                <Badge variant={data.summary.staleLeadCount > 0 ? 'error' : 'default'}>
                  {data.leads.length} open
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.leads.length === 0 ? (
                  <p className="text-sm text-stone-500">No open marketplace leads right now.</p>
                ) : (
                  data.leads.map((lead) => (
                    <div
                      key={lead.inquiryId}
                      className="rounded-xl border border-stone-800 bg-stone-900/70 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-stone-100">
                              {lead.clientName}
                            </p>
                            <Badge variant={leadBadgeVariant(lead.status)}>
                              {lead.status === 'new' ? 'New' : 'Awaiting chef'}
                            </Badge>
                            {lead.isStale && <Badge variant="error">Stale</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-400">
                            <span>{formatLeadAge(lead.ageHours)}</span>
                            {lead.date && <span>{formatEventDate(lead.date)}</span>}
                            {lead.guestCount != null && <span>{lead.guestCount} guests</span>}
                            {lead.location && <span>{lead.location}</span>}
                            {lead.occasion && <span>{lead.occasion}</span>}
                          </div>
                          {lead.nextActionRequired && (
                            <p className="text-sm text-amber-300">
                              Next action: {lead.nextActionRequired}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/inquiries/${lead.inquiryId}`}
                            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                          >
                            Open inquiry
                          </Link>
                          {lead.externalLink && (
                            <a
                              href={lead.externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                            >
                              Open TAC
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Upcoming Bookings</CardTitle>
                  <p className="mt-1 text-sm text-stone-400">
                    Confirm upcoming service dates and expected TAC payout.
                  </p>
                </div>
                <Badge variant="default">{data.upcomingBookings.length} upcoming</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.upcomingBookings.length === 0 ? (
                  <p className="text-sm text-stone-500">No linked upcoming TAC bookings.</p>
                ) : (
                  data.upcomingBookings.map((booking) => (
                    <div
                      key={booking.eventId}
                      className="rounded-xl border border-stone-800 bg-stone-900/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-100">{booking.clientName}</p>
                          <p className="mt-1 text-sm text-stone-400">
                            {formatEventDate(booking.eventDate)}
                            {booking.occasion ? ` • ${booking.occasion}` : ''}
                          </p>
                        </div>
                        <Badge variant={bookingStatusVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-stone-950/60 p-3">
                          <p className="text-xs uppercase tracking-wide text-stone-500">Gross</p>
                          <p className="mt-1 font-semibold text-stone-100">
                            {formatMoney(booking.grossBookingCents)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-stone-950/60 p-3">
                          <p className="text-xs uppercase tracking-wide text-stone-500">
                            Net payout
                          </p>
                          <p className="mt-1 font-semibold text-stone-100">
                            {formatMoney(booking.expectedNetPayoutCents)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={payoutStatusVariant(booking.payoutStatus)}>
                          Payout {booking.payoutStatus}
                        </Badge>
                        <Badge variant={commissionVariant(booking.commissionState)}>
                          Commission {booking.commissionState}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/events/${booking.eventId}`}
                          className="text-sm font-medium text-brand-500 hover:text-brand-400"
                        >
                          Open event
                        </Link>
                        {booking.externalLink && (
                          <a
                            href={booking.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-brand-500 hover:text-brand-400"
                          >
                            Open TAC
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Proposal Follow-Up</CardTitle>
                  <p className="mt-1 text-sm text-stone-400">
                    Captured proposal pages that now need client follow-up or price review.
                  </p>
                </div>
                <Badge variant={data.summary.proposalFollowUpCount > 0 ? 'warning' : 'default'}>
                  {data.proposalFollowUps.length} queued
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.proposalFollowUps.length === 0 ? (
                  <p className="text-sm text-stone-500">No captured proposals need attention.</p>
                ) : (
                  data.proposalFollowUps.map((item) => (
                    <div
                      key={`${item.inquiryId}-proposal`}
                      className="rounded-xl border border-stone-800 bg-stone-900/70 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-stone-100">{item.clientName}</p>
                            <Badge variant="warning">Quoted</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-400">
                            <span>{formatCapturedAt(item.capturedAt)}</span>
                            {item.eventDate && <span>{formatEventDate(item.eventDate)}</span>}
                            {item.amountCents != null && (
                              <span>{formatMoney(item.amountCents)}</span>
                            )}
                          </div>
                          {item.nextActionRequired && (
                            <p className="text-sm text-amber-300">
                              Next action: {item.nextActionRequired}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/inquiries/${item.inquiryId}`}
                            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                          >
                            Open inquiry
                          </Link>
                          {item.externalLink && (
                            <a
                              href={item.externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                            >
                              Open TAC
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Menu Follow-Up</CardTitle>
                  <p className="mt-1 text-sm text-stone-400">
                    Menu pages captured from the marketplace that still need to be reflected in the
                    ChefFlow plan.
                  </p>
                </div>
                <Badge variant={data.summary.menuFollowUpCount > 0 ? 'info' : 'default'}>
                  {data.menuFollowUps.length} queued
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.menuFollowUps.length === 0 ? (
                  <p className="text-sm text-stone-500">No captured menus need review.</p>
                ) : (
                  data.menuFollowUps.map((item) => (
                    <div
                      key={`${item.inquiryId}-menu`}
                      className="rounded-xl border border-stone-800 bg-stone-900/70 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-stone-100">{item.clientName}</p>
                            <Badge variant="info">Menu captured</Badge>
                            {item.status === 'confirmed' && (
                              <Badge variant="success">Confirmed</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-400">
                            <span>{formatCapturedAt(item.capturedAt)}</span>
                            {item.eventDate && <span>{formatEventDate(item.eventDate)}</span>}
                            {item.amountCents != null && (
                              <span>{formatMoney(item.amountCents)}</span>
                            )}
                          </div>
                          {item.nextActionRequired && (
                            <p className="text-sm text-brand-300">
                              Next action: {item.nextActionRequired}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.eventId ? (
                            <Link
                              href={`/events/${item.eventId}`}
                              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                            >
                              Open event
                            </Link>
                          ) : (
                            <Link
                              href={`/inquiries/${item.inquiryId}`}
                              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                            >
                              Open inquiry
                            </Link>
                          )}
                          {item.externalLink && (
                            <a
                              href={item.externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                            >
                              Open TAC
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Payout Watchlist</CardTitle>
                <p className="mt-1 text-sm text-stone-400">
                  Bookings with missing payouts, missing fees, or commission mismatches.
                </p>
              </div>
              <Badge variant={data.summary.payoutWatchCount > 0 ? 'warning' : 'default'}>
                {data.payoutWatchlist.length} flagged
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.payoutWatchlist.length === 0 ? (
                <p className="text-sm text-stone-500">No payout issues currently flagged.</p>
              ) : (
                data.payoutWatchlist.map((booking) => (
                  <div
                    key={`${booking.eventId}-watch`}
                    className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900/70 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-stone-100">{booking.clientName}</p>
                        <Badge variant={payoutStatusVariant(booking.payoutStatus)}>
                          {booking.payoutStatus}
                        </Badge>
                        <Badge variant={commissionVariant(booking.commissionState)}>
                          {booking.commissionState}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-stone-400">
                        {formatEventDate(booking.eventDate)}
                        {booking.occasion ? ` • ${booking.occasion}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-400">
                        <span>Gross {formatMoney(booking.grossBookingCents)}</span>
                        <span>Expected net {formatMoney(booking.expectedNetPayoutCents)}</span>
                        <span>Recorded payout {formatMoney(booking.payoutAmountCents)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/events/${booking.eventId}`}
                        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                      >
                        Fix in event
                      </Link>
                      {booking.externalLink && (
                        <a
                          href={booking.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                        >
                          Open TAC
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Other Marketplace Platforms (Yhangry, Cozymeal, Bark, etc.) */}
      {(otherPlatformLeads.length > 0 || otherPlatformBookings.length > 0) && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-800" />
            <span className="text-sm font-medium text-stone-400">Other Platforms</span>
            <div className="h-px flex-1 bg-stone-800" />
          </div>

          {/* Platform breakdown badges */}
          {allPlatforms.summary.platformBreakdown.filter((p) => p.channel !== 'take_a_chef')
            .length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allPlatforms.summary.platformBreakdown
                .filter((p) => p.channel !== 'take_a_chef')
                .map((p) => (
                  <Badge key={p.channel} variant="default">
                    {p.label}: {p.count} active
                  </Badge>
                ))}
            </div>
          )}

          {/* Other platform leads */}
          {otherPlatformLeads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Marketplace Leads</CardTitle>
                <p className="mt-1 text-sm text-stone-400">
                  Open leads from Yhangry, Cozymeal, Bark, Thumbtack, and other platforms.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherPlatformLeads.map((lead) => (
                  <div
                    key={lead.inquiryId}
                    className="rounded-xl border border-stone-800 bg-stone-900/70 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-stone-100">
                            {lead.clientName}
                          </p>
                          <Badge variant="info">{lead.platformLabel}</Badge>
                          <Badge variant={lead.status === 'new' ? 'warning' : 'default'}>
                            {lead.status === 'new' ? 'New' : 'Awaiting chef'}
                          </Badge>
                          {lead.isStale && <Badge variant="error">Stale</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-400">
                          <span>
                            {lead.ageHours < 24
                              ? `${lead.ageHours}h old`
                              : `${Math.floor(lead.ageHours / 24)}d old`}
                          </span>
                          {lead.date && (
                            <span>
                              {new Date(`${lead.date}T12:00:00`).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {lead.guestCount != null && <span>{lead.guestCount} guests</span>}
                          {lead.location && <span>{lead.location}</span>}
                        </div>
                      </div>
                      <Link
                        href={`/inquiries/${lead.inquiryId}`}
                        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                      >
                        Open inquiry
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Other platform upcoming bookings */}
          {otherPlatformBookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming Marketplace Bookings</CardTitle>
                <p className="mt-1 text-sm text-stone-400">
                  Events from other marketplace platforms.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherPlatformBookings.map((booking) => (
                  <div
                    key={booking.eventId}
                    className="rounded-xl border border-stone-800 bg-stone-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-stone-100">{booking.clientName}</p>
                          <Badge variant="info">{booking.platformLabel}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-stone-400">
                          {new Date(`${booking.eventDate}T12:00:00`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {booking.occasion ? ` - ${booking.occasion}` : ''}
                        </p>
                        {booking.quotedPriceCents != null && (
                          <p className="mt-1 text-sm text-stone-300">
                            {formatCurrency(booking.quotedPriceCents)}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/events/${booking.eventId}`}
                        className="text-sm font-medium text-brand-500 hover:text-brand-400"
                      >
                        Open event
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
