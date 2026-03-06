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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { getTakeAChefCommandCenter } from '@/lib/gmail/take-a-chef-command-center'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = {
  title: 'Marketplace Command Center - ChefFlow',
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
  const data = await getTakeAChefCommandCenter()
  const isEmpty =
    data.leads.length === 0 &&
    data.proposalFollowUps.length === 0 &&
    data.menuFollowUps.length === 0 &&
    data.upcomingBookings.length === 0 &&
    data.payoutWatchlist.length === 0 &&
    data.summary.untouchedLeadCount === 0 &&
    data.summary.awaitingChefCount === 0

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
              One operating surface for Take a Chef demand: new leads, upcoming bookings, and payout
              problems that still need attention.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-400"
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
              label="Awaiting Chef"
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
                              rel="noreferrer"
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
                            rel="noreferrer"
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
                              rel="noreferrer"
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
                              rel="noreferrer"
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
                          rel="noreferrer"
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
    </div>
  )
}
