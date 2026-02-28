// Pipeline & Funnel Forecast Actions
// Weighted revenue forecast from active pipeline events and conversion funnel metrics.
// Uses existing tables: events, inquiries, quotes.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// --- Types ---

export type PipelineStage = {
  status: string
  eventCount: number
  totalValueCents: number
  weight: number
  weightedValueCents: number
}

export type PipelineRevenueForecast = {
  stages: PipelineStage[]
  totalWeightedForecastCents: number
  totalUnweightedPipelineCents: number
}

export type FunnelStageMetric = {
  stage: string
  count: number
  conversionRate: number | null // null for the first stage
}

export type FunnelMetrics = {
  stages: FunnelStageMetric[]
  overallConversionRate: number
  startDate: string
  endDate: string
}

// --- Zod Schemas ---

const GetFunnelMetricsSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

// --- Pipeline Stage Weights ---

const PIPELINE_WEIGHTS: Record<string, number> = {
  proposed: 0.25,
  accepted: 0.5,
  paid: 0.9,
  confirmed: 0.95,
}

// --- Actions ---

/**
 * Get weighted revenue forecast from the active pipeline.
 * Weights: proposed = 25%, accepted = 50%, paid = 90%, confirmed = 95%.
 * Draft and terminal states (completed, cancelled) are excluded.
 */
export async function getPipelineRevenueForecast(): Promise<PipelineRevenueForecast> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all active pipeline events (not draft, not terminal)
  const { data: events } = await supabase
    .from('events')
    .select('id, status, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['proposed', 'accepted', 'paid', 'confirmed'])

  const pipelineEvents = events || []

  // Group by status
  const stageMap = new Map<string, { count: number; totalCents: number }>()
  for (const event of pipelineEvents) {
    const existing = stageMap.get(event.status) || { count: 0, totalCents: 0 }
    existing.count += 1
    existing.totalCents += event.quoted_price_cents || 0
    stageMap.set(event.status, existing)
  }

  // Build stages in pipeline order
  const stageOrder = ['proposed', 'accepted', 'paid', 'confirmed']
  const stages: PipelineStage[] = stageOrder.map((status) => {
    const data = stageMap.get(status) || { count: 0, totalCents: 0 }
    const weight = PIPELINE_WEIGHTS[status] || 0
    return {
      status,
      eventCount: data.count,
      totalValueCents: data.totalCents,
      weight,
      weightedValueCents: Math.round(data.totalCents * weight),
    }
  })

  const totalWeightedForecastCents = stages.reduce((sum, s) => sum + s.weightedValueCents, 0)
  const totalUnweightedPipelineCents = stages.reduce((sum, s) => sum + s.totalValueCents, 0)

  return {
    stages,
    totalWeightedForecastCents,
    totalUnweightedPipelineCents,
  }
}

/**
 * Get funnel metrics with conversion rates at each stage.
 * Stages: inquiry -> quote -> accepted -> paid -> completed.
 * Defaults to current calendar year if no date range provided.
 */
export async function getFunnelMetrics(
  startDate?: string,
  endDate?: string
): Promise<FunnelMetrics> {
  const validated = GetFunnelMetricsSchema.parse({ startDate, endDate })

  const user = await requireChef()
  const supabase: any = createServerClient()

  // Default to current calendar year
  const now = new Date()
  const effectiveStart = validated.startDate ?? `${now.getFullYear()}-01-01`
  const effectiveEnd = validated.endDate ?? `${now.getFullYear()}-12-31`

  // Stage 1: Total inquiries in the period
  const { count: inquiryCount } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', effectiveStart)
    .lte('created_at', effectiveEnd + 'T23:59:59')

  // Stage 2: Quotes sent (events created beyond draft during the period)
  // An event that has progressed past draft had a quote sent
  const { data: periodEvents } = await supabase
    .from('events')
    .select('id, status')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', effectiveStart)
    .lte('created_at', effectiveEnd + 'T23:59:59')

  const allEvents = periodEvents || []

  // Count events that reached at least each stage
  // FSM order: draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed
  const quoteSent = allEvents.filter((e: any) =>
    ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed'].includes(e.status)
  ).length

  const accepted = allEvents.filter((e: any) =>
    ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'].includes(e.status)
  ).length

  const paid = allEvents.filter((e: any) =>
    ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status)
  ).length

  const completed = allEvents.filter((e: any) => e.status === 'completed').length

  const totalInquiries = inquiryCount ?? 0

  // Build funnel stages with conversion rates
  const stages: FunnelStageMetric[] = [
    {
      stage: 'Inquiries',
      count: totalInquiries,
      conversionRate: null, // first stage has no conversion rate
    },
    {
      stage: 'Quotes Sent',
      count: quoteSent,
      conversionRate:
        totalInquiries > 0 ? parseFloat(((quoteSent / totalInquiries) * 100).toFixed(1)) : 0,
    },
    {
      stage: 'Accepted',
      count: accepted,
      conversionRate: quoteSent > 0 ? parseFloat(((accepted / quoteSent) * 100).toFixed(1)) : 0,
    },
    {
      stage: 'Paid',
      count: paid,
      conversionRate: accepted > 0 ? parseFloat(((paid / accepted) * 100).toFixed(1)) : 0,
    },
    {
      stage: 'Completed',
      count: completed,
      conversionRate: paid > 0 ? parseFloat(((completed / paid) * 100).toFixed(1)) : 0,
    },
  ]

  // Overall conversion: completed / inquiries
  const overallConversionRate =
    totalInquiries > 0 ? parseFloat(((completed / totalInquiries) * 100).toFixed(1)) : 0

  return {
    stages,
    overallConversionRate,
    startDate: effectiveStart,
    endDate: effectiveEnd,
  }
}
