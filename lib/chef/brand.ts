// Chef Brand Resolution - single source of truth for all client-facing surfaces.
//
// Every surface that shows the chef's identity calls getChefBrand(chefId).
// Returns the chef's logo, business name, colors, and whether to show
// "Powered by ChefFlow" (free tier only; Pro removes it).
//
// NOT a server action file - utility imported by actions, server components, and email renderers.
// Uses admin client because unstable_cache runs outside the request context.

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTierForChef } from '@/lib/billing/tier'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChefBrandMode = 'text' | 'full'

export type ChefBrand = {
  /** 'text' = no logo uploaded, headers use business name text only.
   *  'full' = logo uploaded, headers render the logo image. */
  mode: ChefBrandMode

  /** Always present (required DB field). Primary identity on all surfaces. */
  businessName: string

  /** Public URL of the chef's logo. Null if not uploaded. */
  logoUrl: string | null

  /** Chef's profile photo. Null if not uploaded. */
  profileImageUrl: string | null

  /** Accent color for buttons, bars, CTA sections.
   *  Falls back to a clean neutral if the chef hasn't set one. */
  primaryColor: string

  /** Background color for portal pages. Falls back to white. */
  backgroundColor: string

  /** Background image URL for portal pages. Null if not set. */
  backgroundImageUrl: string | null

  /** Whether the chef is on a Pro plan. */
  isPro: boolean

  /** True = show "Powered by ChefFlow" footer on client-facing surfaces.
   *  Only false when the chef is on Pro (branding removal is a Pro perk). */
  showPoweredBy: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/** Neutral accent when chef hasn't set a custom color. Not ChefFlow orange. */
const DEFAULT_PRIMARY_COLOR = '#18181b'

/** Clean white background default. */
const DEFAULT_BACKGROUND_COLOR = '#ffffff'

// ─── Cache config ─────────────────────────────────────────────────────────────

export const CHEF_BRAND_CACHE_TAG = 'chef-brand'

/** Build the cache tag for a specific chef. Use this in revalidateTag() calls. */
export function chefBrandTag(chefId: string): string {
  return `${CHEF_BRAND_CACHE_TAG}-${chefId}`
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchChefBrand(chefId: string): Promise<ChefBrand> {
  const supabase: any = createAdminClient()

  const { data, error } = await supabase
    .from('chefs')
    .select(
      `
      business_name,
      logo_url,
      profile_image_url,
      portal_primary_color,
      portal_background_color,
      portal_background_image_url
    `
    )
    .eq('id', chefId)
    .single()

  if (error || !data) {
    // Safety fallback: return a minimal brand so surfaces never crash
    console.error('[fetchChefBrand] Failed to fetch brand for chef', chefId, error)
    return {
      mode: 'text',
      businessName: 'Private Chef',
      logoUrl: null,
      profileImageUrl: null,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      backgroundImageUrl: null,
      isPro: false,
      showPoweredBy: true,
    }
  }

  const logoUrl: string | null = data.logo_url || null
  const mode: ChefBrandMode = logoUrl ? 'full' : 'text'

  // Resolve tier for Pro/free determination
  const { tier } = await getTierForChef(chefId)
  const isPro = tier === 'pro'

  return {
    mode,
    businessName: data.business_name || 'Private Chef',
    logoUrl,
    profileImageUrl: data.profile_image_url || null,
    primaryColor: data.portal_primary_color || DEFAULT_PRIMARY_COLOR,
    backgroundColor: data.portal_background_color || DEFAULT_BACKGROUND_COLOR,
    backgroundImageUrl: data.portal_background_image_url || null,
    isPro,
    showPoweredBy: !isPro,
  }
}

// ─── Cached export ────────────────────────────────────────────────────────────

/**
 * Get a chef's brand identity. Cached for 60s with tag-based invalidation.
 * Every client-facing surface (PDFs, emails, portals, widgets) calls this.
 *
 * Cache is busted via revalidateTag(chefBrandTag(chefId)) whenever the chef
 * updates their profile, portal theme, or uploads a logo.
 */
export function getChefBrand(chefId: string): Promise<ChefBrand> {
  return unstable_cache(fetchChefBrand, ['chef-brand', chefId], {
    tags: [chefBrandTag(chefId)],
    revalidate: 60,
  })(chefId)
}
