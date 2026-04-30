'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/db/admin'
import {
  buildDirectoryWaitlistLocation,
  DEFAULT_DIRECTORY_WAITLIST_SOURCE,
  isDirectoryWaitlistSweepEligible,
  NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
  NEARBY_NO_RESULTS_WAITLIST_SOURCE,
  normalizeDirectoryWaitlistSource,
} from '@/lib/directory/waitlist-shared'
import { BUSINESS_TYPES, CUISINE_CATEGORIES, normalizeUsStateCode } from '@/lib/discover/constants'
import {
  buildNearbySavedSearchSnapshot,
  buildNearbySavedSearchSummary,
  normalizeNearbySavedSearch,
} from '@/lib/discover/nearby-saved-search'
import { sendEmail } from '@/lib/email/send'
import { checkRateLimit } from '@/lib/rateLimit'

const DIRECTORY_WAITLIST_ENTRY_SOURCES: Set<string> = new Set([
  DEFAULT_DIRECTORY_WAITLIST_SOURCE,
  NEARBY_LOW_DENSITY_WAITLIST_SOURCE,
  NEARBY_NO_RESULTS_WAITLIST_SOURCE,
])

const DIRECTORY_WAITLIST_BUSINESS_TYPES: Set<string> = new Set(
  BUSINESS_TYPES.map((type) => type.value)
)
const DIRECTORY_WAITLIST_CUISINES: Set<string> = new Set(
  CUISINE_CATEGORIES.map((cuisine) => cuisine.value)
)

