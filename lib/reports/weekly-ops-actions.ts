'use server'

// Weekly Ops Summary Server Actions
// Auth-gated, tenant-scoped actions for weekly operations reports.

import { requireChef } from '@/lib/auth/get-user'
import { generateWeeklyOps, type WeeklyOpsReport } from './weekly-ops'

/**
 * Generate a weekly operations summary for a given week.
 * weekStart should be a Monday in YYYY-MM-DD format.
 * If omitted, defaults to the current week's Monday.
 */
export async function getWeeklyOpsReport(
  weekStart?: string
): Promise<{ success: true; report: WeeklyOpsReport } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Default to current week's Monday
  let startDate = weekStart
  if (!startDate) {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.getFullYear(), now.getMonth(), diff)
    startDate = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' }
  }

  try {
    const report = await generateWeeklyOps(tenantId, startDate)
    return { success: true, report }
  } catch (err) {
    console.error('[weekly-ops] generateWeeklyOps failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate weekly ops report',
    }
  }
}
