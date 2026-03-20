// API v2: Loyalty Programs - Get & Update by ID
// GET   /api/v2/loyalty/programs/:id
// PATCH /api/v2/loyalty/programs/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateProgramBody = z
  .object({
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
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Loyalty program')

    const { data: config, error } = await (ctx.supabase as any)
      .from('loyalty_config')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !config) return apiNotFound('Loyalty program')

    // Fetch rewards for this program
    const { data: rewards } = await (ctx.supabase as any)
      .from('loyalty_rewards')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('sort_order', { ascending: true })

    return apiSuccess({ config, rewards: rewards ?? [] })
  },
  { scopes: ['loyalty:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Loyalty program')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateProgramBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify config belongs to tenant
    const { data: existing } = await (ctx.supabase as any)
      .from('loyalty_config')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Loyalty program')

    const { data, error } = await (ctx.supabase as any)
      .from('loyalty_config')
      .update(parsed.data as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/loyalty/programs] Update error:', error)
      return apiError('update_failed', 'Failed to update loyalty program', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['loyalty:write'] }
)
