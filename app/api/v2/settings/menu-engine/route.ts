// API v2: Menu Engine Feature Toggles
// GET   /api/v2/settings/menu-engine - Get current feature toggles
// PATCH /api/v2/settings/menu-engine - Update feature toggles

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { DEFAULT_MENU_ENGINE_FEATURES } from '@/lib/scheduling/types'

const MenuEngineFeaturesBody = z
  .object({
    seasonal_warnings: z.boolean().optional(),
    prep_estimate: z.boolean().optional(),
    client_taste: z.boolean().optional(),
    menu_history: z.boolean().optional(),
    vendor_hints: z.boolean().optional(),
    allergen_validation: z.boolean().optional(),
    stock_alerts: z.boolean().optional(),
    scale_mismatch: z.boolean().optional(),
    inquiry_link: z.boolean().optional(),
    budget_compliance: z.boolean().optional(),
    dietary_conflicts: z.boolean().optional(),
  })
  .strict()

function getMenuEngineFeaturesFromUnknown(raw: unknown): Record<string, boolean> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...DEFAULT_MENU_ENGINE_FEATURES, ...(raw as Record<string, boolean>) }
  }
  return { ...DEFAULT_MENU_ENGINE_FEATURES }
}

export const GET = withApiAuth(
  async (_req, ctx) => {
    const { data } = await ctx.db
      .from('chef_preferences')
      .select('menu_engine_features')
      .eq('chef_id', ctx.tenantId)
      .single()

    const features = getMenuEngineFeaturesFromUnknown((data as any)?.menu_engine_features)
    return apiSuccess({ features })
  },
  { scopes: ['settings:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = MenuEngineFeaturesBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Fetch existing features to merge (partial update support)
    const { data: existing } = await ctx.db
      .from('chef_preferences')
      .select('menu_engine_features')
      .eq('chef_id', ctx.tenantId)
      .single()

    const current = getMenuEngineFeaturesFromUnknown((existing as any)?.menu_engine_features)
    const merged = { ...current, ...parsed.data }

    const { data, error } = await ctx.db
      .from('chef_preferences')
      .upsert(
        {
          chef_id: ctx.tenantId,
          menu_engine_features: merged,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'chef_id' }
      )
      .select('menu_engine_features')
      .single()

    if (error) {
      console.error('[api/v2/settings/menu-engine] Update error:', error)
      return apiError('update_failed', 'Failed to update menu engine features', 500)
    }

    return apiSuccess({
      features: getMenuEngineFeaturesFromUnknown((data as any)?.menu_engine_features),
    })
  },
  { scopes: ['settings:write'] }
)
