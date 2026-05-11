'use server'

// Server actions for prep consolidation UI interactions.

import {
  findConsolidationOpportunities,
  getWeeklyPrepPlan,
  type ConsolidationOpportunity,
  type WeeklyPrepPlan,
} from './prep-consolidation'

export type { ConsolidationOpportunity, WeeklyPrepPlan }

/**
 * Get consolidation opportunities for a date range.
 * Called from the prep consolidation page.
 */
export async function getConsolidationOpportunities(
  startDate: string,
  endDate: string
): Promise<{ opportunities: ConsolidationOpportunity[]; error?: string }> {
  if (!startDate || !endDate) {
    return { opportunities: [], error: 'Date range required' }
  }

  if (startDate > endDate) {
    return { opportunities: [], error: 'Start date must be before end date' }
  }

  try {
    const opportunities = await findConsolidationOpportunities({
      start: startDate,
      end: endDate,
    })
    return { opportunities }
  } catch (err: any) {
    console.error('[getConsolidationOpportunities]', err)
    return { opportunities: [], error: 'Failed to find consolidation opportunities' }
  }
}

/**
 * Get the weekly prep plan for a given week.
 */
export async function fetchWeeklyPrepPlan(
  weekStart: string
): Promise<{ plan: WeeklyPrepPlan | null; error?: string }> {
  if (!weekStart) {
    return { plan: null, error: 'Week start date required' }
  }

  try {
    const plan = await getWeeklyPrepPlan(weekStart)
    return { plan }
  } catch (err: any) {
    console.error('[fetchWeeklyPrepPlan]', err)
    return { plan: null, error: 'Failed to generate weekly prep plan' }
  }
}
