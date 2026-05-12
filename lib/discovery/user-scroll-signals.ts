import {
  normalizePreferenceToken,
  rankDiscoveryInteractionPreferences,
  type DiscoveryInteractionSignalRow,
  type RankedDiscoveryPreference,
} from '@/lib/discovery/discovery-preference-ranking'
import { createAdminClient } from '@/lib/db/admin'
import { getAccountLocation } from '@/lib/location/account-location'

const DISCOVERY_INTERACTION_LOOKBACK_DAYS = 365
const MAX_DISCOVERY_INTERACTION_ROWS = 300
const MIN_POSITIVE_BOOST_SCORE = 0.05

export type { DiscoveryInteractionSignalRow, RankedDiscoveryPreference }

export type UserScrollSignals = {
  /** Canonical cuisine values from prior inquiry activity, max 3. */
  boostedCuisines: string[]
  /** Canonical service type values, max 2. e.g. ['private_dinner', 'meal_prep'] */
  boostedServiceTypes: string[]
  /** Learned discovery preferences ranked across all discovery item_type/item_value pairs. */
  rankedPreferences: RankedDiscoveryPreference[]
  /** Same ranked preferences grouped by discovery item_type for consumers that need a specific rail. */
  rankedPreferencesByType: Record<string, RankedDiscoveryPreference[]>
  /** Explicitly negative learned items from less-like-this/hide feedback. */
  suppressedItems: Array<Pick<RankedDiscoveryPreference, 'itemType' | 'itemValue' | 'score'>>
  /** User's saved default location, for pre-populating location context. */
  savedLocation: {
    location: string
    lat: number | null
    lng: number | null
    radiusMiles: number
  } | null
  /** True if any preference signals were found. False means no personalization to apply. */
  hasHistory: boolean
}

/**
 * Load authenticated user's personalization signals for the homepage discovery scroll.
 * Always returns null on error: the scroll degrades gracefully to anonymous behavior.
 * Not cached: user-specific, called inside the server component.
 */
export async function getUserScrollSignals(
  authUserId: string | null
): Promise<UserScrollSignals | null> {
  if (!authUserId) return null

  try {
    const db = createAdminClient() as any

    const [inquiryCuisines, passportServiceTypes, rankedPreferences, accountLocation] =
      await Promise.all([
        deriveBoostedCuisines(db, authUserId).catch(() => [] as string[]),
        deriveBoostedServiceTypes(db, authUserId).catch(() => [] as string[]),
        deriveRankedDiscoveryPreferences(db, authUserId).catch(
          () => [] as RankedDiscoveryPreference[]
        ),
        getAccountLocation(authUserId).catch(() => null),
      ])

    const rankedPreferencesByType = groupRankedPreferencesByType(rankedPreferences)
    const boostedCuisines = mergeBoostedPreferenceValues(
      rankedPreferencesByType.cuisine ?? [],
      inquiryCuisines,
      3
    )
    const boostedServiceTypes = mergeBoostedPreferenceValues(
      rankedPreferencesByType.service ?? [],
      passportServiceTypes,
      2
    )
    const hasHistory =
      boostedCuisines.length > 0 || boostedServiceTypes.length > 0 || rankedPreferences.length > 0

    return {
      boostedCuisines,
      boostedServiceTypes,
      rankedPreferences,
      rankedPreferencesByType,
      suppressedItems: rankedPreferences
        .filter((preference) => preference.score <= -2)
        .slice(0, 20)
        .map((preference) => ({
          itemType: preference.itemType,
          itemValue: preference.itemValue,
          score: preference.score,
        })),
      savedLocation: accountLocation
        ? {
            location: formatLocation(
              accountLocation.city,
              accountLocation.state,
              accountLocation.zip
            ),
            lat: accountLocation.lat,
            lng: accountLocation.lng,
            radiusMiles: accountLocation.radiusMiles,
          }
        : null,
      hasHistory,
    }
  } catch {
    return null
  }
}

async function deriveRankedDiscoveryPreferences(
  db: any,
  authUserId: string
): Promise<RankedDiscoveryPreference[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DISCOVERY_INTERACTION_LOOKBACK_DAYS)

  const { data, error } = await db
    .from('discovery_interactions')
    .select('item_type,item_value,action,created_at')
    .eq('auth_user_id', authUserId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(MAX_DISCOVERY_INTERACTION_ROWS)

  if (error || !data?.length) return []

  return rankDiscoveryInteractionPreferences(data as DiscoveryInteractionSignalRow[])
}

