'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExpiringQuote {
  id: string
  clientName: string
  validUntil: string
  totalCents: number
}

export interface PricingModelStat {
  model: 'per_person' | 'flat_rate' | 'custom'
  decided: number
  acceptanceRate: number
}

export interface QuoteAcceptanceInsights {
  status: 'ok' | 'insufficient_data'
  totalSent: number
  acceptanceRate: number
  avgTimeToDaysDecision: number
  avgAcceptedValueCents: number
  avgRejectedValueCents: number
  expiringThisWeek: ExpiringQuote[]
  byPricingModel: PricingModelStat[]
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function getQuoteAcceptanceInsights(): Promise<QuoteAcceptanceInsights> {
  const user = await requireChef()
  const supabase = createServerClient()

  const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, status, total_quoted_cents, pricing_model, sent_at, accepted_at, rejected_at, valid_until, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['sent', 'accepted', 'rejected', 'expired'])
    .gte('sent_at', since90)

  if (error) {
    console.error('[getQuoteAcceptanceInsights]', error)
    return emptyInsights([])
  }

  const all = quotes ?? []

  // Always compute expiring quotes regardless of data volume
  const expiring: ExpiringQuote[] = all
    .filter(q => q.status === 'sent' && q.valid_until && q.valid_until >= today && q.valid_until <= in7Days)
    .map(q => ({
      id: q.id,
      clientName: (q.client as any)?.full_name ?? 'Unknown',
      validUntil: q.valid_until!,
      totalCents: q.total_quoted_cents ?? 0,
    }))

  const decided = all.filter(q => ['accepted', 'rejected', 'expired'].includes(q.status))

  if (decided.length < 3) {
    return { ...emptyInsights(expiring), totalSent: all.length }
  }

  const accepted = decided.filter(q => q.status === 'accepted')
  const rejected = decided.filter(q => q.status !== 'accepted')

  const acceptanceRate = Math.round((accepted.length / decided.length) * 100)

  // Average time-to-decision in days
  let decisionDaysTotal = 0
  let decisionCount = 0
  for (const q of decided) {
    if (!q.sent_at) continue
    const end = q.accepted_at ?? q.rejected_at
    if (!end) continue
    decisionDaysTotal += (new Date(end).getTime() - new Date(q.sent_at).getTime()) / 86_400_000
    decisionCount++
  }
  const avgTimeToDaysDecision = decisionCount > 0
    ? Math.round((decisionDaysTotal / decisionCount) * 10) / 10
    : 0

  const avg = (items: typeof decided) =>
    items.length > 0
      ? Math.round(items.reduce((s, q) => s + (q.total_quoted_cents ?? 0), 0) / items.length)
      : 0

  // By pricing model
  const modelMap = new Map<string, { decided: number; accepted: number }>()
  for (const q of decided) {
    const m = q.pricing_model ?? 'custom'
    const entry = modelMap.get(m) ?? { decided: 0, accepted: 0 }
    entry.decided++
    if (q.status === 'accepted') entry.accepted++
    modelMap.set(m, entry)
  }
  const byPricingModel: PricingModelStat[] = Array.from(modelMap.entries()).map(([model, d]) => ({
    model: model as PricingModelStat['model'],
    decided: d.decided,
    acceptanceRate: d.decided > 0 ? Math.round((d.accepted / d.decided) * 100) : 0,
  }))

  return {
    status: 'ok',
    totalSent: all.length,
    acceptanceRate,
    avgTimeToDaysDecision,
    avgAcceptedValueCents: avg(accepted),
    avgRejectedValueCents: avg(rejected),
    expiringThisWeek: expiring,
    byPricingModel,
  }
}

function emptyInsights(expiring: ExpiringQuote[]): QuoteAcceptanceInsights {
  return {
    status: 'insufficient_data',
    totalSent: 0,
    acceptanceRate: 0,
    avgTimeToDaysDecision: 0,
    avgAcceptedValueCents: 0,
    avgRejectedValueCents: 0,
    expiringThisWeek: expiring,
    byPricingModel: [],
  }
}
