'use server'

import { optimizeWeeklyTravel } from './travel-optimization'
import type { TravelOptimization } from './travel-optimization'

export type { TravelOptimization } from './travel-optimization'
export type {
  EventCluster,
  ShoppingTrip,
  MileageSavings,
} from './travel-optimization'

/**
 * Get travel optimization report for a week.
 * Wraps the core engine with error handling for UI consumption.
 */
export async function getTravelOptimizationReport(
  weekStart: string
): Promise<{ data: TravelOptimization | null; error: string | null }> {
  try {
    const report = await optimizeWeeklyTravel(weekStart)
    return { data: report, error: null }
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Failed to load travel optimization data' }
  }
}
