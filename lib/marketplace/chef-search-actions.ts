'use server'

// Marketplace Chef Search
// Public search + filter for the two-sided marketplace browse page.
// No auth required for read operations (public directory).

import { createServerClient } from '@/lib/supabase/server'

export type MarketplaceChefResult = {
  chefId: string
  displayName: string
  businessName: string
  slug: string | null
  tagline: string | null
  profileImageUrl: string | null
  heroImageUrl: string | null
  cuisineTypes: string[]
  serviceTypes: string[]
  priceRange: string | null
  minGuestCount: number | null
  maxGuestCount: number | null
  serviceAreaCity: string | null
  serviceAreaState: string | null
  avgRating: number
  reviewCount: number
  acceptingInquiries: boolean
  nextAvailableDate: string | null
  highlightText: string | null
}

export type MarketplaceSearchFilters = {
  query?: string
  cuisineType?: string
  serviceType?: string
  city?: string
  state?: string
  minGuests?: number
  maxGuests?: number
  priceRange?: string
  page?: number
  pageSize?: number
}

const DEFAULT_PAGE_SIZE = 24

/**
 * Search marketplace chefs with filters.
 * Public (no auth required). Only returns directory-approved, non-deleted chefs
 * who have a marketplace profile and are accepting inquiries.
 */
export async function searchMarketplaceChefs(
  filters: MarketplaceSearchFilters = {}
): Promise<{ chefs: MarketplaceChefResult[]; total: number; page: number; pageSize: number }> {
  const supabase = createServerClient({ admin: true })
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE))
  const offset = (page - 1) * pageSize

  // Base query: join chefs with chef_marketplace_profiles
  let query = supabase
    .from('chef_marketplace_profiles')
    .select(
      `
      chef_id,
      cuisine_types,
      service_types,
      price_range,
      min_guest_count,
      max_guest_count,
      service_area_city,
      service_area_state,
      avg_rating,
      review_count,
      accepting_inquiries,
      next_available_date,
      hero_image_url,
      highlight_text,
      chef:chefs!inner(
        id,
        display_name,
        business_name,
        slug,
        tagline,
        profile_image_url,
        directory_approved,
        is_deleted
      )
    `,
      { count: 'exact' }
    )
    .eq('accepting_inquiries', true)

  // Filter: cuisine type
  if (filters.cuisineType) {
    query = query.contains('cuisine_types', [filters.cuisineType])
  }

  // Filter: service type
  if (filters.serviceType) {
    query = query.contains('service_types', [filters.serviceType])
  }

  // Filter: location
  if (filters.state) {
    query = query.ilike('service_area_state', filters.state)
  }
  if (filters.city) {
    query = query.ilike('service_area_city', `%${filters.city}%`)
  }

  // Filter: guest count
  if (filters.minGuests) {
    query = query.or(`max_guest_count.gte.${filters.minGuests},max_guest_count.is.null`)
  }
  if (filters.maxGuests) {
    query = query.or(`min_guest_count.lte.${filters.maxGuests},min_guest_count.is.null`)
  }

  // Filter: price range
  if (filters.priceRange) {
    query = query.eq('price_range', filters.priceRange)
  }

  // Pagination
  query = query.order('avg_rating', { ascending: false }).range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[marketplace search] Query failed:', error)
    return { chefs: [], total: 0, page, pageSize }
  }

  // Filter to only directory-approved, non-deleted chefs (inner join should handle this
  // but the RLS on chefs might not filter these columns in the join)
  const results: MarketplaceChefResult[] = (data ?? [])
    .filter((row: any) => {
      const chef = row.chef
      return chef?.directory_approved === true && chef?.is_deleted === false
    })
    .map((row: any) => ({
      chefId: row.chef_id,
      displayName: row.chef?.display_name || row.chef?.business_name || 'Chef',
      businessName: row.chef?.business_name || '',
      slug: row.chef?.slug,
      tagline: row.chef?.tagline,
      profileImageUrl: row.chef?.profile_image_url,
      heroImageUrl: row.hero_image_url,
      cuisineTypes: row.cuisine_types ?? [],
      serviceTypes: row.service_types ?? [],
      priceRange: row.price_range,
      minGuestCount: row.min_guest_count,
      maxGuestCount: row.max_guest_count,
      serviceAreaCity: row.service_area_city,
      serviceAreaState: row.service_area_state,
      avgRating: Number(row.avg_rating ?? 0),
      reviewCount: row.review_count ?? 0,
      acceptingInquiries: row.accepting_inquiries,
      nextAvailableDate: row.next_available_date,
      highlightText: row.highlight_text,
    }))

  return { chefs: results, total: count ?? 0, page, pageSize }
}

/**
 * Get a single chef's marketplace profile by slug.
 * Public (no auth required).
 */
export async function getMarketplaceChefBySlug(
  slug: string
): Promise<MarketplaceChefResult | null> {
  const supabase = createServerClient({ admin: true })

  const { data: chef } = await supabase
    .from('chefs')
    .select('id, display_name, business_name, slug, tagline, profile_image_url, bio')
    .eq('slug', slug)
    .eq('directory_approved', true)
    .eq('is_deleted', false)
    .single()

  if (!chef) return null

  const { data: profile } = await supabase
    .from('chef_marketplace_profiles')
    .select('*')
    .eq('chef_id', chef.id)
    .single()

  return {
    chefId: chef.id,
    displayName: chef.display_name || chef.business_name || 'Chef',
    businessName: chef.business_name || '',
    slug: chef.slug,
    tagline: chef.tagline,
    profileImageUrl: chef.profile_image_url,
    heroImageUrl: profile?.hero_image_url ?? null,
    cuisineTypes: profile?.cuisine_types ?? [],
    serviceTypes: profile?.service_types ?? [],
    priceRange: profile?.price_range ?? null,
    minGuestCount: profile?.min_guest_count ?? null,
    maxGuestCount: profile?.max_guest_count ?? null,
    serviceAreaCity: profile?.service_area_city ?? null,
    serviceAreaState: profile?.service_area_state ?? null,
    avgRating: Number(profile?.avg_rating ?? 0),
    reviewCount: profile?.review_count ?? 0,
    acceptingInquiries: profile?.accepting_inquiries ?? true,
    nextAvailableDate: profile?.next_available_date ?? null,
    highlightText: profile?.highlight_text ?? null,
  }
}

/**
 * Get distinct cuisine types across all marketplace chefs (for filter dropdowns).
 */
export async function getMarketplaceCuisineTypes(): Promise<string[]> {
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase
    .from('chef_marketplace_profiles')
    .select('cuisine_types')
    .eq('accepting_inquiries', true)

  if (!data) return []

  const allCuisines = new Set<string>()
  for (const row of data) {
    for (const cuisine of row.cuisine_types ?? []) {
      allCuisines.add(cuisine)
    }
  }

  return Array.from(allCuisines).sort()
}
