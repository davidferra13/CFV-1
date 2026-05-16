import type { RailItem, RailTier } from '@/lib/rail/types'

const MS_DAY = 86_400_000
const MAX_ITEMS = 8

export async function getFinanceRailItems(tenantId: string): Promise<RailItem[]> {
  try {
    const { pgClient } = await import('@/lib/db')

    // Find events with outstanding balances using the financial summary view logic.
    // We compute total paid vs quoted price inline to avoid view dependency issues.
    const rows = await pgClient`
      SELECT
        e.id AS "eventId",
        e.event_date AS "eventDate",
        e.quoted_price_cents AS "quotedPriceCents",
        e.payment_status AS "paymentStatus",
        e.occasion,
        c.full_name AS "clientName",
        COALESCE(SUM(le.amount_cents) FILTER (WHERE le.is_refund = false), 0) AS "totalPaidCents"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      LEFT JOIN ledger_entries le ON le.event_id = e.id
      WHERE e.tenant_id = ${tenantId}
        AND e.status NOT IN ('draft', 'cancelled')
        AND e.payment_status IN ('unpaid', 'deposit_paid', 'partial')
        AND e.quoted_price_cents IS NOT NULL
        AND e.quoted_price_cents > 0
      GROUP BY e.id, e.event_date, e.quoted_price_cents, e.payment_status, e.occasion, c.full_name
      ORDER BY e.event_date ASC
      LIMIT ${MAX_ITEMS}
    `

    const now = new Date()
    const items: RailItem[] = []

    for (const row of rows) {
      const r = row as {
        eventId: string
        eventDate: string
        quotedPriceCents: number
        paymentStatus: string
        occasion: string | null
        clientName: string | null
        totalPaidCents: number
      }

      const eventDateMs = new Date(r.eventDate).getTime()
      const diffMs = now.getTime() - eventDateMs
      const daysOverdue = diffMs / MS_DAY

      const outstandingCents = r.quotedPriceCents - Number(r.totalPaidCents)
      if (outstandingCents <= 0) continue

      let tier: RailTier
      let score: number
      if (daysOverdue > 30) {
        tier = 'critical'
        score = 95
      } else if (daysOverdue > 7) {
        tier = 'action'
        score = 70
      } else if (daysOverdue > 0) {
        tier = 'awareness'
        score = 45
      } else {
        // Event hasn't happened yet; payment due soon
        tier = 'opportunity'
        score = 15
      }

      const clientLabel = r.clientName ?? 'Client'
      const outstandingDollars = (outstandingCents / 100).toFixed(2)
      const title = `$${outstandingDollars} outstanding from ${clientLabel}`

      let subtitle: string
      if (daysOverdue > 0) {
        subtitle = `${Math.round(daysOverdue)}d overdue, ${r.paymentStatus}`
      } else {
        subtitle = `Due soon, ${r.paymentStatus}`
      }
      if (r.occasion) {
        subtitle += ` (${r.occasion})`
      }

      items.push({
        id: `finance-${r.eventId}`,
        tenantId,
        source: 'finance',
        tier,
        state: 'surfaced',
        score,
        title,
        subtitle,
        actionUrl: `/chef/events/${r.eventId}`,
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 10080,
        metadata: {
          eventId: r.eventId,
          eventDate: r.eventDate,
          quotedPriceCents: r.quotedPriceCents,
          totalPaidCents: Number(r.totalPaidCents),
          outstandingCents,
          paymentStatus: r.paymentStatus,
          daysOverdue: Math.round(daysOverdue),
        },
      })
    }

    return items
  } catch (err) {
    console.error('[rail/sources/finance] Query failed:', err)
    return []
  }
}
