'use server'

// Pipeline Revenue Forecast — Expected and best-case revenue from open inquiries + active events.
// Applies probability multipliers per stage to compute expected revenue.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// Probability multipliers by stage
const INQUIRY_PROBABILITY: Record<string, number> = {
  new: 0.15,
  awaiting_response: 0.20,
  awaiting_chef: 0.20,
  awaiting_client: 0.30,
  quoted: 0.45,
  confirmed: 0.90,
}

const EVENT_PROBABILITY: Record<string, number> = {
  draft: 0.30,
  proposed: 0.60,
  accepted: 0.80,
  paid: 0.95,
  confirmed: 0.99,
  in_progress: 1.0,
}

export interface ForecastStage {
  stage: string
  label: string
  count: number
  totalCents: number
  expectedCents: number
  probability: number
}

export interface PipelineRevenueForecast {
  expectedCents: number
  bestCaseCents: number
  stages: ForecastStage[]
  computedAt: string
}

export async function getPipelineRevenueForecast(): Promise<PipelineRevenueForecast> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [inquiriesResult, eventsResult] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id, status, confirmed_budget_cents')
      .eq('tenant_id', user.tenantId!)
      .not('status', 'in', '("declined","expired","converted")'),
    supabase
      .from('events')
      .select('id, status, quoted_price_cents')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress']),
  ])

  const inquiries = inquiriesResult.data ?? []
  const events = eventsResult.data ?? []

  // Aggregate by stage
  const stageMap = new Map<string, { count: number; totalCents: number; probability: number; label: string }>()

  const INQUIRY_LABELS: Record<string, string> = {
    new: 'New Lead',
    awaiting_response: 'Awaiting Response',
    awaiting_chef: 'Awaiting Chef',
    awaiting_client: 'Awaiting Client',
    quoted: 'Quote Sent',
    confirmed: 'Inquiry Confirmed',
  }

  const EVENT_LABELS: Record<string, string> = {
    draft: 'Draft Event',
    proposed: 'Proposed',
    accepted: 'Accepted',
    paid: 'Deposit Paid',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
  }

  for (const inquiry of inquiries) {
    const prob = INQUIRY_PROBABILITY[inquiry.status] ?? 0.10
    const cents = inquiry.confirmed_budget_cents ?? 0
    const key = `inquiry_${inquiry.status}`
    const existing = stageMap.get(key) ?? { count: 0, totalCents: 0, probability: prob, label: INQUIRY_LABELS[inquiry.status] ?? inquiry.status }
    stageMap.set(key, { ...existing, count: existing.count + 1, totalCents: existing.totalCents + cents })
  }

  for (const event of events) {
    const prob = EVENT_PROBABILITY[event.status] ?? 0.50
    const cents = event.quoted_price_cents ?? 0
    const key = `event_${event.status}`
    const existing = stageMap.get(key) ?? { count: 0, totalCents: 0, probability: prob, label: EVENT_LABELS[event.status] ?? event.status }
    stageMap.set(key, { ...existing, count: existing.count + 1, totalCents: existing.totalCents + cents })
  }

  // Order stages by probability ascending (early → late pipeline)
  const STAGE_ORDER = [
    'inquiry_new', 'inquiry_awaiting_response', 'inquiry_awaiting_chef',
    'inquiry_awaiting_client', 'inquiry_quoted', 'inquiry_confirmed',
    'event_draft', 'event_proposed', 'event_accepted',
    'event_paid', 'event_confirmed', 'event_in_progress',
  ]

  const stages: ForecastStage[] = STAGE_ORDER
    .filter(key => stageMap.has(key))
    .map(key => {
      const s = stageMap.get(key)!
      return {
        stage: key,
        label: s.label,
        count: s.count,
        totalCents: s.totalCents,
        expectedCents: Math.round(s.totalCents * s.probability),
        probability: s.probability,
      }
    })

  const expectedCents = stages.reduce((sum, s) => sum + s.expectedCents, 0)
  const bestCaseCents = stages.reduce((sum, s) => sum + s.totalCents, 0)

  return { expectedCents, bestCaseCents, stages, computedAt: new Date().toISOString() }
}
