// Chef Layout Data Cache
// Wraps the two layout-blocking DB queries in Next.js unstable_cache so that
// navigating between tabs costs ~0ms instead of ~300ms for these calls.
//
// Cache key: chef ID (per-tenant). TTL: 60 seconds.
// The chef's slug and nav prefs change very rarely; 60s staleness is invisible.
//
// Uses the admin client because unstable_cache runs outside the request context
// and cannot access per-request cookies.

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export const CHEF_LAYOUT_CACHE_TAG = 'chef-layout'

export type ChefLayoutData = {
  slug: string | null
  tagline: string | null
  business_name: string | null
  created_at: string | null
  portal_primary_color: string | null
  portal_background_color: string | null
  portal_background_image_url: string | null
  primary_nav_hrefs: string[]
  enabled_modules: string[]
  subscription_status: string | null
}

export function getChefLayoutData(chefId: string): Promise<ChefLayoutData> {
  return unstable_cache(
    async (): Promise<ChefLayoutData> => {
      const supabase = createAdminClient()

      const [chefResult, prefsResult] = await Promise.all([
        supabase
          .from('chefs')
          .select(
            'slug, tagline, business_name, created_at, portal_primary_color, portal_background_color, portal_background_image_url, subscription_status'
          )
          .eq('id', chefId)
          .single(),
        supabase
          .from('chef_preferences')
          .select('primary_nav_hrefs, enabled_modules')
          .eq('chef_id', chefId)
          .single(),
      ])

      return {
        slug: chefResult.data?.slug ?? null,
        tagline: chefResult.data?.tagline ?? null,
        business_name: (chefResult.data as any)?.business_name ?? null,
        created_at: (chefResult.data as any)?.created_at ?? null,
        portal_primary_color: chefResult.data?.portal_primary_color ?? null,
        portal_background_color: chefResult.data?.portal_background_color ?? null,
        portal_background_image_url: chefResult.data?.portal_background_image_url ?? null,
        primary_nav_hrefs: Array.isArray(prefsResult.data?.primary_nav_hrefs)
          ? (prefsResult.data.primary_nav_hrefs as string[])
          : [],
        enabled_modules: Array.isArray((prefsResult.data as any)?.enabled_modules)
          ? ((prefsResult.data as any).enabled_modules as string[])
          : [],
        subscription_status: (chefResult.data as any)?.subscription_status ?? null,
      }
    },
    [`chef-layout-${chefId}`],
    {
      revalidate: 60,
      tags: [`${CHEF_LAYOUT_CACHE_TAG}-${chefId}`],
    }
  )()
}
