// API v2: Quotes - Get, Update & Delete by ID
// GET    /api/v2/quotes/:id
// PATCH  /api/v2/quotes/:id
// DELETE /api/v2/quotes/:id

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

const UpdateQuoteBody = z
  .object({
    quote_name: z.string().min(1).optional(),
    pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
    total_quoted_cents: z.number().int().nonnegative().optional(),
    price_per_person_cents: z.number().int().nonnegative().nullable().optional(),
    guest_count_estimated: z.number().int().positive().optional(),
    deposit_required: z.boolean().optional(),
    deposit_amount_cents: z.number().int().nonnegative().optional(),
    deposit_percentage: z.number().min(0).max(100).optional(),
    pricing_notes: z.string().optional(),
    valid_until: z.string().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Quote')

    const { data, error } = await ctx.supabase
      .from('quotes')
      .select('*, client:clients(id, full_name, email)')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Quote')
    return apiSuccess(data)
  },
  { scopes: ['quotes:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Quote')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateQuoteBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await ctx.supabase
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Quote')

    // Only draft quotes can be edited
    if ((existing as any).status !== 'draft') {
      return apiError('not_editable', 'Only draft quotes can be updated', 422)
    }

    const { data, error } = await ctx.supabase
      .from('quotes')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/quotes] Update error:', error)
      return apiError('update_failed', 'Failed to update quote', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['quotes:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Quote')

    const { error } = await ctx.supabase
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)

    if (error) {
      console.error('[api/v2/quotes] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete quote', 500)
    }

    return apiNoContent()
  },
  { scopes: ['quotes:write'] }
)
