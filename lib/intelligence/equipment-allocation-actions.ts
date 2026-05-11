'use server'

import { checkEquipmentConflicts } from './equipment-allocation'
import type { EquipmentReport } from './equipment-allocation'

export type { EquipmentReport } from './equipment-allocation'
export type {
  EquipmentConflict,
  EquipmentNeed,
  EquipmentAvailability,
} from './equipment-allocation'

/**
 * Get equipment allocation report for a date range.
 * Wraps the core engine with error handling for UI consumption.
 */
export async function getEquipmentAllocationReport(
  startDate: string,
  endDate: string
): Promise<{ data: EquipmentReport | null; error: string | null }> {
  try {
    const report = await checkEquipmentConflicts(startDate, endDate)
    return { data: report, error: null }
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Failed to load equipment allocation data' }
  }
}
