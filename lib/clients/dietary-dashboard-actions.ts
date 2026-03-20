// Client Dietary Dashboard - Server Actions
// Safety-critical: aggregates all allergy/dietary data across a client's household.
// Never hides or minimizes allergen data. If in doubt, show more.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { FDA_BIG_9, COMMON_ALLERGENS } from '@/lib/constants/allergens'
import { z } from 'zod'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuestDietary {
  name: string
  allergies: string[]
  dietaryRestrictions: string[]
  relationship: string
}

export interface HouseholdSummary {
  allAllergens: string[]
  allRestrictions: string[]
  criticalAllergens: string[]
  commonAllergens: string[]
}

export interface RecentEventDietary {
  id: string
  date: string
  menuName: string | null
  hadAllergenConflict: boolean
}

export interface ClientDietaryProfile {
  client: {
    name: string
    allergies: string[]
    dietaryRestrictions: string[]
    dislikes: string[]
  }
  guests: GuestDietary[]
  householdSummary: HouseholdSummary
  recentEvents: RecentEventDietary[]
  lastUpdated: string
}

export interface AllergenMatrixEntry {
  allergen: string
  isBig9: boolean
  members: Record<string, boolean>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const big9Set = new Set(FDA_BIG_9 as readonly string[])
const commonSet = new Set(COMMON_ALLERGENS as readonly string[])

function classifyAllergens(allergens: string[]): {
  critical: string[]
  common: string[]
} {
  const critical: string[] = []
  const common: string[] = []
  for (const a of allergens) {
    if (big9Set.has(a)) {
      critical.push(a)
    } else {
      common.push(a)
    }
  }
  return { critical, common }
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))]
}

function safeArray(val: string[] | null | undefined): string[] {
  return Array.isArray(val) ? val : []
}

// ─── getClientDietaryProfile ─────────────────────────────────────────────────

export async function getClientDietaryProfile(
  clientId: string
): Promise<ClientDietaryProfile | null> {
  const user = await requireChef()
  const supabase: any = await createServerClient()

  // Fetch client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, full_name, allergies, dietary_restrictions, dislikes, updated_at')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) return null

  // Fetch all guests across this client's events (deduplicated by name)
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)

  const eventIds = (events ?? []).map((e: any) => e.id)

  let guests: GuestDietary[] = []

  if (eventIds.length > 0) {
    const { data: guestRows } = await supabase
      .from('event_guests')
      .select(
        'full_name, allergies, dietary_restrictions, plus_one_name, plus_one_allergies, plus_one_dietary'
      )
      .in('event_id', eventIds)
      .eq('tenant_id', user.tenantId!)

    // Deduplicate guests by name, merge their allergens
    const guestMap = new Map<string, { allergies: Set<string>; restrictions: Set<string> }>()

    for (const g of guestRows ?? []) {
      if (g.full_name) {
        const key = g.full_name.toLowerCase().trim()
        if (!guestMap.has(key)) {
          guestMap.set(key, {
            allergies: new Set(),
            restrictions: new Set(),
          })
        }
        const entry = guestMap.get(key)!
        for (const a of safeArray(g.allergies)) entry.allergies.add(a)
        for (const r of safeArray(g.dietary_restrictions)) entry.restrictions.add(r)
      }

      // Plus-one data
      if (g.plus_one_name) {
        const key = g.plus_one_name.toLowerCase().trim()
        if (!guestMap.has(key)) {
          guestMap.set(key, {
            allergies: new Set(),
            restrictions: new Set(),
          })
        }
        const entry = guestMap.get(key)!
        // plus_one_allergies and plus_one_dietary may be string or string[]
        const poAllergies = Array.isArray(g.plus_one_allergies)
          ? g.plus_one_allergies
          : typeof g.plus_one_allergies === 'string' && g.plus_one_allergies
            ? [g.plus_one_allergies]
            : []
        const poDietary = Array.isArray(g.plus_one_dietary)
          ? g.plus_one_dietary
          : typeof g.plus_one_dietary === 'string' && g.plus_one_dietary
            ? [g.plus_one_dietary]
            : []
        for (const a of poAllergies) entry.allergies.add(a)
        for (const r of poDietary) entry.restrictions.add(r)
      }
    }

    // Reconstruct guest list with proper casing from first occurrence
    const nameMap = new Map<string, string>()
    for (const g of guestRows ?? []) {
      if (g.full_name) {
        const key = g.full_name.toLowerCase().trim()
        if (!nameMap.has(key)) nameMap.set(key, g.full_name)
      }
      if (g.plus_one_name) {
        const key = g.plus_one_name.toLowerCase().trim()
        if (!nameMap.has(key)) nameMap.set(key, g.plus_one_name)
      }
    }

    guests = Array.from(guestMap.entries()).map(([key, { allergies, restrictions }]) => ({
      name: nameMap.get(key) ?? key,
      allergies: [...allergies],
      dietaryRestrictions: [...restrictions],
      relationship: 'guest',
    }))
  }

  // Build household summary
  const allAllergens = dedup([
    ...safeArray(client.allergies),
    ...guests.flatMap((g) => g.allergies),
  ])

  const allRestrictions = dedup([
    ...safeArray(client.dietary_restrictions),
    ...guests.flatMap((g) => g.dietaryRestrictions),
  ])

  const { critical: criticalAllergens, common: commonAllergens } = classifyAllergens(allAllergens)

  // Recent events with menu info
  let recentEvents: RecentEventDietary[] = []
  if (eventIds.length > 0) {
    const { data: recentEventRows } = await supabase
      .from('events')
      .select('id, event_date, title')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .order('event_date', { ascending: false })
      .limit(5)

    recentEvents = (recentEventRows ?? []).map((e: any) => ({
      id: e.id,
      date: e.event_date ?? '',
      menuName: e.title ?? null,
      // Conservative: mark as potential conflict if there are household allergens
      // A full cross-reference with menu ingredients would go here in the future
      hadAllergenConflict: false,
    }))
  }

  return {
    client: {
      name: client.full_name ?? '',
      allergies: safeArray(client.allergies),
      dietaryRestrictions: safeArray(client.dietary_restrictions),
      dislikes: safeArray(client.dislikes),
    },
    guests,
    householdSummary: {
      allAllergens,
      allRestrictions,
      criticalAllergens,
      commonAllergens,
    },
    recentEvents,
    lastUpdated: client.updated_at ?? new Date().toISOString(),
  }
}

