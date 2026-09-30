import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getUnreadCount } from '@/lib/notifications/actions'

export type MobileChefDashboardData = {
  upcomingEvents: Array<{
    id: string
    occasion: string | null
    eventDate: string
    serveTime: string | null
    status: string
    clientName: string | null
    guestCount: number | null
    readiness: {
      prep: boolean
      grocery: boolean
      timeline: boolean
      packing: boolean
    }
  }>
  metrics: {
    unreadNotifications: number
    upcomingEventCount: number
    confirmedEventCount: number
  }
}

export type MobileClientEventsData = {
  events: Array<{
    id: string
    occasion: string | null
    eventDate: string
    serveTime: string | null
    status: string
    chefName: string | null
    quotedPriceCents: number | null
  }>
}

export async function getMobileChefDashboardData(chefId: string): Promise<MobileChefDashboardData> {
  const user = await requireChef()
  if (user.entityId !== chefId && user.tenantId !== chefId) {
    throw new Error('Unauthorized: cannot view another chef dashboard')
  }

  const db: any = createServerClient()
  const _td = new Date()
  const today = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`

  const [eventsResult, unreadCount] = await Promise.all([
    db
      .from('events')
      .select(
        'id, occasion, event_date, serve_time, status, guest_count, prep_list_ready, grocery_list_ready, timeline_ready, packing_list_ready, clients(full_name)'
      )
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', today)
      .not('status', 'in', '("cancelled","completed")')
      .order('event_date', { ascending: true })
      .order('serve_time', { ascending: true, nullsFirst: false })
      .limit(8),
    getUnreadCount().catch(() => 0),
  ])

  if (eventsResult.error) {
    throw new Error(`Failed to load mobile dashboard events: ${eventsResult.error.message}`)
  }

  const upcomingEvents = ((eventsResult.data || []) as Array<any>).map((event) => ({
    id: event.id,
    occasion: event.occasion,
    eventDate: event.event_date,
    serveTime: event.serve_time,
    status: event.status,
    clientName: event.clients?.full_name || null,
    guestCount: event.guest_count ?? null,
    readiness: {
      prep: event.prep_list_ready === true,
      grocery: event.grocery_list_ready === true,
      timeline: event.timeline_ready === true,
      packing: event.packing_list_ready === true,
    },
  }))

  return {
    upcomingEvents,
    metrics: {
      unreadNotifications: unreadCount,
      upcomingEventCount: upcomingEvents.length,
      confirmedEventCount: upcomingEvents.filter((event) => event.status === 'confirmed').length,
    },
  }
}

export async function getMobileClientEventsData(clientId: string): Promise<MobileClientEventsData> {
  const user = await requireClient()
  if (user.entityId !== clientId) {
    throw new Error('Unauthorized: cannot view another client event list')
  }

  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, status, quoted_price_cents, chefs(business_name)'
    )
    .eq('client_id', user.entityId)
    .order('event_date', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Failed to load mobile client events: ${error.message}`)
  }

  return {
    events: ((data || []) as Array<any>).map((event) => ({
      id: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      serveTime: event.serve_time,
      status: event.status,
      chefName: event.chefs?.business_name || null,
      quotedPriceCents: event.quoted_price_cents || null,
    })),
  }
}
