// Cannabis Portal — Client View
// Visible only to clients who have been granted cannabis tier access.

import { requireClient } from '@/lib/auth/get-user'
import {
  clientHasCannabisAccess,
  getClientCannabisEvents,
} from '@/lib/clients/cannabis-client-actions'
import { redirect } from 'next/navigation'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { CannabisEventCard } from '@/components/cannabis/cannabis-event-card'

export default async function ClientCannabisPage() {
  const user = await requireClient()
  const hasAccess = await clientHasCannabisAccess(user.id)
  if (!hasAccess) redirect('/my-events')

  const events = await getClientCannabisEvents().catch(() => [])
  const upcoming = events.filter((e: any) => !['completed', 'cancelled'].includes(e.status ?? ''))
  const past = events.filter((e: any) => ['completed', 'cancelled'].includes(e.status ?? ''))

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Dining"
          subtitle="Your private cannabis dining experiences"
        />

        {/* Welcome panel */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: '#0f1a0f',
            border: '1px solid rgba(74, 124, 78, 0.15)',
          }}
        >
          <div className="text-2xl mb-2">🌿</div>
          <p className="text-sm" style={{ color: '#6aaa6e' }}>
            You have access to cannabis dining experiences. Your events with cannabis-infused menus
            and experiences are listed here, separate from your regular dining history.
          </p>
        </div>

        {events.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: '#0f1a0f',
              border: '1px solid rgba(74, 124, 78, 0.12)',
            }}
          >
            <div className="text-3xl mb-3">🍃</div>
            <p className="text-sm" style={{ color: '#6aaa6e' }}>
              No cannabis dining events yet. When your chef creates an event for you with cannabis
              options, it will appear here.
            </p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-6">
                <h2
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: '#4a7c4e' }}
                >
                  Upcoming
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
                  Past Experiences
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
