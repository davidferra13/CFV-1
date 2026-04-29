'use server'

import { getUnifiedCalendar } from '@/lib/calendar/actions'
import { getSchedulingGaps } from '@/lib/scheduling/prep-block-actions'
import { summarizeCalendarHealth } from '@/lib/calendar/conflict-engine'

export async function getCalendarHealth(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Invalid calendar range')
  }

  const [items, prepGaps] = await Promise.all([
    getUnifiedCalendar(startDate, endDate),
    getSchedulingGaps(),
  ])

  return summarizeCalendarHealth(items, prepGaps)
}
