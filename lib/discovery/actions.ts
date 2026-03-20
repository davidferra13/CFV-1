'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  canonicalizeDiscoveryCuisine,
  canonicalizeDiscoveryPriceRange,
  canonicalizeDiscoveryServiceType,
} from '@/lib/discovery/constants'
import {
  DEFAULT_DISCOVERY_PROFILE,
  directoryListingToDiscoveryProfile,
  legacyChefToDiscoveryProfile,
  marketplaceRowToDiscoveryProfile,
  mergeDiscoveryProfile,
} from '@/lib/discovery/profile'
import { normalizeZipCode, resolvePublicLocationQuery } from '@/lib/geo/public-location'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

function isRelationMissingError(error: any) {
  return error?.code === '42P01' || error?.code === '42703'
}

function buildUrlFieldSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value == null || /^https?:\/\//i.test(value), 'Must be a valid URL')
}

const DiscoveryProfileInputSchema = z
  .object({
    cuisine_types: z.array(z.string()).max(12).default([]),
    service_types: z.array(z.string()).max(12).default([]),
    price_range: z.string().trim().nullable().optional(),
    min_guest_count: z.number().int().min(1).max(500).nullable().optional(),
    max_guest_count: z.number().int().min(1).max(500).nullable().optional(),
    service_area_city: z.string().trim().max(120).nullable().optional(),
    service_area_state: z.string().trim().max(80).nullable().optional(),
    service_area_zip: z.string().trim().max(20).nullable().optional(),
    service_area_radius_miles: z.number().int().min(0).max(500).nullable().optional(),
    accepting_inquiries: z.boolean().default(true),
    next_available_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
      .nullable()
      .optional(),
    lead_time_days: z.number().int().min(0).max(365).nullable().optional(),
    hero_image_url: buildUrlFieldSchema(1000),
    highlight_text: z.string().trim().max(240).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.min_guest_count != null &&
      value.max_guest_count != null &&
      value.max_guest_count < value.min_guest_count
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['max_guest_count'],
        message: 'Maximum guests must be greater than or equal to minimum guests',
      })
    }
  })

function normalizeCanonicalArray(
  values: string[],
  canonicalize: (value: string | null | undefined) => string | null,
  fieldName: string
) {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    const canonical = canonicalize(value)
    if (!canonical) {
      throw new Error(`Invalid ${fieldName} value`)
    }
    if (seen.has(canonical)) continue
    seen.add(canonical)
    normalized.push(canonical)
  }

  return normalized
}

