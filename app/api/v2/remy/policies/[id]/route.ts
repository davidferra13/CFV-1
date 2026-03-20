// API v2: Remy Approval Policies - Get, Update & Delete by ID
// GET    /api/v2/remy/policies/:id
// PATCH  /api/v2/remy/policies/:id
// DELETE /api/v2/remy/policies/:id

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

const UpdatePolicyBody = z
  .object({
    task_type: z.string().min(1).optional(),
    decision: z.enum(['allow', 'deny', 'ask']).optional(),
    reason: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Remy policy')

    const { data, error } = await (ctx.supabase as any)
      .from('remy_approval_policies')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Remy policy')
    return apiSuccess(data)
  },
  { scopes: ['remy:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Remy policy')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdatePolicyBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await (ctx.supabase as any)
      .from('remy_approval_policies')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Remy policy')

    const { data, error } = await (ctx.supabase as any)
      .from('remy_approval_policies')
      .update({
        ...parsed.data,
        reason: parsed.data.reason?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/remy/policies] Update error:', error)
      return apiError('update_failed', 'Failed to update Remy policy', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['remy:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Remy policy')

    const { error } = await (ctx.supabase as any)
      .from('remy_approval_policies')
      .delete()
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/remy/policies] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete Remy policy', 500)
    }

    return apiNoContent()
  },
  { scopes: ['remy:write'] }
)
