// Client Portal Preview - renders the client portal UI with chef-fetched data.
// All interactive elements are visually present but non-functional (preview mode).

import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PreviewClient } from '@/lib/preview/client-portal-preview-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type PreviewEvent = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  status: string
  quoted_price_cents: number | null
  location_address: string | null
  location_city: string | null
}

type PreviewQuote = {
  id: string
  quote_name: string | null
  total_quoted_cents: number | null
  status: string
  created_at: string
  inquiry: { id: string; confirmed_occasion: string | null } | null
}

type LoyaltyStatus = {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  pointsBalance: number
  totalEventsCompleted: number
  availableRewardsCount: number
  nextReward: { name: string; pointsNeeded: number } | null
}

type PortalData = {
  events: PreviewEvent[]
  quotes: PreviewQuote[]
  loyaltyStatus: LoyaltyStatus | null
  clientName: string
}

export type Props = {
  clients: PreviewClient[]
  selectedClientId: string
  portalData: PortalData | null
  isPending: boolean
  deviceFrame: 'desktop' | 'mobile'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  string,
  { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
> = {
  draft: { variant: 'default', label: 'Draft' },
  proposed: { variant: 'warning', label: 'Pending Review' },
  accepted: { variant: 'warning', label: 'Payment Due' },
  paid: { variant: 'info', label: 'Paid' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  in_progress: { variant: 'info', label: 'In Progress' },
  completed: { variant: 'default', label: 'Completed' },
  cancelled: { variant: 'error', label: 'Cancelled' },
}

const TIER_CLASS: Record<string, string> = {
  bronze: 'bg-amber-900 text-amber-800',
  silver: 'bg-stone-700 text-stone-200',
  gold: 'bg-yellow-900 text-yellow-800',
  platinum: 'bg-purple-900 text-purple-800',
}

function actionLabel(status: string, price: number | null): string {
  if (status === 'proposed') return 'View & Accept'
  if (status === 'accepted' && (price ?? 0) > 0) return 'Pay Now'
  if (['paid', 'confirmed', 'in_progress'].includes(status)) return 'View Details'
  if (status === 'completed') return 'View Receipt'
  return 'View'
}

// ─── Nav shell items (disabled in preview) ────────────────────────────────────

function PreviewNavItem({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-stone-500 cursor-not-allowed select-none opacity-75">
      <span className="flex-shrink-0 text-stone-400">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

// Simple icon SVGs (avoid importing lucide in this file to keep it server-renderable)
const icons = {
  calendar: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  file: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  chat: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  gift: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
    </svg>
  ),
  user: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  plus: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
}

// ─── Sidebar nav (desktop) ────────────────────────────────────────────────────

function ClientPortalSidebar({ clientName }: { clientName: string }) {
  return (
    <aside className="w-56 flex-shrink-0 bg-stone-900 border-r border-stone-700 flex flex-col p-3">
      <div className="px-3 py-2 mb-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide truncate">
          {clientName}
        </p>
      </div>
      {/* Book Now - primary CTA */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold cursor-not-allowed select-none mb-2">
        {icons.plus}
        Book Now
      </div>
      <div className="space-y-0.5">
        <PreviewNavItem label="My Events" icon={icons.calendar} />
        <PreviewNavItem label="My Quotes" icon={icons.file} />
        <PreviewNavItem label="Messages" icon={icons.chat} />
        <PreviewNavItem label="Rewards" icon={icons.gift} />
        <PreviewNavItem label="Profile" icon={icons.user} />
      </div>
    </aside>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

function PortalContent({ portalData }: { portalData: PortalData }) {
  const { events, quotes, loyaltyStatus } = portalData

  const upcoming = events.filter((e) =>
    ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(e.status)
  )
  const past = events.filter((e) => e.status === 'completed')
  const cancelled = events.filter((e) => e.status === 'cancelled')
  const pendingQuotes = quotes.filter((q) => q.status === 'sent')

  return (
    <div className="p-6 space-y-8 overflow-y-auto" style={{ maxHeight: '580px' }}>
      {/* Loyalty status */}
      {loyaltyStatus && (
        <Card className="border-purple-200 bg-purple-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_CLASS[loyaltyStatus.tier]}`}
              >
                {loyaltyStatus.tier.charAt(0).toUpperCase() + loyaltyStatus.tier.slice(1)} Member
              </span>
              <span className="font-bold text-purple-900">
                {loyaltyStatus.pointsBalance.toLocaleString()} pts
              </span>
              {loyaltyStatus.nextReward && (
                <span className="text-xs text-purple-700">
                  {loyaltyStatus.nextReward.pointsNeeded} pts to {loyaltyStatus.nextReward.name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Events */}
      <section>
        <h2 className="text-2xl font-bold text-stone-100 mb-4">My Events</h2>

        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((event) => {
              const loc = [event.location_address, event.location_city].filter(Boolean).join(', ')
              const status = STATUS_BADGE[event.status] ?? STATUS_BADGE.draft
              const price = event.quoted_price_cents ?? 0
              const showPrice = price > 0 && ['proposed', 'accepted'].includes(event.status)

              return (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-stone-100 mb-2">
                          {event.occasion || 'Untitled Event'}
                        </h3>
                        <div className="space-y-1 text-sm text-stone-400">
                          <div className="flex items-center gap-2">
                            {icons.calendar}
                            <span>{format(new Date(event.event_date), 'PPP')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>{event.guest_count ?? '-'} guests</span>
                          </div>
                          {loc && (
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span>{loc}</span>
                            </div>
                          )}
                        </div>
                        {showPrice && (
                          <div className="mt-4 pt-4 border-t flex justify-between items-center">
                            <span className="text-sm text-stone-400">
                              {event.status === 'accepted' ? 'Balance Due:' : 'Total Price:'}
                            </span>
                            <span className="text-lg font-bold text-stone-100">
                              {formatCurrency(price)}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Disabled action button */}
                      <div className="sm:ml-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-800 text-stone-400 cursor-not-allowed select-none">
                          {actionLabel(event.status, event.quoted_price_cents)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-stone-500 text-sm">
              No upcoming events
            </CardContent>
          </Card>
        )}

        {past.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-stone-300 mb-3">Past Events</h3>
            <div className="space-y-2">
              {past.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-stone-200">{event.occasion || 'Event'}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {format(new Date(event.event_date), 'PPP')}
                        </p>
                      </div>
                      <Badge variant="default">Completed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {cancelled.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-stone-300 mb-3">Cancelled</h3>
            <div className="space-y-2">
              {cancelled.map((event) => (
                <Card key={event.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-stone-400">{event.occasion || 'Event'}</p>
                      <Badge variant="error">Cancelled</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* My Quotes (pending only shown - same as action-needed section in client portal) */}
      {pendingQuotes.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-stone-100 mb-4">My Quotes</h2>
          <p className="text-sm text-stone-500 mb-3">Action needed</p>
          <div className="space-y-3">
            {pendingQuotes.map((quote) => {
              const occasion = quote.inquiry?.confirmed_occasion
              const name = quote.quote_name || occasion || 'Quote'
              const total = quote.total_quoted_cents ?? 0

              return (
                <Card key={quote.id} className="border-l-4 border-l-amber-400">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-100">{name}</p>
                        <p className="text-xs text-stone-500 mt-1">
                          Received {format(new Date(quote.created_at), 'PPP')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {total > 0 && (
                          <p className="text-lg font-bold text-stone-100">
                            {formatCurrency(total)}
                          </p>
                        )}
                        <Badge variant="warning">Pending Review</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-800 text-stone-400 cursor-not-allowed select-none">
                        Accept
                      </span>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-800 text-stone-400 cursor-not-allowed select-none">
                        Decline
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Empty state (no clients) ─────────────────────────────────────────────────

function NoClientsState() {
  return (
    <div className="flex min-h-[460px]">
      {/* Nav shell */}
      <aside className="w-56 flex-shrink-0 bg-stone-900 border-r border-stone-700 flex flex-col p-3">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            Client name
          </p>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-stone-700 text-stone-400 text-sm font-semibold cursor-not-allowed select-none mb-2">
          {icons.plus}
          Book Now
        </div>
        <div className="space-y-0.5">
          <PreviewNavItem label="My Events" icon={icons.calendar} />
          <PreviewNavItem label="My Quotes" icon={icons.file} />
          <PreviewNavItem label="Messages" icon={icons.chat} />
          <PreviewNavItem label="Rewards" icon={icons.gift} />
          <PreviewNavItem label="Profile" icon={icons.user} />
        </div>
      </aside>
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-stone-800">
        <div>
          <div className="text-stone-300 mb-4 flex justify-center">{icons.calendar}</div>
          <p className="font-medium text-stone-300">No clients yet</p>
          <p className="text-sm text-stone-500 mt-2 max-w-xs">
            Once you have clients with events or quotes, you can select one to preview their portal
            experience here.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export function ClientPortalPreview({
  clients,
  selectedClientId,
  portalData,
  isPending,
  deviceFrame,
}: Props) {
  const isMobile = deviceFrame === 'mobile'

  if (clients.length === 0) {
    return (
      <div className={isMobile ? 'flex justify-center' : undefined}>
        <div
          className={[
            'rounded-xl border-2 border-stone-700 overflow-hidden bg-stone-800',
            isMobile ? 'w-[390px]' : 'w-full',
          ].join(' ')}
        >
          <NoClientsState />
        </div>
      </div>
    )
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)
  const clientName = selectedClient?.full_name ?? 'Client'

  return (
    <div className={isMobile ? 'flex justify-center' : undefined}>
      <div
        className={[
          'rounded-xl border-2 border-stone-700 overflow-hidden bg-stone-900',
          isMobile ? 'w-[390px]' : 'w-full',
        ].join(' ')}
        style={{ minHeight: '460px' }}
      >
        {isPending ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-stone-400 animate-pulse">Loading preview…</p>
          </div>
        ) : portalData ? (
          <div className="flex">
            {!isMobile && <ClientPortalSidebar clientName={clientName} />}
            <div className="flex-1 min-w-0 bg-stone-800">
              {isMobile && (
                /* Mobile bottom tab bar hint */
                <div className="border-b border-stone-700 bg-stone-900 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-300">{clientName}</span>
                  <div className="flex gap-4">
                    {[icons.calendar, icons.file, icons.chat, icons.gift, icons.user].map(
                      (icon, i) => (
                        <span key={i} className="text-stone-400 cursor-not-allowed">
                          {icon}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
              <PortalContent portalData={portalData} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-stone-400">
              Select a client above to load their portal preview.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
