// Chef Event Detail Page: decomposed into server component sections

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SkeletonCard } from '@/components/ui/skeleton'
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
import { EventBeverageSection } from './_sections/event-beverage-section'
import { getCompletionForEntity } from '@/lib/completion/actions'
import { buildEventSuggestions } from '@/lib/suggestions/event-suggestions'
import { ContextualNextAction } from '@/components/suggestions/contextual-next-action'

async function EventSuggestionsSection({ eventId, event }: { eventId: string; event: any }) {
  const completion = await getCompletionForEntity('event', eventId).catch(() => null)
  const suggestions = buildEventSuggestions(
    eventId,
    {
      status: event.status,
      menu_id: event.menu_id ?? null,
      event_date: event.event_date ?? null,
    },
    completion
  )
  return <ContextualNextAction suggestions={suggestions} />
}

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
      <Suspense fallback={<SkeletonCard />}>
        <EventIntelligenceSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventHeaderSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>
      <Suspense fallback={null}>
        <EventSuggestionsSection eventId={params.id} event={event} />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventSpineSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventScheduleSection eventId={params.id} tenantId={tenantId} event={event} />
      </Suspense>

      <EventDetailMobileNav />

      <Suspense fallback={<SkeletonCard />}>
        <EventPopUpSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventOverviewSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventBeverageSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventMoneySection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventPrepSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventTicketsSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventOpsSection
          eventId={params.id}
          tenantId={tenantId}
          event={event}
          activeTab={activeTab}
        />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
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
