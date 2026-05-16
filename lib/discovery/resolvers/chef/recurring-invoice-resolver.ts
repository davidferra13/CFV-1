import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces recurring invoices due to generate.
 * Tables: recurring_invoices, clients
 */
export async function resolveRecurringInvoices(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    clientName: string | null
    clientId: string
    nextSendDate: string | null
    amountCents: number
    frequency: string
    name: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        ri.id,
        c.full_name as "clientName",
        ri.client_id as "clientId",
        ri.next_send_date as "nextSendDate",
        ri.amount_cents as "amountCents",
        ri.frequency,
        ri.name
      FROM recurring_invoices ri
      JOIN clients c ON c.id = ri.client_id
      WHERE ri.chef_id = ${ctx.tenantId}
        AND ri.is_active = true
        AND ri.status = 'active'
        AND ri.next_send_date IS NOT NULL
        AND ri.next_send_date <= (CURRENT_DATE + INTERVAL '7 days')::date
      ORDER BY ri.next_send_date ASC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[recurring-invoice-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    if (!row.nextSendDate) continue

    const sendMs = new Date(row.nextSendDate + 'T00:00:00').getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysUntil = Math.round((sendMs - nowStart) / MS_DAY)

    let tier: RailTier = 'p3'
    if (daysUntil <= 0)
      tier = 'p1' // overdue or today
    else if (daysUntil <= 2) tier = 'p2'
    else tier = 'p3'

    const amount = `$${(row.amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    const label = row.name ?? `${row.frequency} invoice`
    const client = row.clientName ?? 'Client'

    items.push({
      definitionId: `chef.recurring_invoice_due.${row.id}`,
      tier,
      label: `${label}: ${client} ${amount}`,
      context: daysUntil <= 0 ? 'Due today or overdue' : `Due in ${daysUntil}d`,
      destination: `/chef/financials/recurring`,
      icon: 'refresh-cw',
      loopState: daysUntil <= 0 ? 'active' : 'waiting',
      sourceKind: 'payment',
      evidenceLabel: 'computed',
      confidence: 1,
      nextAction: 'Review and generate invoice',
      data: {
        invoiceId: row.id,
        clientId: row.clientId,
        amountCents: row.amountCents,
        nextSendDate: row.nextSendDate,
      },
    })
  }

  return items
}
