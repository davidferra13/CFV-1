'use server'

// Remy — Public Layer Context Loader
// Loads ONLY public-safe data for the visitor-facing Remy.
// No financials, no client lists, no internal notes.

import { createAdminClient } from '@/lib/supabase/admin'

export interface RemyPublicContext {
  chefName: string | null
  businessName: string | null
  tagline: string | null
  bio: string | null
  cuisines: string[]
  serviceTypes: string[]
  dietaryCapabilities: string[]
  serviceArea: string | null
  culinaryProfile: string | null
}

/**
 * Load public-safe context for a given chef (tenant).
 * Uses admin client since there's no authenticated user.
 */
export async function loadRemyPublicContext(tenantId: string): Promise<RemyPublicContext> {
  const supabase = createAdminClient()

  // Load chef public profile
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name, tagline, bio')
    .eq('id', tenantId)
    .single()

  // Load culinary profile (public-safe subset)
  let culinaryProfile: string | null = null
  try {
    const { data: profile } = await (supabase
      .from('chef_culinary_profiles' as any)
      .select('question_key, answer')
      .eq('tenant_id', tenantId) as any)

    if (profile && profile.length > 0) {
      const PUBLIC_SAFE_KEYS = [
        'signature_dishes',
        'cuisine_styles',
        'cooking_philosophy',
        'ingredient_sourcing',
        'seasonal_approach',
      ]
      const safeEntries = profile.filter(
        (p: any) => PUBLIC_SAFE_KEYS.includes(p.question_key) && p.answer
      )
      if (safeEntries.length > 0) {
        culinaryProfile = safeEntries
          .map((p: any) => `${p.question_key.replace(/_/g, ' ')}: ${p.answer}`)
          .join('\n')
      }
    }
  } catch {
    // Table may not exist yet — no problem
  }

  return {
    chefName: chef?.display_name ?? chef?.business_name ?? null,
    businessName: chef?.business_name ?? null,
    tagline: chef?.tagline ?? null,
    bio: chef?.bio ?? null,
    cuisines: [],
    serviceTypes: [],
    dietaryCapabilities: [],
    serviceArea: null,
    culinaryProfile,
  }
}

/**
 * Format public context into a system prompt section.
 */
export function formatPublicContext(ctx: RemyPublicContext): string {
  const parts: string[] = ['\nCHEF PROFILE:']

  parts.push(`- Name: ${ctx.chefName ?? 'Chef'}`)
  if (ctx.businessName) parts.push(`- Business: ${ctx.businessName}`)
  if (ctx.tagline) parts.push(`- Tagline: "${ctx.tagline}"`)
  if (ctx.bio) parts.push(`- About: ${ctx.bio}`)
  if (ctx.cuisines.length > 0) parts.push(`- Cuisines: ${ctx.cuisines.join(', ')}`)
  if (ctx.serviceTypes.length > 0) parts.push(`- Services: ${ctx.serviceTypes.join(', ')}`)
  if (ctx.serviceArea) parts.push(`- Service area: ${ctx.serviceArea}`)

  if (ctx.culinaryProfile) {
    parts.push(`\nCULINARY APPROACH:\n${ctx.culinaryProfile}`)
  }

  parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference facts that appear in the CHEF PROFILE above.
If information is not present, say "I'd recommend reaching out to Chef directly for that."
NEVER fabricate cuisine types, services, or details not listed above.`)

  return parts.join('\n')
}
