import { computeRegisterSessionTotals } from '../register-metrics'

export async function assertOpenRegisterSession(ctx: {
  db: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: session, error } = await (ctx.db
    .from('register_sessions' as any)
    .select('id, status')
    .eq('id', ctx.registerSessionId)
    .eq('tenant_id', ctx.tenantId)
    .single() as any)

  if (error || !session) {
    throw new Error('Register session not found')
  }

  if ((session as any).status !== 'open') {
    throw new Error('Register session is not open')
  }
}

export async function isRegisterSessionOpen(ctx: {
  db: any
  tenantId: string
  registerSessionId: string
}): Promise<boolean> {
  const { data: session, error } = await (ctx.db
    .from('register_sessions' as any)
    .select('status')
    .eq('id', ctx.registerSessionId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle() as any)

  if (error || !session) return false
  return String((session as any).status ?? '') === 'open'
}

export async function syncRegisterSessionTotals(ctx: {
  db: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: sales } = await (ctx.db
    .from('sales' as any)
    .select('id, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('register_session_id', ctx.registerSessionId) as any)

  const saleIds = (sales ?? []).map((sale: any) => sale.id).filter(Boolean)

  let payments: any[] = []
  if (saleIds.length > 0) {
    const { data } = await (ctx.db
      .from('commerce_payments' as any)
      .select('sale_id, amount_cents, tip_cents, status')
      .eq('tenant_id', ctx.tenantId)
      .in('sale_id', saleIds) as any)
    payments = data ?? []
  }

  const totals = computeRegisterSessionTotals({
    sales: sales ?? [],
    payments,
  })

  await (ctx.db
    .from('register_sessions' as any)
    .update({
      total_sales_count: totals.totalSalesCount,
      total_revenue_cents: totals.totalRevenueCents,
      total_tips_cents: totals.totalTipsCents,
    } as any)
    .eq('id', ctx.registerSessionId)
    .eq('tenant_id', ctx.tenantId) as any)
}
