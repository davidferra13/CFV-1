import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import {
  getEventById,
  startEventActivity,
  stopEventActivity,
  updateEventTimeAndCard,
} from '@/lib/events/actions'
import { getEventReadiness } from '@/lib/events/readiness'
import { EventTransitions } from '@/components/events/event-transitions'
import { ReadinessGatePanel } from '@/components/events/readiness-gate-panel'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { TimeTracking } from '@/components/events/time-tracking'
import { Button } from '@/components/ui/button'
import { ServiceSimulationRollupCard } from '@/components/events/service-simulation-rollup-card'
import { loadEventServiceSimulationPanelState } from '@/lib/service-simulation/state'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

function getExecutionTargetLabel(status: string): string {
  if (status === 'paid') return 'Confirm Event'
  if (status === 'confirmed') return 'Start Service'
  if (status === 'in_progress') return 'Complete Service'
  return 'Next Step'
}

export default async function EventExecutionPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)

  const [event, readiness, simulationState] = await Promise.all([
    getEventById(params.id),
    getEventReadiness(params.id).catch(() => null),
    loadEventServiceSimulationPanelState(params.id).catch(() => null),
  ])

  if (!event) notFound()

  const canTrackTime = !['draft', 'cancelled'].includes(event.status)

  return (
    <div className="space-y-6">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Execution</h1>
          <p className="mt-1 text-sm text-stone-500">
            {event.occasion || 'Event'} - {format(new Date(event.event_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={returnTo ?? `/events/${params.id}`}>
            <Button variant="ghost">Back to Event</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-4 py-3 text-sm text-stone-400">
        Execution keeps the service-day handoff narrow: transition the event, manage the live
        service timer, and review only the proof signals that still affect this step.
      </div>

      {simulationState ? (
        <ServiceSimulationRollupCard
          eventId={params.id}
          panelState={simulationState}
          compact
          returnToHref={`/events/${params.id}?tab=ops#service-simulation`}
          description="Keep the simulation signal visible while you move the event forward."
        />
      ) : null}

      {readiness && readiness.gates.length > 0 ? (
        <ReadinessGatePanel
          eventId={params.id}
          readiness={readiness}
          targetLabel={getExecutionTargetLabel(event.status)}
        />
      ) : null}

      <EventTransitions event={event} readiness={readiness} simulation={simulationState} />

      {canTrackTime ? (
        <TimeTracking
          eventId={params.id}
          initialData={{
            time_shopping_minutes: (event as any).time_shopping_minutes ?? null,
            time_prep_minutes: (event as any).time_prep_minutes ?? null,
            time_travel_minutes: (event as any).time_travel_minutes ?? null,
            time_service_minutes: (event as any).time_service_minutes ?? null,
            time_reset_minutes: (event as any).time_reset_minutes ?? null,
            shopping_started_at: (event as any).shopping_started_at ?? null,
            shopping_completed_at: (event as any).shopping_completed_at ?? null,
            prep_started_at: (event as any).prep_started_at ?? null,
            prep_completed_at: (event as any).prep_completed_at ?? null,
            travel_started_at: (event as any).travel_started_at ?? null,
            travel_completed_at: (event as any).travel_completed_at ?? null,
            service_started_at: (event as any).service_started_at ?? null,
            service_completed_at: (event as any).service_completed_at ?? null,
            reset_started_at: (event as any).reset_started_at ?? null,
            reset_completed_at: (event as any).reset_completed_at ?? null,
          }}
          onSave={updateEventTimeAndCard}
          onStart={startEventActivity}
          onStop={stopEventActivity}
        />
      ) : null}
    </div>
  )
}