function groupRankedPreferencesByType(
  rankedPreferences: RankedDiscoveryPreference[]
): Record<string, RankedDiscoveryPreference[]> {
  const grouped: Record<string, RankedDiscoveryPreference[]> = {}

  for (const preference of rankedPreferences) {
    grouped[preference.itemType] ??= []
    grouped[preference.itemType].push(preference)
  }

  return grouped
}

function mergeBoostedPreferenceValues(
  learnedPreferences: RankedDiscoveryPreference[],
  fallbackValues: string[],
  maxCount: number
): string[] {
  const blockedValues = new Set(
    learnedPreferences
      .filter((preference) => preference.score < -MIN_POSITIVE_BOOST_SCORE)
      .map((preference) => preference.itemValue)
  )
  const values: string[] = []
  const seen = new Set<string>()

  for (const preference of learnedPreferences) {
    if (preference.score <= MIN_POSITIVE_BOOST_SCORE) continue
    addBoostedValue(values, seen, blockedValues, preference.itemValue, maxCount)
  }

  for (const value of fallbackValues) {
    addBoostedValue(values, seen, blockedValues, value, maxCount)
  }

  return values
}

function addBoostedValue(
  values: string[],
  seen: Set<string>,
  blockedValues: Set<string>,
  value: string,
  maxCount: number
): void {
  if (values.length >= maxCount) return

  const normalized = normalizePreferenceToken(value)
  if (!normalized || blockedValues.has(normalized) || seen.has(normalized)) return

  seen.add(normalized)
  values.push(normalized)
}

/**
 * Derive cuisine preferences from the chefs this user has submitted inquiries to.
 * Join chain: clients.auth_user_id -> inquiries.client_id -> inquiries.tenant_id (= chef_id)
 *             -> chef_marketplace_profiles.cuisine_types
 * Returns top 3 cuisines by frequency, empty array if none found.
 */
async function deriveBoostedCuisines(db: any, authUserId: string): Promise<string[]> {
  const { data: clientRow, error: clientErr } = await db
    .from('clients')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  if (clientErr || !clientRow?.id) return []

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  const { data: inquiries, error: inqErr } = await db
    .from('inquiries')
    .select('tenant_id')
    .eq('client_id', clientRow.id)
    .gte('created_at', cutoff.toISOString())
    .limit(50)

  if (inqErr || !inquiries?.length) return []

  const chefIds = [...new Set((inquiries as { tenant_id: string }[]).map((r) => r.tenant_id))]
  if (chefIds.length === 0) return []

  const { data: profiles, error: profErr } = await db
    .from('chef_marketplace_profiles')
    .select('cuisine_types')
    .in('chef_id', chefIds)

  if (profErr || !profiles?.length) return []

  const freq = new Map<string, number>()
  for (const p of profiles as { cuisine_types: string[] | null }[]) {
    for (const c of p.cuisine_types ?? []) {
      const cuisine = normalizePreferenceToken(c)
      if (cuisine) freq.set(cuisine, (freq.get(cuisine) ?? 0) + 1)
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine)
}

/**
 * Map the user's client passport service_style to canonical SERVICE_POOL hrefs.
 * Join chain: hub_guest_profiles.auth_user_id -> client_passports.profile_id
 */
async function deriveBoostedServiceTypes(db: any, authUserId: string): Promise<string[]> {
  const { data: profile, error } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single()

  if (error || !profile?.id) return []

  const { data: passport, error: passErr } = await db
    .from('client_passports')
    .select('service_style')
    .eq('profile_id', profile.id)
    .single()

  if (passErr || !passport?.service_style || passport.service_style === 'no_preference') return []

  const styleToServiceType: Record<string, string> = {
    formal_plated: 'private_dinner',
    tasting_menu: 'private_dinner',
    cocktail: 'private_dinner',
    family_style: 'catering',
    buffet: 'catering',
  }

  const mapped = styleToServiceType[passport.service_style]
  return mapped ? [mapped] : []
}

function formatLocation(city: string | null, state: string | null, zip: string): string {
  if (city && state) return `${city}, ${state}`
  if (city) return city
  return zip
}
