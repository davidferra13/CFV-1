'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { getPayrollReportForPeriod } from '@/lib/staff/staffing-actions'

const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type ProfitAndLossReportData = {
  startDate: string
  endDate: string
  revenue: {
    billingRevenueCents: number
    commerceRevenueCents: number
    salesRevenueCents: number
    totalRevenueCents: number
  }
  cogs: {
    purchaseOrdersCents: number
  }
  operatingExpenses: {
    expenseTableCents: number
    laborFromPayrollCents: number
    subcontractCostsCents: number
    processingFeesCents: number
    totalOperatingExpensesCents: number
  }
  totals: {
    grossProfitCents: number
    netProfitLossCents: number
    profitMarginPercent: number
  }
}

export async function getProfitAndLossReport(
  startDate: string,
  endDate: string
): Promise<ProfitAndLossReportData> {
  const user = await requireChef()
  const parsed = DateRangeSchema.parse({ startDate, endDate })
  const db: any = createServerClient()

  const [
    ledgerResult,
    commerceResult,
    salesResult,
    commerceSalesLinks,
    poResult,
    expenseResult,
    payroll,
    subcontractResult,
  ] = await Promise.all([
    db
      .from('ledger_entries')
      .select('entry_type, amount_cents, is_refund')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${parsed.startDate}T00:00:00Z`)
      .lte('created_at', `${parsed.endDate}T23:59:59Z`),
    db
      .from('commerce_payments')
      .select('amount_cents, status, sale_id, ledger_entry_id')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${parsed.startDate}T00:00:00Z`)
      .lte('created_at', `${parsed.endDate}T23:59:59Z`)
      .in('status', ['captured', 'settled']),
    db
      .from('sales')
      .select('id, total_cents, status')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${parsed.startDate}T00:00:00Z`)
      .lte('created_at', `${parsed.endDate}T23:59:59Z`)
      .in('status', ['captured', 'settled', 'partially_refunded']),
    db
      .from('commerce_payments')
      .select('sale_id')
      .eq('tenant_id', user.tenantId!)
      .not('sale_id', 'is', null),
    // Two-query approach: OR across two date columns cannot be safely expressed
    // in the compat shim's .or() syntax without silently dropping and() clauses.
    // Use pgClient with parameterized SQL instead.
    pgClient<
      {
        status: string
        order_date: string
        received_at: string | null
        estimated_total_cents: number | null
        actual_total_cents: number | null
      }[]
    >`
      SELECT status, order_date, received_at, estimated_total_cents, actual_total_cents
      FROM purchase_orders
      WHERE chef_id = ${user.tenantId!}
        AND status IN ('partially_received', 'received')
        AND (
          (order_date >= ${parsed.startDate} AND order_date <= ${parsed.endDate})
          OR
          (received_at >= ${parsed.startDate + 'T00:00:00Z'} AND received_at <= ${parsed.endDate + 'T23:59:59Z'})
        )
    `
      .then((rows) => ({ data: rows, error: null }))
      .catch((err: Error) => ({ data: null, error: { message: err.message } })),
    db
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', parsed.startDate)
      .lte('expense_date', parsed.endDate),
    getPayrollReportForPeriod(parsed.startDate, parsed.endDate),
    // Subcontract costs: completed agreements within date range
    db
      .from('subcontract_agreements')
      .select('rate_type, rate_cents, estimated_hours')
      .eq('hiring_chef_id', user.tenantId!)
      .in('status', ['completed', 'active'])
      .gte('created_at', `${parsed.startDate}T00:00:00Z`)
      .lte('created_at', `${parsed.endDate}T23:59:59Z`),
  ])

  if (ledgerResult.error)
    throw new Error(`Failed to load billing revenue: ${ledgerResult.error.message}`)
  if (commerceResult.error) {
    throw new Error(`Failed to load commerce revenue: ${commerceResult.error.message}`)
  }
  if (salesResult.error)
    throw new Error(`Failed to load sales revenue: ${salesResult.error.message}`)
  if (commerceSalesLinks.error) {
    throw new Error(`Failed to load sale links: ${commerceSalesLinks.error.message}`)
  }
  if (poResult.error) throw new Error(`Failed to load purchase orders: ${poResult.error.message}`)
  if (expenseResult.error)
    throw new Error(`Failed to load expenses: ${expenseResult.error.message}`)

  let billingRevenueCents = 0
  for (const row of ledgerResult.data ?? []) {
    if (row.is_refund || row.entry_type === 'refund') {
      billingRevenueCents -= Math.abs(row.amount_cents)
    } else if (row.entry_type === 'tip') {
      // keep tips out of topline P&L revenue for this report
      continue
    } else {
      billingRevenueCents += row.amount_cents
    }
  }

  const commerceRevenueCents = (commerceResult.data ?? [])
    .filter((row: any) => !row.ledger_entry_id)
    .reduce((sum: any, row: any) => sum + (row.amount_cents ?? 0), 0)

  // Payment processing fees (Stripe fees from commerce payments)
  const processingFeesCents = (commerceResult.data ?? []).reduce(
    (sum: any, row: any) => sum + (row.fee_cents ?? 0),
    0
  )

  const linkedSaleIds = new Set(
    (commerceSalesLinks.data ?? []).map((row: any) => row.sale_id).filter(Boolean)
  )
  const salesRevenueCents = (salesResult.data ?? [])
    .filter((row: any) => !linkedSaleIds.has(row.id))
    .reduce((sum: any, row: any) => sum + (row.total_cents ?? 0), 0)

  const totalRevenueCents = billingRevenueCents + commerceRevenueCents + salesRevenueCents

  const purchaseOrdersCents = (poResult.data ?? []).reduce((sum: any, row: any) => {
    if (row.actual_total_cents != null) return sum + row.actual_total_cents
    return sum + (row.estimated_total_cents ?? 0)
  }, 0)

  const expenseTableCents = (expenseResult.data ?? []).reduce(
    (sum: any, row: any) => sum + (row.amount_cents ?? 0),
    0
  )
  const laborFromPayrollCents = payroll.totalLaborCostCents

  // Subcontract costs: flat = rate_cents, hourly = rate_cents * estimated_hours
  const subcontractCostsCents = (subcontractResult?.data ?? []).reduce((sum: any, row: any) => {
    if (row.rate_type === 'flat') return sum + (row.rate_cents ?? 0)
    if (row.rate_type === 'hourly') return sum + (row.rate_cents ?? 0) * (row.estimated_hours ?? 0)
    // percentage: skip for now (would need event quoted_price to compute)
    return sum
  }, 0)

  const totalOperatingExpensesCents =
    expenseTableCents + laborFromPayrollCents + subcontractCostsCents + processingFeesCents

  const grossProfitCents = totalRevenueCents - purchaseOrdersCents
  const netProfitLossCents = totalRevenueCents - (purchaseOrdersCents + totalOperatingExpensesCents)
  const profitMarginPercent =
    totalRevenueCents > 0 ? Math.round((netProfitLossCents / totalRevenueCents) * 10000) / 100 : 0

  return {
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    revenue: {
      billingRevenueCents,
      commerceRevenueCents,
      salesRevenueCents,
      totalRevenueCents,
    },
    cogs: {
      purchaseOrdersCents,
    },
    operatingExpenses: {
      expenseTableCents,
      laborFromPayrollCents,
      subcontractCostsCents,
      processingFeesCents,
      totalOperatingExpensesCents,
    },
    totals: {
      grossProfitCents,
      netProfitLossCents,
      profitMarginPercent,
    },
  }
}

export async function getDefaultProfitLossWindow() {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)

  const _liso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return {
    startDate: _liso(start),
    endDate: _liso(end),
  }
}
