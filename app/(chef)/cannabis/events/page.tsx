// Cannabis Events - Chef Portal
// All events where cannabis_preference = true, with their details.

import { getCannabisEvents } from '@/lib/chef/cannabis-actions'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { CannabisEventCard } from '@/components/cannabis/cannabis-event-card'
import Link from 'next/link'

export default async function CannabisEventsPage() {
  const events = await getCannabisEvents()

  const upcoming = events.filter((e: any) => !['completed', 'cancelled'].includes(e.status ?? ''))
  const past = events.filter((e: any) => ['completed', 'cancelled'].includes(e.status ?? ''))

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Events"
          subtitle={`${events.length} total · ${upcoming.length} active`}
          backHref="/cannabis"
          backLabel="Cannabis Hub"
          actions={
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
          }
        />

        <p className="text-xs mb-6 -mt-3" style={{ color: '#4a7c4e' }}>
          Events appear here automatically when created with cannabis preference enabled.
        </p>

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
              Create your first cannabis event →
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
      </div>
    </CannabisPageWrapper>
  )
}
