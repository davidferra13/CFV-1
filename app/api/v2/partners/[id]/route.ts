// API v2: Partners - Get, Update & Delete by ID
// GET    /api/v2/partners/:id
// PATCH  /api/v2/partners/:id
// DELETE /api/v2/partners/:id

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

const UpdatePartnerBody = z
  .object({
    name: z.string().min(1).optional(),
    partner_type: z
      .enum(['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other'])
      .optional(),
    status: z.enum(['active', 'inactive']).optional(),
    contact_name: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    booking_url: z.string().url().nullable().optional(),
    description: z.string().nullable().optional(),
    cover_image_url: z.string().nullable().optional(),
    is_showcase_visible: z.boolean().optional(),
    showcase_order: z.number().int().optional(),
    notes: z.string().nullable().optional(),
    commission_notes: z.string().nullable().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Partner')

    const { data, error } = await (ctx.db as any)
      .from('referral_partners')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Partner')
    return apiSuccess(data)
  },
  { scopes: ['partners:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Partner')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdatePartnerBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await (ctx.db as any)
      .from('referral_partners')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Partner')

    // Clean empty strings to null
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updates[key] = value === '' ? null : value
      }
    }

    const { data, error } = await (ctx.db as any)
      .from('referral_partners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/partners] Update error:', error)
      return apiError('update_failed', 'Failed to update partner', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['partners:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Partner')

    const { error } = await (ctx.db as any)
      .from('referral_partners')
      .delete()
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/partners] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete partner', 500)
    }

    return apiNoContent()
  },
  { scopes: ['partners:write'] }
)
