'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { format } from 'date-fns'

export interface RemyConciergeContext {
  upcomingEventsCount: number
  upcomingEvents: Array<{
    id: string
    occasion: string
    eventDate: string
    clientName: string
    groceryDeadline?: string | null
    prepStartDate?: string | null
    untimedRecipeCount?: number
  }>
  overdueInvoiceCount: number
  unreadMessageCount: number
  pendingQuoteCount: number
  activeAlerts: Array<{
    id: string
    title: string
    body: string
    priority: string
    alertType: string
    entityType?: string
    entityId?: string
  }>
}

export async function getRemyConciergeContext(): Promise<RemyConciergeContext> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Run all queries in parallel
  const [eventsResult, invoicesResult, quotesResult, alertsResult, unreadResult] =
    await Promise.all([
      // Upcoming events (next 7 days)
      db
        .from('events')
        .select('id, occasion, event_date, client:clients(full_name)')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '("cancelled","completed","draft")')
        .gte('event_date', today)
        .lte('event_date', in7Days)
        .order('event_date', { ascending: true })
        .limit(10),

      // Overdue invoices
      db
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .lt('due_date', today)
        .limit(0),

      // Pending quotes
      db
        .from('quotes')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('status', 'draft')
        .limit(0),

      // Active remy alerts (not dismissed)
      db
        .from('remy_alerts')
        .select('id, title, body, priority, alert_type, entity_type, entity_id')
        .eq('tenant_id', tenantId)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(10),

      // Unread inquiry messages
      db
        .from('inquiry_messages')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('is_read', false)
        .eq('direction', 'inbound')
        .limit(0),
    ])

  const events = eventsResult.data ?? []

  // Enrich upcoming events with prep timeline data (non-blocking, max 5)
  const enrichedEvents = await Promise.all(
    events
      .slice(0, 5)
      .map(
        async (e: {
          id: string
          occasion: string | null
          event_date: string
          client?: { full_name?: string }
        }) => {
          let groceryDeadline: string | null = null
          let prepStartDate: string | null = null
          let untimedRecipeCount = 0
          try {
            const { timeline } = await getEventPrepTimeline(e.id)
            if (timeline) {
              if (timeline.groceryDeadline) {
                groceryDeadline = format(timeline.groceryDeadline, 'yyyy-MM-dd')
              }
              if (timeline.days.length > 0) {
                prepStartDate = format(timeline.days[0].date, 'yyyy-MM-dd')
              }
              untimedRecipeCount = timeline.untimedItems.length
            }
          } catch {
            // Non-blocking: prep timeline failure should not break concierge context
          }
          return {
            id: e.id,
            occasion: e.occasion ?? 'Event',
            eventDate: e.event_date,
            clientName: e.client?.full_name ?? 'Unknown',
            groceryDeadline,
            prepStartDate,
            untimedRecipeCount,
          }
        }
      )
  )

  // Include any remaining events (beyond 5) without timeline enrichment
  const remainingEvents = events
    .slice(5)
    .map(
      (e: {
        id: string
        occasion: string | null
        event_date: string
        client?: { full_name?: string }
      }) => ({
        id: e.id,
        occasion: e.occasion ?? 'Event',
        eventDate: e.event_date,
        clientName: e.client?.full_name ?? 'Unknown',
      })
    )

  const upcomingEvents = [...enrichedEvents, ...remainingEvents]

  const alerts = (alertsResult.data ?? []).map(
    (a: {
      id: string
      title: string
      body: string
      priority: string
      alert_type: string
      entity_type?: string
      entity_id?: string
    }) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      priority: a.priority,
      alertType: a.alert_type,
      entityType: a.entity_type,
      entityId: a.entity_id,
    })
  )

  return {
    upcomingEventsCount: events.length,
    upcomingEvents,
    overdueInvoiceCount: invoicesResult.count ?? 0,
    unreadMessageCount: unreadResult.count ?? 0,
    pendingQuoteCount: quotesResult.count ?? 0,
    activeAlerts: alerts,
  }
}

export async function dismissRemyAlert(alertId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_alerts')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to dismiss alert: ${error.message}`)
}
