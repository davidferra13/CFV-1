// API v2: Chef Preferences - Get & Update
// GET   /api/v2/settings/preferences
// PATCH /api/v2/settings/preferences

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'

const UpdatePreferencesBody = z
  .object({
    home_address: z.string().optional(),
    home_city: z.string().optional(),
    home_state: z.string().optional(),
    home_zip: z.string().optional(),
    default_buffer_minutes: z.number().int().min(0).max(120).optional(),
    default_prep_hours: z.number().min(0.5).max(12).optional(),
    default_shopping_minutes: z.number().int().min(15).max(240).optional(),
    default_packing_minutes: z.number().int().min(10).max(120).optional(),
    target_margin_percent: z.number().min(0).max(100).optional(),
    target_monthly_revenue_cents: z.number().int().nonnegative().optional(),
    target_annual_revenue_cents: z.number().int().nonnegative().nullable().optional(),
    shop_day_before: z.boolean().optional(),
    dashboard_widgets: z.array(z.object({ id: z.string(), enabled: z.boolean() })).optional(),
    enabled_modules: z.array(z.string()).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx) => {
    const { data, error } = await ctx.db
      .from('chef_preferences')
      .select('*')
      .eq('chef_id', ctx.tenantId)
      .single()

    if (error || !data) {
      // Return empty preferences if none exist yet
      return apiSuccess({ chef_id: ctx.tenantId })
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

    const parsed = UpdatePreferencesBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await ctx.db
      .from('chef_preferences')
      .upsert(
        { chef_id: ctx.tenantId, ...parsed.data, updated_at: new Date().toISOString() } as any,
        { onConflict: 'chef_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[api/v2/settings/preferences] Update error:', error)
      return apiError('update_failed', 'Failed to update preferences', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['settings:write'] }
)
