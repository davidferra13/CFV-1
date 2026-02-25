import Link from 'next/link'
import {
  CannabisPageWrapper,
  CannabisPortalHeader,
} from '@/components/cannabis/cannabis-portal-header'
import { getCannabisControlPacketData } from '@/lib/chef/cannabis-control-packet-actions'
import { ControlPacketClient } from './control-packet-client'

export default async function CannabisEventControlPacketPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { snapshot?: string }
}) {
  const data = await getCannabisControlPacketData(params.id, searchParams?.snapshot ?? null)

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <CannabisPortalHeader
          title="Seating & Dose Control Packet"
          subtitle={`${data.event.hostName} · ${new Date(data.event.date).toLocaleDateString('en-US')}`}
          backHref="/cannabis/events"
          backLabel="Cannabis Events"
          actions={
            <>
              <Link
                href={`/events/${params.id}`}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={{
                  background: 'rgba(74, 124, 78, 0.2)',
                  color: '#d2e8d4',
                  border: '1px solid rgba(106, 170, 110, 0.35)',
                }}
              >
                Open Event
              </Link>
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
            </>
          }
        />

        <ControlPacketClient eventId={params.id} initialData={data} />
      </div>
    </CannabisPageWrapper>
  )
}
