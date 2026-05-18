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

async function resolveEventPayments(
  ctx: GodModeResolverContext,
  eventId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let row: PaymentRow | undefined
  try {
    const result = await pgClient`
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
        AND e.id = ${eventId}
      LIMIT 1
    `
    row = (result as unknown as PaymentRow[])[0]
  } catch (err) {
    console.error('[payment-resolver] Event query failed:', err)
    return []
  }

  if (!row) return []

  const tier = assignPaymentTier(row, ctx.now)

  return [
    {
      definitionId: 'chef.event_payment_summary',
      tier: tier ?? 'p3',
      label: `${formatCents(row.totalPaidCents)} paid of ${formatCents(row.quotedPriceCents)}`,
      context:
        row.outstandingBalanceCents > 0
          ? `${formatCents(row.outstandingBalanceCents)} outstanding`
          : 'Fully paid',
      destination: `/chef/events/${row.eventId}/financials`,
      icon: 'dollar',
      loopState: row.outstandingBalanceCents > 0 ? 'waiting' : 'done',
      sourceKind: 'payment',
      evidenceLabel: 'computed',
      confidence: 1,
      proofHref: `/chef/events/${row.eventId}/financials`,
      nextAction: row.outstandingBalanceCents > 0 ? 'Collect remaining balance' : null,
      data: {
        eventId: row.eventId,
        outstandingCents: row.outstandingBalanceCents,
        paidCents: row.totalPaidCents,
        quotedCents: row.quotedPriceCents,
      },
    },
  ]
}

async function resolveClientPayments(
  ctx: GodModeResolverContext,
  clientId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: PaymentRow[]
  try {
    const result = await pgClient`
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
        AND e.client_id = ${clientId}
        AND e.status != 'cancelled'
        AND efs.outstanding_balance_cents > 0
      ORDER BY e.event_date DESC
      LIMIT 5
    `
    rows = result as unknown as PaymentRow[]
  } catch (err) {
    console.error('[payment-resolver] Client query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const tier = assignPaymentTier(row, ctx.now)
    if (!tier) continue

    items.push({
      definitionId: tier === 'p0' ? 'chef.payment_overdue' : 'chef.deposit_due',
      tier,
      label: `${row.occasion ?? 'Event'}: ${formatCents(row.outstandingBalanceCents)} outstanding`,
      context: `${formatCents(row.totalPaidCents)} paid of ${formatCents(row.quotedPriceCents)}`,
      destination: `/chef/events/${row.eventId}/financials`,
      icon: 'dollar',
      loopState: 'waiting',
      sourceKind: 'payment',
      evidenceLabel: 'computed',
      confidence: 1,
      proofHref: `/chef/events/${row.eventId}/financials`,
      nextAction: tier === 'p0' ? 'Send payment reminder' : 'Track outstanding balance',
      waitingOn: {
        kind: 'payment',
        label: 'Payment',
        followUpAt: row.eventDate ? `${row.eventDate}T00:00:00.000Z` : null,
      },
      data: {
        eventId: row.eventId,
        outstandingCents: row.outstandingBalanceCents,
        paidCents: row.totalPaidCents,
      },
    })
  }

  return items
}

export async function resolvePayments(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  if (ctx.entityContext?.type === 'event') {
    return resolveEventPayments(ctx, ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'client') {
    return resolveClientPayments(ctx, ctx.entityContext.id)
  }

  const { pgClient } = await import('@/lib/db')

  let rows: PaymentRow[]
  try {
    const result = await pgClient`
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
      loopState: 'waiting',
      sourceKind: 'payment',
      evidenceLabel: 'computed',
      confidence: 1,
      proofHref: `/chef/events/${row.eventId}/financials`,
      nextAction: tier === 'p0' ? 'Send payment reminder' : 'Track outstanding balance',
      waitingOn: {
        kind: 'payment',
        label: 'Payment',
        followUpAt: row.eventDate ? `${row.eventDate}T00:00:00.000Z` : null,
      },
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
