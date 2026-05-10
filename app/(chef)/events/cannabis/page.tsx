// Cannabis Events Hub - Entry point for cannabis dining under /events
// Replaces the old /cannabis hub as the primary cannabis entry point.
// Access gated: requirePro + hasCannabisAccess.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requirePro } from '@/lib/billing/require-pro'
import { hasCannabisAccess, getCannabisEvents } from '@/lib/chef/cannabis-actions'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { CannabisEventCard } from '@/components/cannabis/cannabis-event-card'

export default async function EventsCannabisPage() {
  const user = await requirePro('cannabis-portal')
  const hasAccess = await hasCannabisAccess(user.id)

  if (!hasAccess) {
    redirect('/events')
  }

  const events = await getCannabisEvents()
  const eventCount = events.length
  const upcoming = events.filter((e: any) => !['completed', 'cancelled'].includes(e.status ?? ''))
  const past = events.filter((e: any) => ['completed', 'cancelled'].includes(e.status ?? ''))

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Dining"
          subtitle={`${eventCount} total events, ${upcoming.length} active`}
          backHref="/events"
          backLabel="All Events"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/events/cannabis/ledger"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={{
                  background: 'rgba(45, 122, 90, 0.25)',
                  color: '#d2e8d4',
                  border: '1px solid rgba(106, 170, 110, 0.35)',
                }}
              >
                Ledger
              </Link>
              <Link
                href="/events/new?cannabis=true"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={{
                  background: 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)',
                  color: '#e8f5e9',
                  boxShadow: '0 0 12px rgba(74, 124, 78, 0.3)',
                }}
              >
                + New Cannabis Event
              </Link>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <SummaryCard label="Total Events" value={eventCount} />
          <SummaryCard label="Active" value={upcoming.length} />
          <SummaryCard
            label="Completed"
            value={past.filter((e: any) => e.status === 'completed').length}
          />
          <SummaryCard
            label="Cancelled"
            value={past.filter((e: any) => e.status === 'cancelled').length}
          />
        </div>

        {events.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: '#0f1a0f',
              border: '1px solid rgba(74, 124, 78, 0.15)',
            }}
          >
            <div className="text-3xl mb-3">🌿</div>
            <p className="text-sm" style={{ color: '#6aaa6e' }}>
              No cannabis events yet. When you create an event with cannabis preference enabled, it
              will appear here.
            </p>
            <Link
              href="/events/new?cannabis=true"
              className="inline-block mt-4 text-xs underline"
              style={{ color: '#4a7c4e' }}
            >
              Create your first cannabis event
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-8">
                <h2
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: '#4a7c4e' }}
                >
                  Active
                </h2>
                <div className="space-y-3">
                  {upcoming.map((event: any) => (
                    <CannabisEventCard
                      key={event.id}
                      event={event}
                      cannabisDetails={event.cannabis_details}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: '#4a7c4e' }}
                >
                  Past
                </h2>
                <div className="space-y-3">
                  {past.map((event: any) => (
                    <CannabisEventCard
                      key={event.id}
                      event={event}
                      cannabisDetails={event.cannabis_details}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Portal info */}
        <div
          className="rounded-xl p-5 mt-8"
          style={{
            background: 'linear-gradient(135deg, #0a130a 0%, #0f1a0f 100%)',
            border: '1px solid rgba(74, 124, 78, 0.15)',
          }}
        >
          <p
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: '#4a7c4e' }}
          >
            Cannabis Portal
          </p>
          <ul className="space-y-2">
            {[
              'Cannabis events are tracked separately from your regular dining calendar.',
              'The ledger captures all cannabis event revenue and expenses in one place.',
              'Control packets lock seating, dosing, reconciliation, and finalization evidence.',
              'Events appear here automatically when created with cannabis preference enabled.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#6aaa6e' }}>
                <span className="mt-0.5 shrink-0" style={{ color: '#4a7c4e' }}>
                  -
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CannabisPageWrapper>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: '#0f1a0f',
        border: '1px solid rgba(74, 124, 78, 0.15)',
      }}
    >
      <p className="text-xs mb-1" style={{ color: '#4a7c4e' }}>
        {label}
      </p>
      <p className="text-lg font-semibold" style={{ color: '#8bc34a' }}>
        {value}
      </p>
    </div>
  )
}
