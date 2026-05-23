// Server component: intelligence, lifecycle, completion, ops pulse
import { Suspense } from 'react'
import { getLifecycleProgress } from '@/lib/lifecycle/actions'
import { getCompletionForEntity } from '@/lib/completion/actions'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { getEventPricingIntelligence } from '@/lib/finance/event-pricing-intelligence-actions'
import { dateToDateString } from '@/lib/utils/format'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { EventIntelligencePanel } from '@/components/intelligence/event-intelligence-panel'
import { LifecycleProgressPanel } from '@/components/lifecycle/lifecycle-progress-panel'
import { CompletionCard, CompletionCardSkeleton } from '@/components/completion/completion-card'
import { OpsPulseCard } from '@/components/events/ops-pulse-card'
import { EventPricingVertical } from '@/components/pricing/event-pricing-vertical'
import { CostStaleBanner } from '@/components/pricing/cost-stale-banner'
import { EventStatusRealtimeSync } from '@/components/events/event-status-realtime-sync'
import { EventCompliancePacketCard } from '@/components/compliance/event-compliance-packet-card'
import { EventReadinessBusCard } from '@/components/events/event-readiness-bus-card'
import { getEventReadinessBus } from '@/lib/events/event-readiness-bus-actions'

async function EventCompletionInner({ eventId }: { eventId: string }) {
  const result = await getCompletionForEntity('event', eventId)
  if (!result) return null
  return <CompletionCard result={result} />
}

type Props = {
  eventId: string
  tenantId: string
  event: any
}

export async function EventIntelligenceSection({ eventId, tenantId, event }: Props) {
  const [
    pricingIntelligence,
    readinessBus,
    lifecycleProgress,
    completionResult,
    { timeline: prepTimeline },
  ] = await Promise.all([
    getEventPricingIntelligence(eventId).catch(() => null),
    getEventReadinessBus(eventId).catch(() => null),
    getLifecycleProgress(event.inquiry_id ?? undefined, eventId).catch(() => null),
    getCompletionForEntity('event', eventId).catch(() => null),
    getEventPrepTimeline(eventId).catch(() => ({ timeline: null })),
  ])

  const completionScore = completionResult?.score ?? null

  return (
    <>
      {/* Realtime event status subscription */}
      <EventStatusRealtimeSync eventId={eventId} />

      {/* Cost stale banner */}
      <CostStaleBanner
        eventId={eventId}
        costNeedsRefresh={(event as any).cost_needs_refresh === true}
      />

      {/* Pricing Pulse */}
      {pricingIntelligence && <EventPricingVertical data={pricingIntelligence} />}

      <WidgetErrorBoundary name="Event Readiness Bus" compact>
        <Suspense fallback={null}>
          <EventReadinessBusCard bus={readinessBus} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Event Intelligence */}
      <WidgetErrorBoundary name="Event Intelligence" compact>
        <Suspense fallback={null}>
          <EventIntelligencePanel
            eventId={eventId}
            guestCount={event.guest_count ?? null}
            occasion={event.occasion ?? null}
            quotedPriceCents={(event as any).quoted_price_cents ?? null}
            status={event.status}
            eventDate={event.event_date ?? null}
          />
        </Suspense>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary name="Compliance Packet" compact>
        <Suspense fallback={null}>
          <EventCompliancePacketCard eventId={eventId} compact />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Lifecycle Progress */}
      {lifecycleProgress && lifecycleProgress.stages.length > 0 && (
        <WidgetErrorBoundary name="Lifecycle Progress" compact>
          <LifecycleProgressPanel
            eventId={eventId}
            inquiryId={event.inquiry_id ?? undefined}
            stages={lifecycleProgress.stages}
            overallPercent={lifecycleProgress.overallPercent}
            currentStage={lifecycleProgress.currentStage}
            nextActions={lifecycleProgress.nextActions}
          />
        </WidgetErrorBoundary>
      )}

      {/* Completion Contract */}
      <WidgetErrorBoundary name="Completion" compact>
        <Suspense fallback={<CompletionCardSkeleton />}>
          <EventCompletionInner eventId={eventId} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Ops Pulse */}
      {!['cancelled', 'completed'].includes(event.status) && (
        <WidgetErrorBoundary name="Ops Pulse" compact>
          <OpsPulseCard
            eventDate={dateToDateString(event.event_date)}
            serveTime={(event as any).serve_time}
            status={event.status}
            completionScore={completionScore}
            prepDays={
              prepTimeline
                ? (prepTimeline as any).days?.map((d: any) => ({
                    label: d.label,
                    itemCount: d.items?.length ?? 0,
                    totalMinutes: d.totalPrepMinutes ?? 0,
                    isPast: d.isPast,
                    isToday: d.isToday,
                  }))
                : undefined
            }
            groceryDeadline={
              (prepTimeline as any)?.groceryDeadline
                ? dateToDateString((prepTimeline as any).groceryDeadline)
                : null
            }
            untimedCount={(prepTimeline as any)?.untimedItems?.length}
          />
        </WidgetErrorBoundary>
      )}
    </>
  )
}
