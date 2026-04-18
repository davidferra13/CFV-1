// Client Portal - Public, token-based access
// No account required. Chef shares a magic link, client sees their events + quotes + payments.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { headers } from 'next/headers'
import { getClientPortalData } from '@/lib/client-portal/actions'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { formatCurrency } from '@/lib/utils/currency'
import { EventStatusBadge } from '@/components/events/event-status-badge'

export const dynamic = 'force-dynamic'

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  // Rate limit portal token lookups: 10 per minute per IP (brute-force guard)
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  const rl = await checkRateLimit(`portal:${ip}`)
  if (!rl.success) {
    notFound()
  }

  const portal = await getClientPortalData(params.token)

  if (!portal) {
    notFound()
  }

  const { clientName, upcomingEvents, pastEvents, activeQuotes, pendingPayments, paymentHistory } =
    portal

  return (
    <div className="min-h-screen bg-stone-800">
      {/* Header */}
      <div className="bg-stone-900 border-b border-stone-700">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Client Portal</p>
          <h1 className="text-2xl font-bold text-stone-100">Hello, {clientName.split(' ')[0]}</h1>
          <p className="text-sm text-stone-500 mt-1">
            Here&apos;s everything about your upcoming dinners and events.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Action Required
            </h2>
            <div className="space-y-3">
              {pendingPayments.map((p) => (
                <div
                  key={p.eventId}
                  className="rounded-xl border border-amber-200 bg-amber-950 px-4 py-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Payment due: {formatCurrency(p.outstandingCents)}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">{p.occasion ?? 'Event'}</p>
                  </div>
                  <Link
                    href={p.paymentUrl}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                  >
                    Pay Now
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Quotes */}
        {activeQuotes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Proposals Awaiting Your Approval
            </h2>
            <div className="space-y-3">
              {activeQuotes.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-brand-700 bg-brand-950/40 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-100">
                        {q.event_occasion ?? 'Proposed Event'}
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">
                        {formatCurrency(q.amount_cents)}
                      </p>
                      {q.valid_until && (
                        <p className="text-xs text-stone-400 mt-1">
                          Expires {format(new Date(q.valid_until), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/my-quotes/${q.id}`}
                      className="shrink-0 text-xs font-medium px-3 py-1.5 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
                    >
                      Review &amp; Accept
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Your Upcoming Events
          </h2>
          {upcomingEvents.length === 0 ? (
            <div className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-8 text-center">
              <p className="text-sm text-stone-400">No upcoming events scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-100">
                        {ev.occasion ?? 'Event'}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {format(new Date(ev.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                      </p>
                      {ev.guest_count && (
                        <p className="text-xs text-stone-400">{ev.guest_count} guests</p>
                      )}
                    </div>
                    <EventStatusBadge status={ev.status as any} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Past Events
            </h2>
            <div className="space-y-2">
              {pastEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-300">{ev.occasion ?? 'Event'}</p>
                    <p className="text-xs text-stone-400">
                      {format(new Date(ev.event_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <EventStatusBadge status={ev.status as any} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Payment History
            </h2>
            <div className="space-y-2">
              {paymentHistory.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-green-600">
                      {formatCurrency(p.amountCents)}
                    </p>
                    <p className="text-xs text-stone-400">
                      {p.type.replace(/_/g, ' ')}
                      {p.eventOccasion ? ` for ${p.eventOccasion}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-stone-500">
                    {format(new Date(p.date), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-4 border-t border-stone-700 text-center">
          <p className="text-xs text-stone-400">
            This is your private client portal. Share this link only with people you trust.
          </p>
        </footer>
      </div>
    </div>
  )
}