// ─── updateClientDietary ─────────────────────────────────────────────────────

const UpdateDietarySchema = z.object({
  allergies: z.array(z.string()),
  dietaryRestrictions: z.array(z.string()),
  dislikes: z.array(z.string()),
})

export async function updateClientDietary(
  clientId: string,
  data: { allergies: string[]; dietaryRestrictions: string[]; dislikes: string[] }
) {
  const user = await requireChef()
  const supabase: any = await createServerClient()

  const parsed = UpdateDietarySchema.parse(data)

  const { error } = await supabase
    .from('clients')
    .update({
      allergies: parsed.allergies,
      dietary_restrictions: parsed.dietaryRestrictions,
      dislikes: parsed.dislikes,
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to update dietary info: ${error.message}`)
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

// ─── getHouseholdAllergenMatrix ──────────────────────────────────────────────

export async function getHouseholdAllergenMatrix(clientId: string): Promise<{
  members: string[]
  matrix: AllergenMatrixEntry[]
} | null> {
  const profile = await getClientDietaryProfile(clientId)
  if (!profile) return null

  // Collect all members: client first, then guests
  const members = [profile.client.name, ...profile.guests.map((g) => g.name)]

  // Build per-member allergen sets
  const memberAllergens: Map<string, Set<string>> = new Map()
  memberAllergens.set(profile.client.name, new Set(profile.client.allergies))
  for (const guest of profile.guests) {
    memberAllergens.set(guest.name, new Set(guest.allergies))
  }

  // All allergens across household, Big 9 first then common then others
  const allAllergens = profile.householdSummary.allAllergens
  const big9Items = allAllergens.filter((a) => big9Set.has(a))
  const commonItems = allAllergens.filter((a) => !big9Set.has(a) && commonSet.has(a))
  const otherItems = allAllergens.filter((a) => !big9Set.has(a) && !commonSet.has(a))
  const sortedAllergens = [...big9Items, ...commonItems, ...otherItems]

  const matrix: AllergenMatrixEntry[] = sortedAllergens.map((allergen) => ({
    allergen,
    isBig9: big9Set.has(allergen),
    members: Object.fromEntries(
      members.map((m) => [m, memberAllergens.get(m)?.has(allergen) ?? false])
    ),
  }))

  return { members, matrix }
}
