// Chef Event Detail Page: decomposed into server component sections

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { EventDetailMobileNav } from '@/components/events/event-detail-mobile-nav'
import { EventHeaderSection } from './_sections/event-header-section'
import { EventIntelligenceSection } from './_sections/event-intelligence-section'
import { EventSpineSection } from './_sections/event-spine-section'
import { EventScheduleSection } from './_sections/event-schedule-section'
import { EventPopUpSection } from './_sections/event-popup-section'
import { EventOverviewSection } from './_sections/event-overview-section'
import { EventMoneySection } from './_sections/event-money-section'
import { EventPrepSection } from './_sections/event-prep-section'
import { EventTicketsSection } from './_sections/event-tickets-section'
import { EventOpsSection } from './_sections/event-ops-section'
import { EventWrapSection } from './_sections/event-wrap-section'

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { tab?: string }
}) {
  const activeTab = (searchParams?.tab ?? 'overview') as string
  const user = await requireChef()
  const event = await getEventById(params.id)
  if (!event) notFound()
  const tenantId = (event as any).tenant_id ?? user.tenantId!

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <EventIntelligenceSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>
      <Suspense fallback={null}>
        <EventHeaderSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>
      <Suspense fallback={null}>
        <EventSpineSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>
      <Suspense fallback={null}>
        <EventScheduleSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>

      <EventDetailMobileNav />

      <Suspense fallback={null}>
        <EventPopUpSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={null}>
        <EventOverviewSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={null}>
        <EventMoneySection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={null}>
        <EventPrepSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={null}>
        <EventTicketsSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={null}>
        <EventOpsSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={null}>
        <EventWrapSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
    </div>
  )
}
