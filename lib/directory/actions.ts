'use server'

// Chef Directory Actions
// Returns publicly discoverable chefs for the /chefs directory page.
// Uses admin client (no RLS) since this is a public, unauthenticated query.

import { createServerClient } from '@/lib/supabase/server'

export type DirectoryChef = {
  id: string
  slug: string
  display_name: string
  tagline: string | null
  bio: string | null
  profile_image_url: string | null
}

/**
 * Returns all chefs who have opted in to discoverability and have a slug set.
 * Safe to call from public (no-auth) server components.
 */
export async function getDiscoverableChefs(): Promise<DirectoryChef[]> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await (supabase as any)
    .from('chefs')
    .select(`
      id,
      slug,
      display_name,
      business_name,
      tagline,
      bio,
      profile_image_url,
      chef_preferences!inner(network_discoverable)
    `)
    .not('slug', 'is', null)
    .eq('chef_preferences.network_discoverable', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDiscoverableChefs]', error)
    return []
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    slug: c.slug,
    display_name: c.display_name || c.business_name || 'Private Chef',
    tagline: c.tagline ?? null,
    bio: c.bio ?? null,
    profile_image_url: c.profile_image_url ?? null,
  }))
}
