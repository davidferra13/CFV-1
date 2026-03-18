// Capacity Check - Pure Computation
// No server context, no Supabase calls.
// Can be imported in both server and client contexts.

export type CapacityWarning = {
  type: 'weekly_limit' | 'monthly_limit' | 'consecutive_days' | 'min_rest'
  message: string
  severity: 'warning' | 'info'
}

/**
 * Compare current event counts against the chef's configured limits and
 * return any capacity warnings.
 *
 * @param settings - The chef's configured limits (null means no limit set)
 * @param currentWeekCount - Number of non-cancelled events already booked this week
 * @param currentMonthCount - Number of non-cancelled events already booked this month
 */
export function checkCapacity(
  settings: {
    max_events_per_week?: number | null
    max_events_per_month?: number | null
  },
  currentWeekCount: number,
  currentMonthCount: number
): CapacityWarning[] {
  const warnings: CapacityWarning[] = []

  if (settings.max_events_per_week != null) {
    if (currentWeekCount >= settings.max_events_per_week) {
      warnings.push({
        type: 'weekly_limit',
        message: `Weekly limit reached: ${currentWeekCount} of ${settings.max_events_per_week} events this week.`,
        severity: 'warning',
      })
    } else if (currentWeekCount === settings.max_events_per_week - 1) {
      warnings.push({
        type: 'weekly_limit',
        message: `One slot remaining this week (limit: ${settings.max_events_per_week}).`,
        severity: 'info',
      })
    }
  }

  if (settings.max_events_per_month != null) {
    if (currentMonthCount >= settings.max_events_per_month) {
      warnings.push({
        type: 'monthly_limit',
        message: `Monthly limit reached: ${currentMonthCount} of ${settings.max_events_per_month} events this month.`,
        severity: 'warning',
      })
    } else if (currentMonthCount === settings.max_events_per_month - 1) {
      warnings.push({
        type: 'monthly_limit',
        message: `One slot remaining this month (limit: ${settings.max_events_per_month}).`,
        severity: 'info',
      })
    }
  }

  return warnings
}