function cleanText(value?: string | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function isNearbySavedSearchSource(source?: string | null) {
  const normalized = normalizeDirectoryWaitlistSource(source)
  return (
    normalized === NEARBY_LOW_DENSITY_WAITLIST_SOURCE ||
    normalized === NEARBY_NO_RESULTS_WAITLIST_SOURCE
  )
}

async function saveDirectoryWaitlistEntry(input: {
  email: string
  location: string
  source?: string | null
  city?: string | null
  state?: string | null
  businessType?: string | null
  cuisine?: string | null
  notes?: string | null
  searchQuery?: string | null
  locationQuery?: string | null
  locationLabel?: string | null
  radiusMiles?: number | null
  userLat?: number | null
  userLon?: number | null
  baselineMatchCount?: number | null
  savedSearchKey?: string | null
  filterSnapshot?: Record<string, unknown> | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createAdminClient()
    const source = normalizeDirectoryWaitlistSource(input.source)
    const nowIso = new Date().toISOString()
    const payload = {
      email: input.email,
      location: input.location,
      source,
      city: input.city ?? null,
      state: input.state ?? null,
      business_type: input.businessType ?? null,
      cuisine: input.cuisine ?? null,
      notes: input.notes ?? null,
      search_query: input.searchQuery ?? null,
      location_query: input.locationQuery ?? null,
      location_label: input.locationLabel ?? null,
      radius_miles: input.radiusMiles ?? null,
      user_lat: input.userLat ?? null,
      user_lon: input.userLon ?? null,
      baseline_match_count: input.baselineMatchCount ?? null,
      saved_search_key: input.savedSearchKey ?? null,
      filter_snapshot: input.filterSnapshot ?? null,
      notified_at: null,
      updated_at: nowIso,
    }

    if (input.savedSearchKey) {
      const { data: existingSavedSearch, error: existingSavedSearchError } = await db
        .from('directory_waitlist')
        .select('id')
        .eq('email', input.email)
        .eq('saved_search_key', input.savedSearchKey)
        .maybeSingle()

      if (existingSavedSearchError) throw existingSavedSearchError

      if (existingSavedSearch?.id) {
        const { error: updateError } = await db
          .from('directory_waitlist')
          .update(payload)
          .eq('id', existingSavedSearch.id)

        if (updateError) throw updateError
        return { success: true }
      }

      const { error: insertError } = await db.from('directory_waitlist').insert({
        ...payload,
        created_at: nowIso,
      })

      if (insertError) throw insertError
      return { success: true }
    }

    let existingEntry: { id: string } | null = null
    if (source === DEFAULT_DIRECTORY_WAITLIST_SOURCE) {
      const [defaultEntry, legacyEntry] = await Promise.all([
        db
          .from('directory_waitlist')
          .select('id')
          .eq('email', input.email)
          .eq('location', input.location)
          .eq('source', source)
          .maybeSingle(),
        db
          .from('directory_waitlist')
          .select('id')
          .eq('email', input.email)
          .eq('location', input.location)
          .is('source', null)
          .maybeSingle(),
      ])

      if (defaultEntry.error) throw defaultEntry.error
      if (legacyEntry.error) throw legacyEntry.error
      existingEntry = ((defaultEntry.data || legacyEntry.data) ?? null) as { id: string } | null
    } else {
      const { data, error: existingEntryError } = await db
        .from('directory_waitlist')
        .select('id')
        .eq('email', input.email)
        .eq('location', input.location)
        .eq('source', source)
        .maybeSingle()

      if (existingEntryError) throw existingEntryError
      existingEntry = (data ?? null) as { id: string } | null
    }

    if (existingEntry?.id) {
      const { error: updateError } = await db
        .from('directory_waitlist')
        .update(payload)
        .eq('id', existingEntry.id)

      if (updateError) throw updateError
    } else {
      const { error: insertError } = await db.from('directory_waitlist').insert({
        ...payload,
        created_at: nowIso,
      })

      if (insertError) throw insertError
    }

    return { success: true }
  } catch (err: any) {
    console.error('[directory-waitlist] Failed to save:', err)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Public action: save an email + location to the directory waitlist.
 * Called when a consumer searches /chefs and gets zero results.
 * No auth required (public surface).
 */
export async function joinDirectoryWaitlist(
  email: string,
  location: string,
  honeypot?: string
): Promise<{ success: boolean; error?: string }> {
  // Honeypot check: if a bot fills in the hidden field, silently succeed
  if (honeypot) {
    return { success: true }
  }

  const trimmedEmail = email.trim().toLowerCase()
  const trimmedLocation = location.trim()

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }
  if (!trimmedLocation || trimmedLocation.length < 2) {
    return { success: false, error: 'Please enter a location.' }
  }
  if (trimmedEmail.length > 320 || trimmedLocation.length > 300) {
    return { success: false, error: 'Input too long.' }
  }

  // Rate limit: 5 per 10 minutes per IP, 3 per hour per email
  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown'
  try {
    await checkRateLimit(`waitlist-ip:${ip}`, 5, 10 * 60_000)
    await checkRateLimit(`waitlist-email:${trimmedEmail}`, 3, 60 * 60_000)
  } catch {
    return { success: false, error: 'Too many attempts. Please try again later.' }
  }

  return saveDirectoryWaitlistEntry({
    email: trimmedEmail,
    location: trimmedLocation,
    source: DEFAULT_DIRECTORY_WAITLIST_SOURCE,
  })
}

/**
 * Public action: save the current /nearby filter state for later email alerts.
 * Reuses directory_waitlist storage but tags nearby rows so chef availability sweeps ignore them.
 */
export async function saveNearbySavedSearchAlert(input: {
  email: string
  city?: string
  state?: string
  businessType?: string
  cuisine?: string
  searchQuery?: string
  locationQuery?: string
  locationLabel?: string
  radiusMiles?: number | null
  userLat?: number | null
  userLon?: number | null
  currentMatchCount?: number
  website?: string
  source?: string
}): Promise<{
  success: boolean
  error?: string
  summaryLabel?: string
}> {
  const { z } = await import('zod')
  const NearbySavedSearchSchema = z.object({
    email: z.string().trim().email('Please enter a valid email address.').max(320),
    city: z.string().trim().max(120).optional().or(z.literal('')),
    state: z.string().trim().max(50).optional().or(z.literal('')),
    businessType: z.string().trim().max(80).optional().or(z.literal('')),
    cuisine: z.string().trim().max(80).optional().or(z.literal('')),
    searchQuery: z.string().trim().max(120).optional().or(z.literal('')),
    locationQuery: z.string().trim().max(160).optional().or(z.literal('')),
    locationLabel: z.string().trim().max(160).optional().or(z.literal('')),
    radiusMiles: z.number().int().min(1).max(250).optional().nullable(),
    userLat: z.number().min(-90).max(90).optional().nullable(),
    userLon: z.number().min(-180).max(180).optional().nullable(),
    currentMatchCount: z.number().int().min(0).max(100000).optional(),
    website: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
    source: z.string().trim().max(60).optional(),
  })
  const parsed = NearbySavedSearchSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Please review the form and try again.',
    }
  }

  if (parsed.data.website && parsed.data.website.length > 0) {
    return { success: true }
  }

  try {
    const hdrs = await headers()
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const email = parsed.data.email.toLowerCase()

    await checkRateLimit(`nearby-alert:ip:${ip}`, 10, 5 * 60_000)
    await checkRateLimit(`nearby-alert:email:${email}`, 5, 60 * 60_000)
  } catch {
    return { success: false, error: 'Too many requests. Please try again shortly.' }
  }

  const normalizedState = parsed.data.state ? normalizeUsStateCode(parsed.data.state) : null
  if (parsed.data.state && !normalizedState) {
    return { success: false, error: 'Select a valid state or clear the location filter.' }
  }

  const businessType = cleanText(parsed.data.businessType)
  if (businessType && !DIRECTORY_WAITLIST_BUSINESS_TYPES.has(businessType)) {
    return { success: false, error: 'Select a valid business type or clear the category filter.' }
  }

  const cuisine = cleanText(parsed.data.cuisine)
  if (cuisine && !DIRECTORY_WAITLIST_CUISINES.has(cuisine)) {
    return { success: false, error: 'Select a valid cuisine or leave it blank.' }
  }

  const normalizedSearch = normalizeNearbySavedSearch({
    query: parsed.data.searchQuery,
    businessType,
    cuisine,
    state: normalizedState,
    city: parsed.data.city,
    locationQuery: parsed.data.locationQuery,
    locationLabel: parsed.data.locationLabel,
    radiusMiles: parsed.data.radiusMiles,
    userLat: parsed.data.userLat,
    userLon: parsed.data.userLon,
    currentMatchCount: parsed.data.currentMatchCount,
  })
  const { summaryLabel } = buildNearbySavedSearchSummary(normalizedSearch)
  const location =
    normalizedSearch.locationLabel ||
    (normalizedSearch.city && normalizedSearch.state
      ? buildDirectoryWaitlistLocation(normalizedSearch.city, normalizedSearch.state)
      : normalizedSearch.city || normalizedSearch.state || 'Nearby browse')
  const result = await saveDirectoryWaitlistEntry({
    email: parsed.data.email.toLowerCase(),
    location,
    source: normalizeDirectoryWaitlistSource(parsed.data.source),
    city: normalizedSearch.city,
    state: normalizedSearch.state,
    businessType: normalizedSearch.businessType,
    cuisine: cuisine || null,
    searchQuery: normalizedSearch.query,
    locationQuery: normalizedSearch.locationQuery,
    locationLabel: normalizedSearch.locationLabel,
    radiusMiles: normalizedSearch.radiusMiles,
    userLat: normalizedSearch.userLat,
    userLon: normalizedSearch.userLon,
    baselineMatchCount: normalizedSearch.baselineMatchCount,
    savedSearchKey: isNearbySavedSearchSource(parsed.data.source)
      ? normalizedSearch.searchKey
      : null,
    filterSnapshot: buildNearbySavedSearchSnapshot(normalizedSearch),
  })

  if (!result.success) {
    return result
  }

  const db = createAdminClient()
  const { error: preferenceError } = await db.from('directory_email_preferences').upsert(
    {
      email: parsed.data.email.toLowerCase(),
      opted_out: false,
      opted_out_at: null,
      opt_out_reason: null,
    },
    { onConflict: 'email' }
  )

  if (preferenceError) {
    console.error(
      '[directory-waitlist] Failed to refresh nearby email preferences:',
      preferenceError
    )
  }

  return {
    success: true,
    summaryLabel,
  }
}

