// API v2: Recipes - Get and Update by ID
// GET   /api/v2/recipes/:id
// PATCH /api/v2/recipes/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const RECIPE_SELECT =
  'id, tenant_id, name, description, cuisine, meal_type, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, difficulty, method, method_detailed, notes, dietary_tags, occasion_tags, season, archived, yield_description, yield_quantity, yield_unit, total_cost_cents, cost_per_serving_cents, photo_url, created_at, updated_at'

const UpdateRecipeBody = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    cuisine: z.string().optional(),
    meal_type: z.string().optional(),
    prep_time_minutes: z.number().int().nonnegative().optional(),
    cook_time_minutes: z.number().int().nonnegative().optional(),
    servings: z.number().int().positive().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    method: z.string().optional(),
    method_detailed: z.string().optional(),
    notes: z.string().optional(),
    dietary_tags: z.array(z.string()).optional(),
    occasion_tags: z.array(z.string()).optional(),
    season: z.string().optional(),
    archived: z.boolean().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Recipe')

    const { data, error } = await ctx.db
      .from('recipes')
      .select(RECIPE_SELECT)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Recipe')
    return apiSuccess(data)
  },
  { scopes: ['recipes:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Recipe')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateRecipeBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify recipe belongs to tenant
    const { data: existing } = await ctx.db
      .from('recipes')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Recipe')

    const { data, error } = await ctx.db
      .from('recipes')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select(RECIPE_SELECT)
      .single()

    if (error) {
      console.error('[api/v2/recipes] Update error:', error)
      return apiError('update_failed', 'Failed to update recipe', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['recipes:write'] }
)
