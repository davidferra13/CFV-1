import Link from 'next/link'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { getCannabisEvents } from '@/lib/chef/cannabis-actions'

export default async function CannabisCompliancePage() {
  const events = await getCannabisEvents()
  const activeEvents = events.filter(
    (event: any) => !['completed', 'cancelled'].includes(event.status)
  )

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <CannabisPortalHeader
          title="Compliance & Dosing Control"
          subtitle="Locked control packets, reconciliation, evidence, and archival persistence"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
          actions={
            <Link
              href="/cannabis/control-packet/template"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
              style={{
                background: 'rgba(45, 122, 90, 0.25)',
                color: '#d2e8d4',
                border: '1px solid rgba(106, 170, 110, 0.35)',
              }}
            >
              Blank Template
            </Link>
          }
        />

        <div
          className="rounded-xl p-4 mb-5"
          style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
        >
          <p className="text-sm text-[#d2e8d4] mb-2">
            Control packets are now the required execution backbone for cannabis service.
          </p>
          <ul className="text-xs text-[#8ebf92] space-y-1">
            <li>Snapshot versioning freezes guests, seating, participation, and course count.</li>
            <li>Paper sheet execution is mirrored digitally through structured reconciliation.</li>
            <li>At least one photo evidence upload is required before finalization.</li>
            <li>Finalization hard-locks edits and preserves immutable archival records.</li>
          </ul>
        </div>

        <div className="space-y-3">
          {activeEvents.length === 0 ? (
            <div
              className="rounded-xl p-6 text-sm text-[#8ebf92]"
              style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
            >
              <p>
                No active cannabis events found. Open a cannabis event first to generate its control
                packet.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/cannabis/events"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  style={{
                    background: 'rgba(45, 122, 90, 0.25)',
                    color: '#d2e8d4',
                    border: '1px solid rgba(106, 170, 110, 0.35)',
                  }}
                >
                  View cannabis events
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
                  Create cannabis event
                </Link>
              </div>
            </div>
          ) : (
            activeEvents.map((event: any) => (
              <Link
                key={event.id}
                href={`/cannabis/events/${event.id}/control-packet`}
                className="block rounded-xl p-4 transition-colors"
                style={{ background: '#0f1a0f', border: '1px solid #27432b' }}
              >
                <p className="text-sm font-semibold text-[#d2e8d4]">
                  {(event as any).clients?.full_name || 'Host'} -{' '}
                  {event.occasion || 'Cannabis Event'}
                </p>
                <p className="text-xs text-[#8ebf92]">
                  {new Date(event.event_date).toLocaleDateString('en-US')} - Open control packet
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </CannabisPageWrapper>
  )
}
