// API v2: Pricing Config - Get & Update
// GET   /api/v2/settings/pricing
// PATCH /api/v2/settings/pricing
//
// Returns/updates the chef's pricing configuration (Phase 2).
// If no config exists, returns defaults.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'

const UpdatePricingBody = z
  .object({
    couples_rate_3_course: z.number().int().nonnegative().optional(),
    couples_rate_4_course: z.number().int().nonnegative().optional(),
    couples_rate_5_course: z.number().int().nonnegative().optional(),
    group_rate_3_course: z.number().int().nonnegative().optional(),
    group_rate_4_course: z.number().int().nonnegative().optional(),
    group_rate_5_course: z.number().int().nonnegative().optional(),
    weekly_standard_min: z.number().int().nonnegative().optional(),
    weekly_standard_max: z.number().int().nonnegative().optional(),
    weekly_commit_min: z.number().int().nonnegative().optional(),
    weekly_commit_max: z.number().int().nonnegative().optional(),
    cook_and_leave_rate: z.number().int().nonnegative().optional(),
    pizza_rate: z.number().int().nonnegative().optional(),
    deposit_percentage: z.number().int().min(0).max(100).optional(),
    minimum_booking_cents: z.number().int().nonnegative().optional(),
    balance_due_hours: z.number().int().min(0).max(168).optional(),
    mileage_rate_cents: z.number().int().nonnegative().optional(),
    weekend_premium_pct: z.number().int().min(0).max(100).optional(),
    weekend_premium_on: z.boolean().optional(),
    holiday_tier1_pct: z.number().int().min(0).max(100).optional(),
    holiday_tier2_pct: z.number().int().min(0).max(100).optional(),
    holiday_tier3_pct: z.number().int().min(0).max(100).optional(),
    holiday_proximity_days: z.number().int().min(0).max(7).optional(),
    large_group_min: z.number().int().min(1).max(50).optional(),
    large_group_max: z.number().int().min(1).max(100).optional(),
    add_on_catalog: z
      .array(
        z.object({
          key: z.string(),
          label: z.string(),
          type: z.enum(['per_person', 'flat']),
          cents: z.number().int().nonnegative(),
        })
      )
      .optional(),
    multi_night_packages: z.record(z.number().int().nonnegative()).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx) => {
    const { data, error } = await ctx.supabase
      .from('chef_pricing_config' as any)
      .select('*')
      .eq('chef_id', ctx.tenantId)
      .single()

    if (error || !data) {
      // Return defaults if no config exists
      return apiSuccess({
        chef_id: ctx.tenantId,
        couples_rate_3_course: 20000,
        couples_rate_4_course: 25000,
        couples_rate_5_course: 30000,
        group_rate_3_course: 15500,
        group_rate_4_course: 18500,
        group_rate_5_course: 21500,
        weekly_standard_min: 40000,
        weekly_standard_max: 50000,
        weekly_commit_min: 30000,
        weekly_commit_max: 35000,
        cook_and_leave_rate: 15000,
        pizza_rate: 15000,
        deposit_percentage: 50,
        minimum_booking_cents: 30000,
        balance_due_hours: 24,
        mileage_rate_cents: 70,
        weekend_premium_pct: 10,
        weekend_premium_on: false,
        holiday_tier1_pct: 45,
        holiday_tier2_pct: 30,
        holiday_tier3_pct: 20,
        holiday_proximity_days: 2,
        large_group_min: 8,
        large_group_max: 14,
        _defaults: true,
      })
    }

    return apiSuccess(data)
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

    const parsed = UpdatePricingBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await ctx.supabase
      .from('chef_pricing_config' as any)
      .upsert(
        { chef_id: ctx.tenantId, ...parsed.data, updated_at: new Date().toISOString() } as any,
        { onConflict: 'chef_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[api/v2/settings/pricing] Update error:', error)
      return apiError('update_failed', 'Failed to update pricing config', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['settings:write'] }
)
