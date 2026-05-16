import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces unpaid vendor invoices (payment due to vendors).
 * Tables: vendor_invoices, vendors
 */
export async function resolveVendorInvoices(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    vendorName: string | null
    invoiceDate: string
    totalCents: number
    invoiceNumber: string | null
    vendorId: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        vi.id,
        v.name as "vendorName",
        vi.invoice_date as "invoiceDate",
        vi.total_cents as "totalCents",
        vi.invoice_number as "invoiceNumber",
        vi.vendor_id as "vendorId"
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON v.id = vi.vendor_id
      WHERE vi.chef_id = ${ctx.tenantId}
        AND vi.status = 'pending'
      ORDER BY vi.invoice_date ASC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[vendor-invoice-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const invoiceMs = new Date(row.invoiceDate + 'T00:00:00').getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysOld = Math.round((nowStart - invoiceMs) / MS_DAY)

    const tier =
      daysOld >= 30
        ? ('p0' as const)
        : daysOld >= 14
          ? ('p1' as const)
          : daysOld >= 7
            ? ('p2' as const)
            : ('p3' as const)

    const amount = `$${(row.totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    const name = row.vendorName ?? 'Vendor'

    items.push({
      definitionId: `chef.vendor_payment_due.${row.id}`,
      tier,
      label: `Pay ${name}: ${amount}`,
      context: `Invoice from ${row.invoiceDate}${daysOld > 0 ? `, ${daysOld}d old` : ''}`,
      destination: row.vendorId ? `/chef/vendors/${row.vendorId}` : '/chef/vendors',
      icon: 'receipt',
      loopState: daysOld >= 30 ? 'blocked' : 'active',
      sourceKind: 'vendor',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: 'Process vendor payment',
      data: {
        invoiceId: row.id,
        vendorId: row.vendorId,
        totalCents: row.totalCents,
        daysOld,
      },
    })
  }

  return items
}
