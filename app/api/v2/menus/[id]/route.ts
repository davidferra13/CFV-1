// API v2: Menus - Get, Update & Delete by ID
// GET    /api/v2/menus/:id
// PATCH  /api/v2/menus/:id
// DELETE /api/v2/menus/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNoContent,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/api/v2'

const UpdateMenuBody = z
  .object({
    name: z.string().min(1).optional(),
    season: z.enum(['spring', 'summer', 'fall', 'winter']).nullable().optional(),
    client_id: z.string().uuid().nullable().optional(),
    target_date: z.string().nullable().optional(),
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

    const { data, error } = await ctx.db
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

    const { data: existing } = await ctx.db
      .from('menus')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Menu')

    const { data, error } = await ctx.db
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

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Menu')

    const { error } = await ctx.db
      .from('menus')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)

    if (error) {
      console.error('[api/v2/menus] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete menu', 500)
    }

    return apiNoContent()
  },
  { scopes: ['menus:write'] }
)
