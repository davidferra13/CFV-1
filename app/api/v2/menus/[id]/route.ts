// API v2: Menus - Get & Update by ID
// GET   /api/v2/menus/:id
// PATCH /api/v2/menus/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateMenuBody = z
  .object({
    menu_name: z.string().min(1).optional(),
    service_style: z
      .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
      .optional(),
    cuisine_type: z.string().optional(),
    target_guest_count: z.number().int().positive().optional(),
    notes: z.string().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Menu')

    const { data, error } = await ctx.supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Menu')
    return apiSuccess(data)
  },
  { scopes: ['menus:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Menu')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateMenuBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await ctx.supabase
      .from('menus')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Menu')

    const { data, error } = await ctx.supabase
      .from('menus')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/menus] Update error:', error)
      return apiError('update_failed', 'Failed to update menu', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['menus:write'] }
)
