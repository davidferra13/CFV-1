'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getPayrollReportForPeriod } from '@/lib/staffing/actions'

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
  const supabase = createServerClient()

  const [
    ledgerResult,
    commerceResult,
    salesResult,
    commerceSalesLinks,
    poResult,
    expenseResult,
    payroll,
  ] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('entry_type, amount_cents, is_refund')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${parsed.startDate}T00:00:00Z`)
      .lte('created_at', `${parsed.endDate}T23:59:59Z`),
    supabase
      .from('commerce_payments')
      .select('amount_cents, status, sale_id, ledger_entry_id')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${parsed.startDate}T00:00:00Z`)
      .lte('created_at', `${parsed.endDate}T23:59:59Z`)
      .in('status', ['captured', 'settled']),
    supabase
      .from('sales')
      .select('id, total_cents, status')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', `${parsed.startDate}T00:00:00Z`)
      .lte('created_at', `${parsed.endDate}T23:59:59Z`)
      .in('status', ['captured', 'settled', 'partially_refunded']),
    supabase
      .from('commerce_payments')
      .select('sale_id')
      .eq('tenant_id', user.tenantId!)
      .not('sale_id', 'is', null),
    supabase
      .from('purchase_orders')
      .select('status, order_date, received_at, estimated_total_cents, actual_total_cents')
      .eq('chef_id', user.tenantId!)
      .in('status', ['partially_received', 'received'])
      .or(
        `order_date.gte.${parsed.startDate},and(order_date.lte.${parsed.endDate}),received_at.gte.${parsed.startDate}T00:00:00Z,and(received_at.lte.${parsed.endDate}T23:59:59Z)`
      ),
    supabase
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', parsed.startDate)
      .lte('expense_date', parsed.endDate),
    getPayrollReportForPeriod(parsed.startDate, parsed.endDate),
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
    .filter((row) => !row.ledger_entry_id)
    .reduce((sum, row) => sum + (row.amount_cents ?? 0), 0)

  const linkedSaleIds = new Set(
    (commerceSalesLinks.data ?? []).map((row) => row.sale_id).filter(Boolean)
  )
  const salesRevenueCents = (salesResult.data ?? [])
    .filter((row) => !linkedSaleIds.has(row.id))
    .reduce((sum, row) => sum + (row.total_cents ?? 0), 0)

  const totalRevenueCents = billingRevenueCents + commerceRevenueCents + salesRevenueCents

  const purchaseOrdersCents = (poResult.data ?? []).reduce((sum, row) => {
    if (row.actual_total_cents != null) return sum + row.actual_total_cents
    return sum + (row.estimated_total_cents ?? 0)
  }, 0)

  const expenseTableCents = (expenseResult.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  )
  const laborFromPayrollCents = payroll.totalLaborCostCents
  const totalOperatingExpensesCents = expenseTableCents + laborFromPayrollCents

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

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}
