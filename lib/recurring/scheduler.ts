// Recurring invoice date computation helpers.
// Pure functions, no server actions, no database calls.

import { addDays, addWeeks, addMonths, startOfDay, setDay, setDate, isBefore } from 'date-fns'

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly'

/**
 * Compute the next invoice date given the current schedule parameters.
 *
 * For weekly/biweekly: uses dayOfWeek (0=Sun..6=Sat) as the anchor day.
 * For monthly/quarterly: uses dayOfMonth (1-28) as the anchor day.
 *
 * If no anchor day is provided, advances from currentDate by the frequency interval.
 */
export function computeNextInvoiceDate(
  frequency: RecurringFrequency,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  currentDate: Date
): Date {
  const base = startOfDay(currentDate)

  switch (frequency) {
    case 'weekly': {
      // Advance one week from current date
      const next = addWeeks(base, 1)
      // If anchor day specified, adjust to that day of the week
      if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
        const adjusted = setDay(next, dayOfWeek, { weekStartsOn: 0 })
        // If adjustment moved us backward, add another week
        return isBefore(adjusted, addDays(base, 1)) ? addWeeks(adjusted, 1) : adjusted
      }
      return next
    }

    case 'biweekly': {
      const next = addWeeks(base, 2)
      if (dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6) {
        const adjusted = setDay(next, dayOfWeek, { weekStartsOn: 0 })
        return isBefore(adjusted, addDays(base, 1)) ? addWeeks(adjusted, 2) : adjusted
      }
      return next
    }

    case 'monthly': {
      const next = addMonths(base, 1)
      if (dayOfMonth !== null && dayOfMonth >= 1 && dayOfMonth <= 28) {
        return setDate(next, dayOfMonth)
      }
      return next
    }

    case 'quarterly': {
      const next = addMonths(base, 3)
      if (dayOfMonth !== null && dayOfMonth >= 1 && dayOfMonth <= 28) {
        return setDate(next, dayOfMonth)
      }
      return next
    }

    default:
      return addMonths(base, 1)
  }
}

/**
 * Compute the billing period (start, end) for a given invoice date and frequency.
 *
 * The period ends on the invoice date. The period starts based on frequency:
 * - weekly: 7 days before
 * - biweekly: 14 days before
 * - monthly: ~30 days before (previous month same day)
 * - quarterly: ~90 days before (3 months back)
 */
export function getRecurringPeriod(
  frequency: RecurringFrequency,
  invoiceDate: Date
): { periodStart: Date; periodEnd: Date } {
  const end = startOfDay(invoiceDate)

  switch (frequency) {
    case 'weekly':
      return { periodStart: addDays(end, -6), periodEnd: end }
    case 'biweekly':
      return { periodStart: addDays(end, -13), periodEnd: end }
    case 'monthly':
      return { periodStart: addMonths(end, -1), periodEnd: end }
    case 'quarterly':
      return { periodStart: addMonths(end, -3), periodEnd: end }
    default:
      return { periodStart: addMonths(end, -1), periodEnd: end }
  }
}

/**
 * Compute estimated monthly revenue from a recurring schedule.
 * Returns cents per month.
 */
export function estimateMonthlyRevenue(amountCents: number, frequency: RecurringFrequency): number {
  const multipliers: Record<RecurringFrequency, number> = {
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 0.33,
  }
  return Math.round(amountCents * (multipliers[frequency] || 1))
}

/**
 * Format a frequency for display.
 */
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}
