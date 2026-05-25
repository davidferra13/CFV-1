// Chef Event Detail Page: lifecycle-aware section organization
// Sections grouped by lifecycle stage with progressive disclosure on desktop.
// Mobile retains tab nav; desktop uses collapsible lifecycle panels.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SkeletonCard } from '@/components/ui/skeleton'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { EventDetailMobileNav } from '@/components/events/event-detail-mobile-nav'
import { LifecycleWorkspacePanel } from '@/components/events/lifecycle-workspace-panel'
import { getLifecycleWorkspaceStage } from '@/lib/lifecycle/event-lifecycle-stage'
import type { EventStatus } from '@/lib/events/fsm'
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
import { EventDiscoverySection } from './_sections/event-discovery-section'
import { EventDepartureSection } from './_sections/event-departure-section'
import { EventExitLinksSection } from './_sections/event-exit-links-section'
import { getServiceTrackerState } from '@/lib/lifecycle/service-tracker-actions'
import { LinkedTodosServer } from '@/components/todos/linked-todos-server'
import { getServiceTimeline } from '@/lib/lifecycle/timeline-generator-actions'
import { DayOfServicePanel } from '@/components/events/day-of-service-panel'
import { getCompletionForEntity } from '@/lib/completion/actions'
import { buildEventSuggestions } from '@/lib/suggestions/event-suggestions'
import { ContextualNextAction } from '@/components/suggestions/contextual-next-action'
import { VendorCoordinationLog } from '@/components/events/vendor-coordination-log'
import { QuickCaptureTrigger } from '@/components/communication/quick-capture-trigger'

async function DayOfServiceSection({ eventId }: { eventId: string }) {
  const [trackerState, timeline] = await Promise.all([
    getServiceTrackerState(eventId).catch(() => null),
    getServiceTimeline(eventId).catch(() => null),
  ])
  return <DayOfServicePanel eventId={eventId} trackerState={trackerState} timeline={timeline} />
}

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

export async function generateMetadata() {
  return { title: 'Event Details | ChefFlow' }
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
  const lifecycleStage = getLifecycleWorkspaceStage(event.status as EventStatus)

  // Shared section props
  const sectionProps = { eventId: params.id, tenantId, event }
  const tabSectionProps = { ...sectionProps, activeTab }

  return (
    <div className="space-y-6">
      {/* Always-visible: intelligence, header, suggestions, spine (stage-independent) */}
      <Suspense fallback={<SkeletonCard />}>
        <EventIntelligenceSection {...sectionProps} />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventHeaderSection {...sectionProps} />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventSuggestionsSection eventId={params.id} event={event} />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventSpineSection {...sectionProps} />
      </Suspense>
      <Suspense fallback={null}>
        <LinkedTodosServer eventId={params.id} />
      </Suspense>
      <Suspense fallback={<SkeletonCard />}>
        <EventScheduleSection {...sectionProps} />
      </Suspense>

      {/* Vendor Coordination Log + Quick Capture */}
      <VendorCoordinationLog eventId={params.id} />
      <QuickCaptureTrigger prefillEventId={params.id} />

      {/* Exit Links: venue, weather, nearby, calendar, payment, contact, travel */}
      <EventExitLinksSection
        event={event as Record<string, unknown>}
        client={(event as any).client ?? null}
        user={user as Record<string, unknown>}
      />

      {/* Mobile: tab nav with lifecycle stage dots */}
      <EventDetailMobileNav lifecycleStage={lifecycleStage} />

      {/* Mobile: tab-gated sections (hidden on md+, replaced by lifecycle panels) */}
      <div className="md:hidden space-y-6">
        <Suspense fallback={<SkeletonCard />}>
          <EventPopUpSection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventOverviewSection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventBeverageSection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventDiscoverySection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventMoneySection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventPrepSection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventTicketsSection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventOpsSection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventDepartureSection {...tabSectionProps} />
        </Suspense>
        <Suspense fallback={<SkeletonCard />}>
          <EventWrapSection {...tabSectionProps} />
        </Suspense>
      </div>

      {/* Desktop: lifecycle-aware collapsible panels (hidden on mobile) */}
      <LifecycleWorkspacePanel
        currentStage={lifecycleStage}
        planningContent={
          <>
            <Suspense fallback={<SkeletonCard />}>
              <EventOverviewSection {...tabSectionProps} />
            </Suspense>
            <Suspense fallback={<SkeletonCard />}>
              <EventBeverageSection {...tabSectionProps} />
            </Suspense>
            <Suspense fallback={<SkeletonCard />}>
              <EventDiscoverySection {...tabSectionProps} />
            </Suspense>
            <Suspense fallback={<SkeletonCard />}>
              <EventPopUpSection {...tabSectionProps} />
            </Suspense>
            <Suspense fallback={<SkeletonCard />}>
              <EventMoneySection {...tabSectionProps} />
            </Suspense>
          </>
        }
        confirmedContent={
          <>
            <Suspense fallback={<SkeletonCard />}>
              <EventPrepSection {...tabSectionProps} />
            </Suspense>
            <Suspense fallback={<SkeletonCard />}>
              <EventTicketsSection {...tabSectionProps} />
            </Suspense>
          </>
        }
        activeContent={
          <>
            {event.status === 'in_progress' && (
              <Suspense fallback={<SkeletonCard />}>
                <DayOfServiceSection eventId={params.id} />
              </Suspense>
            )}
            <Suspense fallback={<SkeletonCard />}>
              <EventOpsSection {...tabSectionProps} />
            </Suspense>
            <Suspense fallback={<SkeletonCard />}>
              <EventDepartureSection {...tabSectionProps} />
            </Suspense>
          </>
        }
        closeoutContent={
          <Suspense fallback={<SkeletonCard />}>
            <EventWrapSection {...tabSectionProps} />
          </Suspense>
        }
      />
    </div>
  )
}
