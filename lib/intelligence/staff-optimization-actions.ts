'use server'

import { optimizeStaffSchedule } from './staff-optimization'
import type { StaffOptimizationReport } from './staff-optimization'

export type { StaffOptimizationReport } from './staff-optimization'
export type {
  StaffConflict,
  SharingOpportunity,
  StaffScheduleEntry,
} from './staff-optimization'

/**
 * Get staff optimization report for a date range.
 * Wraps the core engine with error handling for UI consumption.
 */
export async function getStaffOptimizationReport(
  startDate: string,
  endDate: string
): Promise<{ data: StaffOptimizationReport | null; error: string | null }> {
  try {
    const report = await optimizeStaffSchedule(startDate, endDate)
    return { data: report, error: null }
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Failed to load staff optimization data' }
  }
}
