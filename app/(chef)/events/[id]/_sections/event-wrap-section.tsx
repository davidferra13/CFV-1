// Server component: fetches wrap-tab data for a single event
import { getEntityActivityTimeline } from '@/lib/activity/entity-timeline'
import { fetchEntityHistory } from '@/lib/audit-trail/surface-actions'
import { getEventClosureStatus } from '@/lib/events/actions'
import { getAARByEventId } from '@/lib/aar/actions'
import { createServerClient } from '@/lib/db/server'
import { EventDetailWrapTab } from '../_components/event-detail-wrap-tab'

async function getEventTransitionsFromDb(eventId: string) {
  const db: any = createServerClient()
  const { data: transitions } = await db
    .from('event_state_transitions')
    .select('*')
    .eq('event_id', eventId)
    .order('transitioned_at', { ascending: true })
  return transitions || []
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventWrapSection({ eventId, tenantId, event, activeTab }: Props) {
  const isCompletedOrBeyond = ['completed', 'in_progress'].includes(event.status)

  const [transitions, timelineEntries, auditHistory, closureStatus, aar] = await Promise.all([
    getEventTransitionsFromDb(eventId).catch(() => []),
    getEntityActivityTimeline('event', eventId).catch(() => []),
    fetchEntityHistory('event', eventId).catch(() => []),
    isCompletedOrBeyond ? getEventClosureStatus(eventId).catch(() => null) : Promise.resolve(null),
    isCompletedOrBeyond ? getAARByEventId(eventId) : Promise.resolve(null),
  ])

  return (
    <EventDetailWrapTab
      activeTab={activeTab as any}
      eventId={event.id}
      eventStatus={event.status}
      eventClientId={event.client_id}
      followUpSent={(event as any).follow_up_sent ?? false}
      followUpSentAt={(event as any).follow_up_sent_at ?? null}
      debriefCompletedAt={(event as any).debrief_completed_at ?? null}
      hasAAR={!!aar}
      hasClosureStatus={!!closureStatus}
      transitions={transitions as any[]}
      timelineEntries={timelineEntries}
      auditHistory={auditHistory}
    />
  )
}
