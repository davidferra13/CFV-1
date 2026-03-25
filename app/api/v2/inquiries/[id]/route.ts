// API v2: Inquiries - Get, Update & Delete by ID
// GET    /api/v2/inquiries/:id
// PATCH  /api/v2/inquiries/:id
// DELETE /api/v2/inquiries/:id

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

const UpdateInquiryBody = z
  .object({
    status: z.string().optional(),
    notes: z.string().optional(),
    assigned_to: z.string().uuid().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Inquiry')

    const { data, error } = await ctx.db
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Inquiry')
    return apiSuccess(data)
  },
  { scopes: ['inquiries:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Inquiry')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateInquiryBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await ctx.db
      .from('inquiries')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Inquiry')

    const { data, error } = await ctx.db
      .from('inquiries')
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/inquiries] Update error:', error)
      return apiError('update_failed', 'Failed to update inquiry', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['inquiries:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Inquiry')

    const { error } = await ctx.db
      .from('inquiries')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)

    if (error) {
      console.error('[api/v2/inquiries] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete inquiry', 500)
    }

    return apiNoContent()
  },
  { scopes: ['inquiries:write'] }
)
