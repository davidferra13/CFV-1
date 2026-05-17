// Server component: fetches prep-tab data for a single event
import { createServerClient } from '@/lib/db/server'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { EventDetailPrepTab } from '../_components/event-detail-prep-tab'

async function getEventMenusForCheck(eventId: string): Promise<string[] | null> {
  const db: any = createServerClient()
  const { data: menus } = await db.from('menus').select('id, name').eq('event_id', eventId)
  if (!menus || menus.length === 0) return null
  return menus.map((m: any) => m.id)
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventPrepSection({ eventId, tenantId, event, activeTab }: Props) {
  const [{ timeline: prepTimeline }, eventMenus] = await Promise.all([
    getEventPrepTimeline(eventId).catch(() => ({ timeline: null })),
    getEventMenusForCheck(eventId).catch(() => null),
  ])

  return (
    <EventDetailPrepTab
      activeTab={activeTab as any}
      timeline={prepTimeline}
      eventId={event.id}
      hasMenu={!!eventMenus}
    />
  )
}
