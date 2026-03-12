'use server'

// Chef Marketplace Profile Management
// Chef-side actions for managing their marketplace listing.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

export type ChefMarketplaceProfileInput = {
  cuisineTypes?: string[]
  serviceTypes?: string[]
  priceRange?: string | null
  minGuestCount?: number | null
  maxGuestCount?: number | null
  serviceAreaCity?: string | null
  serviceAreaState?: string | null
  serviceAreaRadiusMiles?: number | null
  acceptingInquiries?: boolean
  leadTimeDays?: number | null
  heroImageUrl?: string | null
  galleryUrls?: string[]
  highlightText?: string | null
}

/**
 * Upsert the chef's marketplace profile.
 * Chef-only. Creates or updates their public marketplace listing.
 */
export async function upsertChefMarketplaceProfile(input: ChefMarketplaceProfileInput) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_marketplace_profiles')
    .upsert(
      {
        chef_id: user.entityId,
        cuisine_types: input.cuisineTypes ?? [],
        service_types: input.serviceTypes ?? [],
        price_range: input.priceRange,
        min_guest_count: input.minGuestCount,
        max_guest_count: input.maxGuestCount,
        service_area_city: input.serviceAreaCity,
        service_area_state: input.serviceAreaState,
        service_area_radius_miles: input.serviceAreaRadiusMiles ?? 25,
        accepting_inquiries: input.acceptingInquiries ?? true,
        lead_time_days: input.leadTimeDays ?? 3,
        hero_image_url: input.heroImageUrl,
        gallery_urls: input.galleryUrls ?? [],
        highlight_text: input.highlightText,
      },
      { onConflict: 'chef_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[marketplace profile] Upsert failed:', error)
    throw new Error('Failed to update marketplace profile')
  }

  revalidateTag('marketplace-search')

  return data
}

/**
 * Get the chef's own marketplace profile (for settings page).
 */
export async function getOwnMarketplaceProfile() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chef_marketplace_profiles')
    .select('*')
    .eq('chef_id', user.entityId)
    .single()

  return data
}

/**
 * Toggle accepting inquiries on/off.
 */
export async function toggleAcceptingInquiries(accepting: boolean) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chef_marketplace_profiles')
    .update({ accepting_inquiries: accepting })
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[marketplace profile] Toggle failed:', error)
    throw new Error('Failed to update availability')
  }

  revalidateTag('marketplace-search')
}
