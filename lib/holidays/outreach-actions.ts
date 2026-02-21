'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getUpcomingHolidays, getHolidayDate, type UpcomingHoliday } from './upcoming'
import { type Holiday } from './constants'
import { sendDirectOutreach } from '@/lib/marketing/actions'
import { createVoucherOrGiftCard } from '@/lib/loyalty/voucher-actions'

export interface HolidayClientMatch {
  clientId: string
  clientName: string
  /** Date of the event they had near this holiday last year */
  lastEventDate: string
  /** How many events this client has had total */
  totalEvents: number
}

export interface HolidayOutreachSuggestion {
  upcoming: UpcomingHoliday
  /** Clients who had an event near this holiday in a prior year */
  pastClients: HolidayClientMatch[]
  /** Whether this holiday warrants premium pricing */
  premiumPricing: boolean
  /** Ready-to-edit outreach message hook */
  outreachHook: string
  /** Menu idea for this holiday */
  menuNotes: string
}

/**
 * Get holiday outreach suggestions for the dashboard.
 * For each upcoming holiday in the next 60 days that is in its outreach window,
 * find clients who booked a similar date in prior years.
 */
export async function getHolidayOutreachSuggestions(): Promise<HolidayOutreachSuggestion[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const upcoming = getUpcomingHolidays({ lookaheadDays: 60, minRelevance: 'medium' })
    .filter((h) => h.inOutreachWindow)
    .slice(0, 5) // Cap at 5 to keep the panel focused

  if (upcoming.length === 0) return []

  // Fetch all past events for this chef (last 3 years) with client info
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const { data: pastEvents, error } = await supabase
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
    .gte('event_date', threeYearsAgo.toISOString().slice(0, 10))
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
      upcoming: upcomingHoliday,
      pastClients: matches,
      premiumPricing: upcomingHoliday.holiday.premiumPricing,
      outreachHook: upcomingHoliday.holiday.outreachHook,
      menuNotes: upcomingHoliday.holiday.menuNotes,
    })
  }

  return suggestions
}

/**
 * Find clients whose past events fell within ±21 days of this holiday
 * in any of the past 3 years.
 */
function findClientMatchesForHoliday(
  holiday: Holiday,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pastEvents: any[]
): HolidayClientMatch[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const yearsToCheck = [currentYear - 1, currentYear - 2, currentYear - 3]
  const WINDOW_DAYS = 21

  // Build holiday date windows for past years
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

  // Map clientId → match info
  const clientMap = new Map<string, HolidayClientMatch>()

  for (const event of pastEvents) {
    const eventDate = new Date(event.event_date)
    const inWindow = windows.some((w) => eventDate >= w.start && eventDate <= w.end)
    if (!inWindow) continue

    const clientId = event.client_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // Keep the most recent date
      if (event.event_date > existing.lastEventDate) {
        existing.lastEventDate = event.event_date
      }
    }
  }

  // Sort by clients with most repeat events first (most loyal = most likely to rebook)
  return Array.from(clientMap.values()).sort((a, b) => b.totalEvents - a.totalEvents)
}

/**
 * Get a summary count: how many holidays are in active outreach windows right now.
 * Used for dashboard badge/notification dot.
 */
export async function getHolidayOutreachCount(): Promise<number> {
  const upcoming = getUpcomingHolidays({ lookaheadDays: 60, minRelevance: 'medium' })
  return upcoming.filter((h) => h.inOutreachWindow).length
}

/**
 * Send a one-click holiday outreach message to a specific client.
 * Wraps sendDirectOutreach and logs to direct_outreach_log.
 */
export async function sendHolidayOutreachToClient(input: {
  clientId: string
  body: string
  holidayName: string
  channel: 'email' | 'sms'
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendDirectOutreach({
      clientId: input.clientId,
      channel: input.channel,
      subject: `${input.holidayName} — a note from your chef`,
      body: input.body,
    })
    return { ok: true }
  } catch (err) {
    console.error('[sendHolidayOutreachToClient]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' }
  }
}

/**
 * Create a holiday promo code (discount voucher) that can be shared with clients.
 * Returns the normalized code on success.
 */
export async function createHolidayPromoCode(input: {
  holidayName: string
  code: string
  discountPercent?: number
  amountCents?: number
  maxRedemptions: number
  expiresAt: string
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  try {
    if (!input.discountPercent && !input.amountCents) {
      return { ok: false, error: 'Provide either a discount % or a fixed dollar amount' }
    }

    const result = await createVoucherOrGiftCard({
      type: 'voucher',
      title: `${input.holidayName} Promo`,
      code: input.code,
      discount_percent: input.discountPercent,
      amount_cents: input.amountCents,
      max_redemptions: input.maxRedemptions,
      expires_at: input.expiresAt,
      target_client_id: null, // open to any client
    })

    return { ok: true, code: result.incentive.code }
  } catch (err) {
    console.error('[createHolidayPromoCode]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Could not create promo code' }
  }
}
