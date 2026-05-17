import 'server-only'

import { createServerClient } from '@/lib/db/server'

export type CannabisClientIntelligence = {
  totalCannabisEvents: number
  completedCannabisEvents: number
  upcomingCannabisEvents: number
  totalCannabisSpendCents: number
  totalCannabisCovers: number
  uniqueGuests: number
  averageGuestCount: number
  firstCannabisEventDate: string | null
  lastCannabisEventDate: string | null
  preferredIntensity: string | null
  returnRate: number | null
}

export async function getCannabisClientIntelligence(
  clientId: string,
  tenantId: string
): Promise<CannabisClientIntelligence> {
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, event_date, guest_count, status, quoted_price_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('cannabis_preference', true)
    .order('event_date', { ascending: true })

  const allEvents = events ?? []
  const completed = allEvents.filter((e: any) => e.status === 'completed')
  const upcoming = allEvents.filter((e: any) => !['completed', 'cancelled'].includes(e.status))

  const totalSpend = completed.reduce((sum: number, e: any) => sum + (e.quoted_price_cents ?? 0), 0)
  const totalCovers = completed.reduce((sum: number, e: any) => sum + (e.guest_count ?? 0), 0)
  const avgGuests = completed.length > 0 ? Math.round(totalCovers / completed.length) : 0

  let uniqueGuests = 0
  if (completed.length > 0) {
    const completedIds = completed.map((e: any) => e.id)
    const { data: guestRows } = await db
      .from('event_guests')
      .select('email')
      .in('event_id', completedIds)

    const uniqueEmails = new Set(
      (guestRows ?? []).map((g: any) => g.email?.toLowerCase()).filter(Boolean)
    )
    uniqueGuests = uniqueEmails.size
  }

  let preferredIntensity: string | null = null
  if (completed.length > 0) {
    const completedIds = completed.map((e: any) => e.id)
    const { data: details } = await db
      .from('cannabis_event_details')
      .select('cannabis_category')
      .in('event_id', completedIds)

    if (details && details.length > 0) {
      const counts: Record<string, number> = {}
      details.forEach((d: any) => {
        counts[d.cannabis_category] = (counts[d.cannabis_category] ?? 0) + 1
      })
      preferredIntensity = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    }
  }

  const returnRate = completed.length >= 2 ? completed.length / allEvents.length : null

  return {
    totalCannabisEvents: allEvents.length,
    completedCannabisEvents: completed.length,
    upcomingCannabisEvents: upcoming.length,
    totalCannabisSpendCents: totalSpend,
    totalCannabisCovers: totalCovers,
    uniqueGuests,
    averageGuestCount: avgGuests,
    firstCannabisEventDate: completed[0]?.event_date ?? null,
    lastCannabisEventDate: completed[completed.length - 1]?.event_date ?? null,
    preferredIntensity,
    returnRate,
  }
}

export type CannabisGuestIntelligence = {
  guestEmail: string
  totalCannabisAttendances: number
  events: Array<{
    eventId: string
    eventDate: string
    participation: string | null
    familiarityLevel: string | null
    doseNote: string | null
    comfortNotes: string | null
  }>
  latestParticipation: string | null
  latestFamiliarity: string | null
  hasAbstained: boolean
}

export async function getCannabisGuestIntelligence(
  guestEmail: string,
  tenantId: string
): Promise<CannabisGuestIntelligence | null> {
  const db: any = createServerClient()

  const { data: guestRows } = await db
    .from('event_guests')
    .select('id, event_id, guest_token, email')
    .eq('tenant_id', tenantId)
    .ilike('email', guestEmail)

  if (!guestRows || guestRows.length === 0) return null

  const cannabisEventIds: string[] = []
  const eventIds = guestRows.map((g: any) => g.event_id)

  const { data: cannabisEvents } = await db
    .from('events')
    .select('id, event_date')
    .in('id', eventIds)
    .eq('cannabis_preference', true)
    .eq('tenant_id', tenantId)

  if (!cannabisEvents || cannabisEvents.length === 0) return null

  const eventDateMap = Object.fromEntries(cannabisEvents.map((e: any) => [e.id, e.event_date]))
  const cannabisGuestTokens = guestRows
    .filter((g: any) => eventDateMap[g.event_id])
    .map((g: any) => g.guest_token)

  const { data: profiles } = await db
    .from('guest_event_profile')
    .select(
      'event_id, guest_token, cannabis_participation, familiarity_level, preferred_dose_note, comfort_notes'
    )
    .eq('tenant_id', tenantId)
    .in('guest_token', cannabisGuestTokens)

  const profileByToken = Object.fromEntries(
    (profiles ?? []).map((p: any) => [`${p.event_id}-${p.guest_token}`, p])
  )

  const eventResults = guestRows
    .filter((g: any) => eventDateMap[g.event_id])
    .map((g: any) => {
      const profile = profileByToken[`${g.event_id}-${g.guest_token}`]
      return {
        eventId: g.event_id,
        eventDate: eventDateMap[g.event_id],
        participation: profile?.cannabis_participation ?? null,
        familiarityLevel: profile?.familiarity_level ?? null,
        doseNote: profile?.preferred_dose_note ?? null,
        comfortNotes: profile?.comfort_notes ?? null,
      }
    })
    .sort((a: any, b: any) => b.eventDate.localeCompare(a.eventDate))

  const latest = eventResults[0]
  const hasAbstained = eventResults.some((e: any) => e.participation === 'not_consume')

  return {
    guestEmail,
    totalCannabisAttendances: eventResults.length,
    events: eventResults,
    latestParticipation: latest?.participation ?? null,
    latestFamiliarity: latest?.familiarityLevel ?? null,
    hasAbstained,
  }
}
