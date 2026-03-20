// API v2: Loyalty Programs - Get & Create/Update config
// GET  /api/v2/loyalty/programs  (returns the tenant's loyalty config + rewards)
// POST /api/v2/loyalty/programs  (upsert loyalty config)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'

const UpsertProgramBody = z.object({
  points_per_guest: z.number().int().positive().optional(),
  bonus_large_party_threshold: z.number().int().positive().nullable().optional(),
  bonus_large_party_points: z.number().int().nonnegative().nullable().optional(),
  milestone_bonuses: z
    .array(
      z.object({
        events: z.number().int().positive(),
        bonus: z.number().int().positive(),
      })
    )
    .optional(),
  tier_silver_min: z.number().int().positive().optional(),
  tier_gold_min: z.number().int().positive().optional(),
  tier_platinum_min: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  welcome_points: z.number().int().nonnegative().optional(),
  referral_points: z.number().int().nonnegative().optional(),
  program_mode: z.enum(['full', 'lite', 'off']).optional(),
  earn_mode: z.enum(['per_guest', 'per_dollar', 'per_event']).optional(),
  points_per_dollar: z.number().positive().optional(),
  points_per_event: z.number().int().positive().optional(),
})

export const GET = withApiAuth(
  async (_req, ctx) => {
    // Fetch loyalty config
    const { data: config, error } = await (ctx.supabase as any)
      .from('loyalty_config')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !config) {
      // No config means loyalty is not set up yet
      return apiSuccess({ config: null, rewards: [] })
    }

    // Fetch rewards catalog
    const { data: rewards } = await (ctx.supabase as any)
      .from('loyalty_rewards')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('sort_order', { ascending: true })

    return apiSuccess({
      config,
      rewards: rewards ?? [],
    })
  },
  { scopes: ['loyalty:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpsertProgramBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Check if config exists
    const { data: existing } = await (ctx.supabase as any)
      .from('loyalty_config')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .single()

    let result
    if (existing) {
      // Update existing config
      const { data, error } = await (ctx.supabase as any)
        .from('loyalty_config')
        .update(parsed.data as any)
        .eq('tenant_id', ctx.tenantId)
        .select()
        .single()

      if (error) {
        console.error('[api/v2/loyalty/programs] Update error:', error)
        return apiError('update_failed', 'Failed to update loyalty program', 500)
      }
      result = data
    } else {
      // Create new config
      const { data, error } = await (ctx.supabase as any)
        .from('loyalty_config')
        .insert({
          tenant_id: ctx.tenantId,
          ...parsed.data,
        } as any)
        .select()
        .single()

      if (error) {
        console.error('[api/v2/loyalty/programs] Create error:', error)
        return apiError('create_failed', 'Failed to create loyalty program', 500)
      }
      result = data
    }

    return apiCreated(result)
  },
  { scopes: ['loyalty:write'] }
)
