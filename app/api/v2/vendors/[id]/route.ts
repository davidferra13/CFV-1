// API v2: Vendors - Get, Update & Delete by ID
// GET    /api/v2/vendors/:id
// PATCH  /api/v2/vendors/:id
// DELETE /api/v2/vendors/:id

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

const UpdateVendorBody = z
  .object({
    name: z.string().min(1).optional(),
    vendor_type: z.string().optional(),
    contact_name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    website: z.string().optional(),
    account_number: z.string().optional(),
    payment_terms: z.string().optional(),
    notes: z.string().optional(),
    is_preferred: z.boolean().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Vendor')

    const { data, error } = await (ctx.db as any)
      .from('vendors')
      .select('*')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Vendor')
    return apiSuccess(data)
  },
  { scopes: ['vendors:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Vendor')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateVendorBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await (ctx.db as any)
      .from('vendors')
      .select('id')
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Vendor')

    const { data, error } = await (ctx.db as any)
      .from('vendors')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/vendors] Update error:', error)
      return apiError('update_failed', 'Failed to update vendor', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['vendors:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Vendor')

    // Soft deactivate
    const { error } = await (ctx.db as any)
      .from('vendors')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('chef_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/vendors] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete vendor', 500)
    }

    return apiNoContent()
  },
  { scopes: ['vendors:write'] }
)
