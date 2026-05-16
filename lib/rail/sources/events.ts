import type { RailItem, RailTier } from '@/lib/rail/types'

const MS_HOUR = 3_600_000
const MS_DAY = 86_400_000
const MAX_ITEMS = 10

export async function getEventRailItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')

    const rows = await pgClient`
      SELECT
        e.id,
        e.event_date AS "eventDate",
        e.serve_time AS "serveTime",
        e.status,
        e.guest_count AS "guestCount",
        e.occasion,
        e.payment_status AS "paymentStatus",
        e.grocery_list_ready AS "groceryListReady",
        e.prep_list_ready AS "prepListReady",
        e.timeline_ready AS "timelineReady",
        e.execution_sheet_ready AS "executionSheetReady",
        c.full_name AS "clientName"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.tenant_id = ${tenantId}
        AND e.status NOT IN ('completed', 'cancelled')
        AND e.event_date <= CURRENT_DATE + INTERVAL '14 days'
        AND e.event_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY e.event_date ASC, e.serve_time ASC
      LIMIT ${MAX_ITEMS}
    `

    const now = new Date()
    const items: RailItem[] = []

    for (const row of rows) {
      const r = row as {
        id: string
        eventDate: string
        serveTime: string
        status: string
        guestCount: number
        occasion: string | null
        paymentStatus: string
        groceryListReady: boolean
        prepListReady: boolean
        timelineReady: boolean
        executionSheetReady: boolean
        clientName: string | null
      }

      const eventDateMs = new Date(r.eventDate).getTime()
      const diffMs = eventDateMs - now.getTime()
      const diffHours = diffMs / MS_HOUR
      const diffDays = diffMs / MS_DAY

      let tier: RailTier
      let score: number
      if (diffHours <= 24) {
        tier = 'critical'
        score = 90
      } else if (diffDays <= 3) {
        tier = 'action'
        score = 70
      } else if (diffDays <= 7) {
        tier = 'awareness'
        score = 40
      } else {
        tier = 'opportunity'
        score = 20
      }

      // Boost score for unprepared events
      const unreadyCount = [
        !r.groceryListReady,
        !r.prepListReady,
        !r.timelineReady,
        !r.executionSheetReady,
      ].filter(Boolean).length
      if (unreadyCount > 0 && tier !== 'critical') {
        score = Math.min(score + unreadyCount * 5, 99)
      }

      const clientLabel = r.clientName ?? 'Client'
      const occasionLabel = r.occasion ? ` (${r.occasion})` : ''
      const title = `${clientLabel}${occasionLabel}`

      let subtitle: string
      if (diffHours <= 0) {
        subtitle = 'Event is today or overdue'
      } else if (diffHours <= 24) {
        subtitle = `In ${Math.round(diffHours)}h, ${r.guestCount} guests`
      } else {
        subtitle = `In ${Math.round(diffDays)}d, ${r.guestCount} guests`
      }

      if (unreadyCount > 0) {
        subtitle += `, ${unreadyCount} prep items pending`
      }

      // TTL = time until event, minimum 60 minutes
      const ttlMinutes = Math.max(Math.round(diffMs / 60_000), 60)

      items.push({
        id: `event-${r.id}`,
        tenantId,
        source: 'events',
        tier,
        state: 'surfaced',
        score,
        title,
        subtitle,
        actionUrl: `/chef/events/${r.id}`,
        createdAt: now,
        surfacedAt: now,
        ttlMinutes,
        metadata: {
          eventId: r.id,
          eventDate: r.eventDate,
          status: r.status,
          guestCount: r.guestCount,
          paymentStatus: r.paymentStatus,
          unreadyCount,
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/sources/events] Query failed:', err)
    return []
  }
}
