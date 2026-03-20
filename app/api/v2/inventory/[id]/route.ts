// API v2: Inventory Transactions - Get, Update & Delete by ID
// GET    /api/v2/inventory/:id
// PATCH  /api/v2/inventory/:id
// DELETE /api/v2/inventory/:id

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

const UpdateTransactionBody = z
  .object({
    ingredient_name: z.string().min(1).optional(),
    quantity: z.number().optional(),
    unit: z.string().min(1).optional(),
    cost_cents: z.number().int().optional(),
    notes: z.string().optional(),
    location_id: z.string().uuid().nullable().optional(),
    event_id: z.string().uuid().nullable().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Inventory transaction')

    const { data, error } = await (ctx.supabase as any)
      .from('inventory_transactions')
      .select('*')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Inventory transaction')
    return apiSuccess(data)
  },
  { scopes: ['inventory:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Inventory transaction')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateTransactionBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await (ctx.supabase as any)
      .from('inventory_transactions')
      .select('id')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Inventory transaction')

    const { data, error } = await (ctx.supabase as any)
      .from('inventory_transactions')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/inventory] Update error:', error)
      return apiError('update_failed', 'Failed to update inventory transaction', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['inventory:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Inventory transaction')

    // Hard delete for transactions (they can be re-recorded)
    const { error } = await (ctx.supabase as any)
      .from('inventory_transactions')
      .delete()
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/inventory] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete inventory transaction', 500)
    }

    return apiNoContent()
  },
  { scopes: ['inventory:write'] }
)
