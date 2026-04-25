'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface PipelineFinancials {
  [eventId: string]: {
    quotedPriceCents: number
    totalPaidCents: number
    profitCents: number
  }
}

export interface WorkloadSummary {
  thisWeekCount: number
  nextWeekCount: number
  maxPerWeek: number | null
}

export interface CirclePipelineStats {
  financials: PipelineFinancials
  workload: WorkloadSummary
}

// â”€â”€ Main Function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Get pipeline stats for the circles page: financial overlay + workload.
 * Called from the circles page server component.
 *
 * @param eventIds - event IDs extracted from circles that have linked events
 */
export async function getCirclePipelineStats(eventIds: string[]): Promise<CirclePipelineStats> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Batch financial query via event_financial_summary view
  const financials: PipelineFinancials = {}
  if (eventIds.length > 0) {
    try {
      const { data } = await db
        .from('event_financial_summary')
        .select('event_id, quoted_price_cents, total_paid_cents, profit_cents')
        .in('event_id', eventIds)
        .eq('tenant_id', tenantId)

      for (const row of data ?? []) {
        financials[row.event_id] = {
          quotedPriceCents: row.quoted_price_cents ?? 0,
          totalPaidCents: row.total_paid_cents ?? 0,
          profitCents: row.profit_cents ?? 0,
        }
      }
    } catch (err) {
      console.error('[circle-pipeline-stats] Financial query failed', err)
      // Non-blocking: pipeline still works without financial data
    }
  }

  // 2. Workload: count ALL booked events this week and next week
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfNextWeek = new Date(startOfWeek)
  endOfNextWeek.setDate(startOfWeek.getDate() + 14)

  const startOfNextWeek = new Date(startOfWeek)
  startOfNextWeek.setDate(startOfWeek.getDate() + 7)

  let thisWeekCount = 0
  let nextWeekCount = 0

  try {
    const { data: upcomingEvents } = await db
      .from('events')
      .select('event_date')
      .eq('tenant_id', tenantId)
      .gte('event_date', startOfWeek.toISOString().split('T')[0])
      .lt('event_date', endOfNextWeek.toISOString().split('T')[0])
      .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])

    for (const evt of upcomingEvents ?? []) {
      const d = new Date(evt.event_date)
      if (d < startOfNextWeek) thisWeekCount++
      else nextWeekCount++
    }
  } catch (err) {
    console.error('[circle-pipeline-stats] Workload query failed', err)
  }

  // 3. Get scheduling rules for capacity limit
  let maxPerWeek: number | null = null
  try {
    const { data: rules } = await db
      .from('chef_scheduling_rules')
      .select('max_events_per_week')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    maxPerWeek = rules?.max_events_per_week ?? null
  } catch {
    // Table may not exist for this chef yet, that is fine
  }

  return {
    financials,
    workload: {
      thisWeekCount,
      nextWeekCount,
      maxPerWeek,
    },
  }
}
