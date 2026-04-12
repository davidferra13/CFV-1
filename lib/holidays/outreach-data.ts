import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getUpcomingHolidays, getHolidayDate } from './upcoming'
import { dateToDateString } from '@/lib/utils/format'
import { type Holiday } from './constants'
import { type HolidayClientMatch, type HolidayOutreachSuggestion } from './outreach-types'

/**
 * Get holiday outreach suggestions for the dashboard.
 * For each upcoming holiday in the next 60 days that is in its outreach window,
 * find clients who booked a similar date in prior years.
 */
export async function getHolidayOutreachSuggestions(): Promise<HolidayOutreachSuggestion[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const upcoming = getUpcomingHolidays({ lookaheadDays: 60, minRelevance: 'medium' })
    .filter((h) => h.inOutreachWindow)
    .slice(0, 5)

  if (upcoming.length === 0) return []

  const _n3y = new Date()
  const threeYearsAgo = new Date(_n3y.getFullYear() - 3, _n3y.getMonth(), _n3y.getDate())

  const { data: pastEvents, error } = await db
    .from('events')
    .select(
      `
      id,
      event_date,
      client_id,
      clients!inner(id, full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .gte(
      'event_date',
      `${threeYearsAgo.getFullYear()}-${String(threeYearsAgo.getMonth() + 1).padStart(2, '0')}-${String(threeYearsAgo.getDate()).padStart(2, '0')}`
    )
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid'])
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getHolidayOutreachSuggestions] Failed to fetch past events:', error)
    return []
  }

  const suggestions: HolidayOutreachSuggestion[] = []
  for (const upcomingHoliday of upcoming) {
    const matches = findClientMatchesForHoliday(upcomingHoliday.holiday, pastEvents ?? [])

    suggestions.push({
      upcoming: {
        holiday: {
          key: upcomingHoliday.holiday.key,
          name: upcomingHoliday.holiday.name,
        },
        date: upcomingHoliday.date.toISOString(),
        daysUntil: upcomingHoliday.daysUntil,
        inOutreachWindow: upcomingHoliday.inOutreachWindow,
        isUrgent: upcomingHoliday.isUrgent,
      },
      pastClients: matches,
      premiumPricing: upcomingHoliday.holiday.premiumPricing,
      outreachHook: upcomingHoliday.holiday.outreachHook,
      menuNotes: upcomingHoliday.holiday.menuNotes,
    })
  }

  return suggestions
}

export async function getHolidayOutreachCount(): Promise<number> {
  const upcoming = getUpcomingHolidays({ lookaheadDays: 60, minRelevance: 'medium' })
  return upcoming.filter((h) => h.inOutreachWindow).length
}

function findClientMatchesForHoliday(holiday: Holiday, pastEvents: any[]): HolidayClientMatch[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const yearsToCheck = [currentYear - 1, currentYear - 2, currentYear - 3]
  const WINDOW_DAYS = 21

  const windows: Array<{ start: Date; end: Date; year: number }> = []
  for (const y of yearsToCheck) {
    const hDate = getHolidayDate(holiday, y)
    if (!hDate) continue
    const start = new Date(hDate)
    start.setDate(start.getDate() - WINDOW_DAYS)
    const end = new Date(hDate)
    end.setDate(end.getDate() + WINDOW_DAYS)
    windows.push({ start, end, year: y })
  }

  if (windows.length === 0) return []

  const clientMap = new Map<string, HolidayClientMatch>()
  for (const event of pastEvents) {
    const eventDate = new Date(event.event_date)
    const inWindow = windows.some((w) => eventDate >= w.start && eventDate <= w.end)
    if (!inWindow) continue

    const clientId = event.client_id
    const clientName = (event.clients as any)?.full_name ?? 'Unknown Client'

    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        clientId,
        clientName,
        lastEventDate: event.event_date,
        totalEvents: 1,
      })
    } else {
      const existing = clientMap.get(clientId)!
      existing.totalEvents += 1
      if (dateToDateString(event.event_date as Date | string) > existing.lastEventDate) {
        existing.lastEventDate = dateToDateString(event.event_date as Date | string)
      }
    }
  }

  return Array.from(clientMap.values()).sort((a, b) => b.totalEvents - a.totalEvents)
}
