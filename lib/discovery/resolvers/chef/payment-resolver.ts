import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

export interface PaymentRow {
  eventId: string
  occasion: string | null
  eventDate: string | null
  outstandingBalanceCents: number
  totalPaidCents: number
  quotedPriceCents: number
  clientName: string | null
  guestCount: number | null
}

export function assignPaymentTier(row: PaymentRow, now: Date): RailTier | null {
  if (row.outstandingBalanceCents <= 0) return null

  if (!row.eventDate) return 'p2'

  const eventMs = new Date(row.eventDate + 'T00:00:00').getTime()
  const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const daysUntil = Math.round((eventMs - nowStartOfDay) / MS_DAY)

  if (daysUntil < 0) return 'p0' // Past event, overdue
  if (daysUntil === 0) return 'p1' // Event today
  if (daysUntil <= 7) return 'p2' // This week
  return 'p3' // Future
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

export function buildPaymentLabel(row: PaymentRow): string {
  const parts: string[] = []
  const name = row.clientName ?? row.occasion ?? 'Event'
  parts.push(name)
  parts.push(formatCents(row.outstandingBalanceCents))

  if (row.eventDate) {
    const eventMs = new Date(row.eventDate + 'T00:00:00').getTime()
    const nowMs = Date.now()
    const daysOverdue = Math.floor((nowMs - eventMs) / MS_DAY)
    if (daysOverdue > 0) {
      parts.push(`${daysOverdue}d overdue`)
    }
  }

  return parts.join(' ')
}

export async function resolvePayments(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { createServerClient } = await import('@/lib/db/server')
  const db = createServerClient()

  let rows: PaymentRow[]
  try {
    const result = await db`
      SELECT
        e.id as "eventId",
        e.occasion,
        e.event_date as "eventDate",
        e.guest_count as "guestCount",
        c.full_name as "clientName",
        efs.outstanding_balance_cents as "outstandingBalanceCents",
        efs.total_paid_cents as "totalPaidCents",
        efs.quoted_price_cents as "quotedPriceCents"
      FROM event_financial_summary efs
      JOIN events e ON e.id = efs.event_id
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND efs.outstanding_balance_cents > 0
      ORDER BY e.event_date ASC
    `
    rows = result as unknown as PaymentRow[]
  } catch (err) {
    console.error('[payment-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const tier = assignPaymentTier(row, ctx.now)
    if (!tier) continue

    items.push({
      definitionId: tier === 'p0' ? 'chef.payment_overdue' : 'chef.deposit_due',
      tier,
      label: buildPaymentLabel(row),
      context: `${formatCents(row.outstandingBalanceCents)} outstanding of ${formatCents(row.quotedPriceCents)}`,
      destination: `/chef/events/${row.eventId}/financials`,
      icon: 'dollar',
      inlineActions:
        tier === 'p0'
          ? [
              {
                label: 'Send Reminder',
                action: 'send_payment_reminder',
                params: { eventId: row.eventId },
                variant: 'default',
              },
            ]
          : undefined,
      data: {
        eventId: row.eventId,
        outstandingCents: row.outstandingBalanceCents,
        paidCents: row.totalPaidCents,
      },
    })
  }

  return items
}