async function fetchMarketplaceRow(supabase: any, chefId: string) {
  const result = await (supabase as any)
    .from('chef_marketplace_profiles')
    .select(
      [
        'chef_id',
        'cuisine_types',
        'service_types',
        'price_range',
        'min_guest_count',
        'max_guest_count',
        'service_area_city',
        'service_area_state',
        'service_area_zip',
        'service_area_lat',
        'service_area_lng',
        'service_area_radius_miles',
        'avg_rating',
        'review_count',
        'accepting_inquiries',
        'next_available_date',
        'lead_time_days',
        'hero_image_url',
        'highlight_text',
      ].join(', ')
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (result.error && !isRelationMissingError(result.error)) {
    console.error('[fetchMarketplaceRow]', result.error)
  }

  return result
}

async function fetchDirectoryListingRow(supabase: any, chefId: string) {
  const result = await (supabase as any)
    .from('chef_directory_listings')
    .select(
      [
        'chef_id',
        'cuisines',
        'service_types',
        'city',
        'state',
        'zip_code',
        'service_radius_miles',
        'min_price_cents',
        'max_price_cents',
        'profile_photo_url',
        'rating_avg',
        'review_count',
      ].join(', ')
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (result.error && !isRelationMissingError(result.error)) {
    console.error('[fetchDirectoryListingRow]', result.error)
  }

  return result
}

async function fetchLegacyChefRow(supabase: any, chefId: string) {
  const { data, error } = await supabase
    .from('chefs')
    .select('tagline, profile_image_url')
    .eq('id', chefId)
    .single()

  if (error) {
    console.error('[fetchLegacyChefRow]', error)
    return null
  }

  return data
}

export async function getMyDiscoveryProfile() {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const [marketplaceResult, listingResult, legacyChef] = await Promise.all([
    fetchMarketplaceRow(supabase, user.entityId),
    fetchDirectoryListingRow(supabase, user.entityId),
    fetchLegacyChefRow(supabase, user.entityId),
  ])

  return mergeDiscoveryProfile(
    DEFAULT_DISCOVERY_PROFILE,
    legacyChefToDiscoveryProfile(legacyChef),
    directoryListingToDiscoveryProfile(listingResult.data),
    marketplaceRowToDiscoveryProfile(marketplaceResult.data)
  )
}

export async function updateMyDiscoveryProfile(input: z.input<typeof DiscoveryProfileInputSchema>) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validated = DiscoveryProfileInputSchema.parse(input)

  const payload = {
    chef_id: user.entityId,
    cuisine_types: normalizeCanonicalArray(
      validated.cuisine_types,
      canonicalizeDiscoveryCuisine,
      'cuisine'
    ),
    service_types: normalizeCanonicalArray(
      validated.service_types,
      canonicalizeDiscoveryServiceType,
      'service type'
    ),
    price_range: canonicalizeDiscoveryPriceRange(validated.price_range ?? null),
    min_guest_count: validated.min_guest_count ?? null,
    max_guest_count: validated.max_guest_count ?? null,
    service_area_city: validated.service_area_city || null,
    service_area_state: validated.service_area_state || null,
    service_area_zip:
      normalizeZipCode(validated.service_area_zip) || validated.service_area_zip || null,
    service_area_radius_miles: validated.service_area_radius_miles ?? null,
    accepting_inquiries: validated.accepting_inquiries,
    next_available_date: validated.next_available_date || null,
    lead_time_days: validated.lead_time_days ?? null,
    hero_image_url: validated.hero_image_url ?? null,
    highlight_text: validated.highlight_text || null,
    service_area_lat: null as number | null,
    service_area_lng: null as number | null,
  }

  const locationQuery =
    payload.service_area_zip ||
    [payload.service_area_city, payload.service_area_state].filter(Boolean).join(', ')

  if (locationQuery) {
    const resolvedLocation = await resolvePublicLocationQuery(locationQuery)
    if (resolvedLocation) {
      payload.service_area_lat = resolvedLocation.lat
      payload.service_area_lng = resolvedLocation.lng

      if (!payload.service_area_zip && resolvedLocation.zip) {
        payload.service_area_zip = resolvedLocation.zip
      }
      if (!payload.service_area_city && resolvedLocation.city) {
        payload.service_area_city = resolvedLocation.city
      }
      if (!payload.service_area_state && resolvedLocation.state) {
        payload.service_area_state = resolvedLocation.state
      }
    }
  }

  const { data: chef } = await supabase
    .from('chefs')
    .select('slug, booking_slug')
    .eq('id', user.entityId)
    .single()

  const { error } = await (supabase as any)
    .from('chef_marketplace_profiles')
    .upsert(payload, { onConflict: 'chef_id' })

  if (error) {
    console.error('[updateMyDiscoveryProfile]', error)
    if (isRelationMissingError(error)) {
      throw new Error(
        'Discovery profile storage is not available until the marketplace migrations are applied.'
      )
    }
    throw new Error('Failed to update discovery profile')
  }

  revalidatePath('/settings/public-profile')
  revalidatePath('/chefs')
  revalidateTag(`chef-layout-${user.entityId}`)

  if (chef?.slug) {
    revalidatePath(`/chef/${chef.slug}`)
    revalidatePath(`/chef/${chef.slug}/inquire`)
  }
  if (chef?.booking_slug && chef.booking_slug !== chef?.slug) {
    revalidatePath(`/chef/${chef.booking_slug}`)
    revalidatePath(`/chef/${chef.booking_slug}/inquire`)
  }

  return { success: true }
}
