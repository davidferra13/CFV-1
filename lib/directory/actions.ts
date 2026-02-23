'use server'

// Chef Directory Actions
// Returns publicly discoverable chefs for the /chefs directory page.
// Uses admin client (no RLS) since this is a public, unauthenticated query.
//
// APPROVAL GATE: Only chefs with directory_approved=true appear.
// The founder (davidferra13@gmail.com) is always included regardless.
// Other chefs must be approved by the admin to appear in the public listing.

import { createServerClient } from '@/lib/supabase/server'

/**
 * Hardcoded founder email — this account is ALWAYS listed in the directory,
 * regardless of any flags. This is the platform owner.
 */
const FOUNDER_EMAIL = 'davidferra13@gmail.com'

export type DirectoryPartnerLocation = {
  id: string
  name: string
  city: string | null
  state: string | null
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
  /** True if this is the founder / platform owner */
  is_founder: boolean
  /** Showcase-visible partners with their locations */
  partners: DirectoryPartner[]
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
  const supabase = createServerClient({ admin: true })

  // Query all chefs who have a slug and are network-discoverable.
  // Then filter in-app by directory_approved OR founder email.
  const { data, error } = await supabase
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
    const isFounder = (c.email || '').toLowerCase() === FOUNDER_EMAIL
    return c.directory_approved === true || isFounder
  })

  // Fetch showcase partners for all approved chefs in parallel
  const chefIds = approved.map((c: any) => c.id)

  let partnersMap: Record<string, DirectoryPartner[]> = {}

  if (chefIds.length > 0) {
    const { data: partners, error: partnerError } = await supabase
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
        partner_locations(id, name, city, state, is_active)
      `
      )
      .in('tenant_id', chefIds)
      .eq('is_showcase_visible', true)
      .eq('status', 'active')
      .order('showcase_order', { ascending: true })

    if (!partnerError && partners) {
      for (const p of partners as any[]) {
        const chefId = p.tenant_id as string
        if (!partnersMap[chefId]) partnersMap[chefId] = []
        partnersMap[chefId].push({
          id: p.id,
          name: p.name,
          partner_type: p.partner_type,
          cover_image_url: p.cover_image_url ?? null,
          description: p.description ?? null,
          booking_url: p.booking_url ?? null,
          partner_locations: (p.partner_locations || [])
            .filter((l: any) => l.is_active !== false)
            .map((l: any) => ({
              id: l.id,
              name: l.name,
              city: l.city ?? null,
              state: l.state ?? null,
            })),
        })
      }
    } else if (partnerError) {
      console.error('[getDiscoverableChefs] partner fetch error:', partnerError)
    }
  }

  // Map to public shape (strip email — never expose)
  return approved.map((c: any) => ({
    id: c.id,
    slug: c.slug,
    display_name: c.display_name || c.business_name || 'Private Chef',
    tagline: c.tagline ?? null,
    bio: c.bio ?? null,
    profile_image_url: c.profile_image_url ?? null,
    is_founder: (c.email || '').toLowerCase() === FOUNDER_EMAIL,
    partners: partnersMap[c.id] || [],
  }))
}
