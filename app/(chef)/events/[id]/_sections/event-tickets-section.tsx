// Server component: fetches ticket-tab data for a single event
import { requireChef } from '@/lib/auth/get-user'
import { getEventTicketTypes, getEventTickets, getEventTicketSummary } from '@/lib/tickets/actions'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'
import { EventDetailTicketsTab } from '../_components/event-detail-tickets-tab'

async function getEventPublicTicketShare(
  eventId: string
): Promise<{ token: string | null; enabled: boolean }> {
  const db: any = createServerClient()
  const { data } = await db
    .from('event_share_settings')
    .select('share_token, tickets_enabled')
    .eq('event_id', eventId)
    .maybeSingle()
  return {
    token: data?.share_token ?? null,
    enabled: data?.tickets_enabled === true,
  }
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventTicketsSection({ eventId, tenantId, event, activeTab }: Props) {
  const [ticketTypes, ticketList, ticketSummary, ticketShareResult, eventCollaborators] =
    await Promise.all([
      getEventTicketTypes(eventId).catch(() => []),
      getEventTickets(eventId).catch(() => []),
      getEventTicketSummary(eventId).catch(() => null),
      getEventPublicTicketShare(eventId).catch(() => ({ token: null, enabled: false })),
      getEventCollaborators(eventId).catch(() => []),
    ])

  const publicTicketShareToken = ticketShareResult?.token ?? null
  const ticketsEnabled = ticketShareResult?.enabled ?? false

  return (
    <EventDetailTicketsTab
      activeTab={activeTab as any}
      eventId={event.id}
      eventStatus={event.status}
      eventDate={event.event_date ? dateToDateString(event.event_date) : null}
      eventLatitude={(event as any).location_lat ?? null}
      eventLongitude={(event as any).location_lng ?? null}
      ticketTypes={ticketTypes as any[]}
      tickets={ticketList as any[]}
      summary={ticketSummary}
      shareToken={publicTicketShareToken}
      ticketsEnabled={ticketsEnabled}
      hasCollaborators={(eventCollaborators as any[]).length > 0}
      collaboratorList={(eventCollaborators as any[])
        .filter((c: any) => c.status === 'accepted' && c.chef)
        .map((c: any) => ({
          chefId: c.chef_id,
          name: c.chef?.display_name || c.chef?.business_name || 'Collaborator',
        }))}
    />
  )
}
