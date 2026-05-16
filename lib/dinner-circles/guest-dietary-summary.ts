'use server'

import { createServerClient } from '@/lib/db/server'

export type GuestDietaryEntry = {
  name: string
  restrictions: string[]
  allergies: string[]
  hasResponded: boolean
}

export type DietarySummaryCounts = {
  allergies: number
  vegetarian: number
  vegan: number
  glutenFree: number
  noRestrictions: number
  other: number
}

export type GuestDietarySummary = {
  total: number
  responded: number
  summary: DietarySummaryCounts
  guests: GuestDietaryEntry[]
}

const VEGETARIAN_KEYWORDS = ['vegetarian', 'veggie', 'no meat']
const VEGAN_KEYWORDS = ['vegan', 'plant-based', 'plant based']
const GLUTEN_FREE_KEYWORDS = ['gluten-free', 'gluten free', 'celiac', 'coeliac']

function matchesCategory(items: string[], keywords: string[]): boolean {
  return items.some((item) => {
    const lower = item.toLowerCase()
    return keywords.some((kw) => lower.includes(kw))
  })
}

/**
 * Aggregate dietary data from event_guests for a given event.
 * Works with admin client (no auth required) for use in client portal context.
 */
export async function getGuestDietarySummaryForEvent(
  eventId: string,
  tenantId: string
): Promise<GuestDietarySummary> {
  const db: any = createServerClient({ admin: true })

  const { data: guests } = await db
    .from('event_guests')
    .select('full_name, dietary_restrictions, allergies, rsvp_status')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  const guestRows = (guests ?? []) as Array<{
    full_name: string
    dietary_restrictions: string[] | null
    allergies: string[] | null
    rsvp_status: string
  }>

  const total = guestRows.length
  const entries: GuestDietaryEntry[] = []
  const counts: DietarySummaryCounts = {
    allergies: 0,
    vegetarian: 0,
    vegan: 0,
    glutenFree: 0,
    noRestrictions: 0,
    other: 0,
  }

  let responded = 0

  for (const guest of guestRows) {
    const restrictions = guest.dietary_restrictions ?? []
    const allergies = guest.allergies ?? []
    const hasAnyInfo = restrictions.length > 0 || allergies.length > 0
    const hasResponded = guest.rsvp_status !== 'pending'

    if (hasResponded) responded++

    entries.push({
      name: guest.full_name,
      restrictions,
      allergies,
      hasResponded,
    })

    if (allergies.length > 0) counts.allergies++
    if (matchesCategory(restrictions, VEGAN_KEYWORDS)) counts.vegan++
    else if (matchesCategory(restrictions, VEGETARIAN_KEYWORDS)) counts.vegetarian++
    if (matchesCategory(restrictions, GLUTEN_FREE_KEYWORDS)) counts.glutenFree++

    if (!hasAnyInfo && hasResponded) {
      counts.noRestrictions++
    } else if (
      hasAnyInfo &&
      !matchesCategory(restrictions, [
        ...VEGETARIAN_KEYWORDS,
        ...VEGAN_KEYWORDS,
        ...GLUTEN_FREE_KEYWORDS,
      ]) &&
      allergies.length === 0
    ) {
      counts.other++
    }
  }

  return { total, responded, summary: counts, guests: entries }
}

/**
 * Get the share token for an event's active share link.
 * Returns null if no active share exists.
 */
export async function getEventShareToken(
  eventId: string,
  tenantId: string
): Promise<string | null> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('event_shares')
    .select('token')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.token ?? null
}
