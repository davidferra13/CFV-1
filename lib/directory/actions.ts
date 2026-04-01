'use server'

// Chef Directory Actions
// Returns publicly discoverable chefs for the /chefs directory page.
// Uses admin client (no RLS) since this is a public, unauthenticated query.
//
// APPROVAL GATE: Only chefs with directory_approved=true appear.
// The founder (davidferra13@gmail.com) is always included regardless.
// Other chefs must be approved by the admin to appear in the public listing.

import {
  computeDiscoveryCompleteness,
  directoryListingToDiscoveryProfile,
  legacyChefToDiscoveryProfile,
  marketplaceRowToDiscoveryProfile,
  mergeDiscoveryProfile,
  type DiscoveryProfile,
} from '@/lib/discovery/profile'
import { isFounderEmail } from '@/lib/platform/owner-account'
import { createServerClient } from '@/lib/db/server'
import type { ChefSocialLinks } from '@/lib/chef/profile-actions'

export type DirectoryPartnerLocation = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export type DirectoryPartner = {
  id: string
  name: string
  partner_type: string
  cover_image_url: string | null
  description: string | null
  booking_url: string | null
  partner_locations: DirectoryPartnerLocation[]
}

export type DirectoryChef = {
  id: string
  slug: string
  display_name: string
  tagline: string | null
  bio: string | null
  profile_image_url: string | null
  website_url: string | null
  google_review_url: string | null
  show_website_on_public_profile: boolean
  preferred_inquiry_destination: string | null
  social_links: ChefSocialLinks
  discovery: DiscoveryProfile & { completeness_score: number }
  /** True if this is the founder / platform owner */
  is_founder: boolean
  /** Showcase-visible partners with their locations */
  partners: DirectoryPartner[]
  /** Optional distance from the active search location. */
  distance_miles?: number | null
  /** Legacy listing data used to backfill location search anchors. */
  directory_listing_location?: {
    city: string | null
    state: string | null
    zip: string | null
  }
}

function isRelationMissingError(error: any) {
  return error?.code === '42P01' || error?.code === '42703'
}

/**
 * Returns all chefs who are approved for the public directory.
 * Requirements:
 *   1. chef must have a slug set
 *   2. chef_preferences.network_discoverable = true
 *   3. chef.directory_approved = true  OR  chef.email = founder email
 *
 * Also fetches each chef's showcase-visible partners and their locations.
 * Safe to call from public (no-auth) server components.
 */
export async function getDiscoverableChefs(): Promise<DirectoryChef[]> {
  const db = createServerClient({ admin: true })

  // Query all chefs who have a slug and are network-discoverable.
  // Then filter in-app by directory_approved OR founder email.
  const { data, error } = await db
    .from('chefs')
    .select(
      `
      id,
      slug,
      display_name,
      business_name,
      tagline,
      bio,
      profile_image_url,
      website_url,
      google_review_url,
      show_website_on_public_profile,
      preferred_inquiry_destination,
      social_links,
      email,
      directory_approved,
      chef_preferences!inner(network_discoverable)
    `
    )
    .not('slug', 'is', null)
    .eq('chef_preferences.network_discoverable', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDiscoverableChefs]', error)
    return []
  }

  // Filter: must be directory_approved=true OR be the founder
  const approved = (data || []).filter((c: any) => {
    const isFounder = isFounderEmail(c.email)
    return c.directory_approved === true || isFounder
  })

  const chefIds = approved.map((c: any) => c.id)
  let partnersMap: Record<string, DirectoryPartner[]> = {}
  let marketplaceProfilesMap: Record<string, any> = {}
  let listingProfilesMap: Record<string, any> = {}

  if (chefIds.length > 0) {
    const [partnerResult, marketplaceResult, listingResult] = await Promise.all([
      db
        .from('referral_partners')
        .select(
          `
          id,
          tenant_id,
          name,
          partner_type,
          cover_image_url,
          description,
          booking_url,
          showcase_order,
          partner_locations(id, name, address, city, state, zip, is_active)
        `
        )
        .in('tenant_id', chefIds)
        .eq('is_showcase_visible', true)
        .eq('status', 'active')
        .order('showcase_order', { ascending: true }),
      (db as any)
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
        .in('chef_id', chefIds),
      (db as any)
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
        .in('chef_id', chefIds),
    ])

    if (!partnerResult.error && partnerResult.data) {
      for (const partner of partnerResult.data as any[]) {
        const chefId = partner.tenant_id as string
        if (!partnersMap[chefId]) partnersMap[chefId] = []
        partnersMap[chefId].push({
          id: partner.id,
          name: partner.name,
          partner_type: partner.partner_type,
          cover_image_url: partner.cover_image_url ?? null,
          description: partner.description ?? null,
          booking_url: partner.booking_url ?? null,
          partner_locations: (partner.partner_locations || [])
            .filter((location: any) => location.is_active !== false)
            .map((location: any) => ({
              id: location.id,
              name: location.name,
              address: location.address ?? null,
              city: location.city ?? null,
              state: location.state ?? null,
              zip: location.zip ?? null,
            })),
        })
      }
    } else if (partnerResult.error) {
      console.error('[getDiscoverableChefs] partner fetch error:', partnerResult.error)
    }

    if (!marketplaceResult.error && marketplaceResult.data) {
      marketplaceProfilesMap = Object.fromEntries(
        (marketplaceResult.data as any[]).map((profile) => [profile.chef_id, profile])
      )
    } else if (marketplaceResult.error && !isRelationMissingError(marketplaceResult.error)) {
      console.error(
        '[getDiscoverableChefs] marketplace profile fetch error:',
        marketplaceResult.error
      )
    }

    if (!listingResult.error && listingResult.data) {
      listingProfilesMap = Object.fromEntries(
        (listingResult.data as any[]).map((profile) => [profile.chef_id, profile])
      )
    } else if (listingResult.error && !isRelationMissingError(listingResult.error)) {
      console.error('[getDiscoverableChefs] directory listing fetch error:', listingResult.error)
    }
  }

  return approved.map((chef: any) => {
    const discovery = mergeDiscoveryProfile(
      legacyChefToDiscoveryProfile(chef),
      directoryListingToDiscoveryProfile(listingProfilesMap[chef.id]),
      marketplaceRowToDiscoveryProfile(marketplaceProfilesMap[chef.id])
    )

    return {
      id: chef.id,
      slug: chef.slug,
      display_name: chef.display_name || chef.business_name || 'Private Chef',
      tagline: chef.tagline ?? discovery.highlight_text ?? null,
      bio: chef.bio ?? null,
      profile_image_url: chef.profile_image_url ?? discovery.hero_image_url ?? null,
      website_url: chef.website_url ?? null,
      google_review_url: chef.google_review_url ?? null,
      show_website_on_public_profile: chef.show_website_on_public_profile ?? true,
      preferred_inquiry_destination: chef.preferred_inquiry_destination ?? 'both',
      social_links: (chef.social_links as ChefSocialLinks) ?? {},
      discovery: {
        ...discovery,
        completeness_score: computeDiscoveryCompleteness(discovery),
      },
      is_founder: isFounderEmail(chef.email),
      partners: partnersMap[chef.id] || [],
      distance_miles: null,
      directory_listing_location: {
        city: listingProfilesMap[chef.id]?.city ?? null,
        state: listingProfilesMap[chef.id]?.state ?? null,
        zip: listingProfilesMap[chef.id]?.zip_code ?? null,
      },
    }
  })
}
