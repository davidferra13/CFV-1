// API v2: Financial Summary
// GET /api/v2/financials/summary?event_id=...
//
// Returns computed financial summary from the ledger.
// If event_id is provided, returns per-event summary.
// Otherwise returns tenant-wide totals.

import { withApiAuth, apiSuccess, apiError } from '@/lib/api/v2'

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('event_id')

    if (eventId) {
      // Per-event financial summary from the view
      const { data, error } = await ctx.db
        .from('event_financial_summary' as any)
        .select('*')
        .eq('event_id', eventId)
        .eq('tenant_id', ctx.tenantId)
        .single()

      if (error) {
        // View might not exist or event not found; fall back to manual computation
        const { data: entries } = await ctx.db
          .from('ledger_entries')
          .select('amount_cents, entry_type')
          .eq('event_id', eventId)
          .eq('tenant_id', ctx.tenantId)

        const { data: expenses } = await ctx.db
          .from('expenses')
          .select('amount_cents')
          .eq('event_id', eventId)
          .eq('tenant_id', ctx.tenantId)

        const totalPaid = (entries ?? [])
          .filter((e: any) => ['payment', 'deposit', 'final_payment'].includes(e.entry_type))
          .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

        const totalRefunded = (entries ?? [])
          .filter((e: any) => e.entry_type === 'refund')
          .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

        const totalTips = (entries ?? [])
          .filter((e: any) => e.entry_type === 'tip')
          .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

        const totalExpenses = (expenses ?? []).reduce(
          (sum: number, e: any) => sum + (e.amount_cents ?? 0),
          0
        )

        const netRevenue = totalPaid - totalRefunded
        const profit = netRevenue - totalExpenses

        return apiSuccess({
          event_id: eventId,
          total_paid_cents: totalPaid,
          total_refunded_cents: totalRefunded,
          total_tips_cents: totalTips,
          total_expenses_cents: totalExpenses,
          net_revenue_cents: netRevenue,
          profit_cents: profit,
          profit_margin: netRevenue > 0 ? Math.round((profit / netRevenue) * 10000) / 100 : 0,
        })
      }

      return apiSuccess(data)
    }

    // Tenant-wide summary
    const { data: entries } = await ctx.db
      .from('ledger_entries')
      .select('amount_cents, entry_type')
      .eq('tenant_id', ctx.tenantId)

    const { data: expenses } = await ctx.db
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', ctx.tenantId)

    const totalPaid = (entries ?? [])
      .filter((e: any) => ['payment', 'deposit', 'final_payment'].includes(e.entry_type))
      .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

    const totalRefunded = (entries ?? [])
      .filter((e: any) => e.entry_type === 'refund')
      .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

    const totalTips = (entries ?? [])
      .filter((e: any) => e.entry_type === 'tip')
      .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

    const totalExpenses = (expenses ?? []).reduce(
      (sum: number, e: any) => sum + (e.amount_cents ?? 0),
      0
    )

    const netRevenue = totalPaid - totalRefunded
    const profit = netRevenue - totalExpenses

    return apiSuccess({
      total_paid_cents: totalPaid,
      total_refunded_cents: totalRefunded,
      total_tips_cents: totalTips,
      total_expenses_cents: totalExpenses,
      net_revenue_cents: netRevenue,
      profit_cents: profit,
      profit_margin: netRevenue > 0 ? Math.round((profit / netRevenue) * 10000) / 100 : 0,
    })
  },
  { scopes: ['finance:read'] }
)
