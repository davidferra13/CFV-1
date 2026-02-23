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

export type DirectoryChef = {
  id: string
  slug: string
  display_name: string
  tagline: string | null
  bio: string | null
  profile_image_url: string | null
  /** True if this is the founder / platform owner */
  is_founder: boolean
}

/**
 * Returns all chefs who are approved for the public directory.
 * Requirements:
 *   1. chef must have a slug set
 *   2. chef_preferences.network_discoverable = true
 *   3. chef.directory_approved = true  OR  chef.email = founder email
 *
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

  // Map to public shape (strip email — never expose)
  return approved.map((c: any) => ({
    id: c.id,
    slug: c.slug,
    display_name: c.display_name || c.business_name || 'Private Chef',
    tagline: c.tagline ?? null,
    bio: c.bio ?? null,
    profile_image_url: c.profile_image_url ?? null,
    is_founder: (c.email || '').toLowerCase() === FOUNDER_EMAIL,
  }))
}
