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
  const today = new Date().toISOString().slice(0, 10)

  const [eventsResult, unreadCount] = await Promise.all([
    db
      .from('events')
      .select('id, occasion, event_date, serve_time, status, clients(full_name)')
      .eq('tenant_id', user.tenantId!)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
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