/**
 * Backward-compatible alias while /nearby is still wired to the existing component/file names.
 */
export async function submitNearbyUnmetDemand(input: {
  email: string
  city?: string
  state?: string
  businessType?: string
  cuisine?: string
  searchQuery?: string
  locationQuery?: string
  locationLabel?: string
  radiusMiles?: number | null
  userLat?: number | null
  userLon?: number | null
  currentMatchCount?: number
  website?: string
  source?: string
}) {
  return saveNearbySavedSearchAlert(input)
}

/**
 * Sweep: find waitlist entries that match recently-joined chefs and notify them.
 * Matching: waitlist location (freetext) is checked against chef home_city and home_state
 * using case-insensitive substring matching.
 * Called from /api/scheduled/waitlist-directory-sweep cron (daily).
 */
export async function sweepDirectoryWaitlist(): Promise<{
  checked: number
  notified: number
  errors: number
}> {
  const db = createAdminClient()
  let checked = 0
  let notified = 0
  let errors = 0

  const [legacyWaitlistResult, sourcedWaitlistResult] = await Promise.all([
    db
      .from('directory_waitlist')
      .select('id, email, location, source, created_at')
      .is('notified_at', null)
      .is('source', null)
      .order('created_at', { ascending: true })
      .limit(200),
    db
      .from('directory_waitlist')
      .select('id, email, location, source, created_at')
      .is('notified_at', null)
      .eq('source', DEFAULT_DIRECTORY_WAITLIST_SOURCE)
      .order('created_at', { ascending: true })
      .limit(200),
  ])

  const waitlistEntries = [
    ...(legacyWaitlistResult.data || []),
    ...(sourcedWaitlistResult.data || []),
  ]
    .filter((entry) => isDirectoryWaitlistSweepEligible((entry as any).source))
    .sort(
      (a: any, b: any) =>
        new Date((a as any).created_at || 0).getTime() -
        new Date((b as any).created_at || 0).getTime()
    )
    .slice(0, 200)

  if (!waitlistEntries || waitlistEntries.length === 0) {
    return { checked: 0, notified: 0, errors: 0 }
  }

  // Get all discoverable chefs with city/state
  const { data: chefs } = await db
    .from('chefs')
    .select('id, display_name, home_city, home_state, public_slug')
    .not('public_slug', 'is', null)
    .not('home_city', 'is', null)

  if (!chefs || chefs.length === 0) {
    return { checked: waitlistEntries.length, notified: 0, errors: 0 }
  }

  for (const entry of waitlistEntries) {
    checked++
    const loc = (entry.location as string).toLowerCase()

    // Find chefs whose city or state appears in the waitlist location
    const matches = (chefs as any[]).filter((c) => {
      const city = ((c.home_city as string) || '').toLowerCase()
      const state = ((c.home_state as string) || '').toLowerCase()
      return (city && loc.includes(city)) || (state && loc.includes(state))
    })

    if (matches.length === 0) continue

    try {
      const chefNames = matches
        .slice(0, 3)
        .map((c: any) => c.display_name || 'A new chef')
        .join(', ')
      const browseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/chefs?location=${encodeURIComponent(entry.location as string)}`

      await sendEmail({
        to: entry.email as string,
        subject: `A chef is now available near ${entry.location}`,
        react: (await import('@/lib/email/templates/waitlist-match')).WaitlistMatchEmail({
          location: entry.location as string,
          chefNames,
          matchCount: matches.length,
          browseUrl,
        }),
      })

      // Mark as notified
      await db
        .from('directory_waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', entry.id)

      notified++
    } catch (err) {
      errors++
      console.error(`[directory-waitlist] Failed to notify ${entry.email}:`, err)
    }
  }

  return { checked, notified, errors }
}
