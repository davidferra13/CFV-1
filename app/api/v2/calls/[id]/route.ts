// API v2: Calls - Get, Update & Cancel by ID
// GET    /api/v2/calls/:id
// PATCH  /api/v2/calls/:id
// DELETE /api/v2/calls/:id (cancels the call)

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

const UpdateCallBody = z
  .object({
    scheduled_at: z.string().optional(),
    duration_minutes: z.number().int().positive().optional(),
    timezone: z.string().optional(),
    title: z.string().optional(),
    status: z.enum(['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled']).optional(),
    prep_notes: z.string().optional(),
    outcome_summary: z.string().optional(),
    call_notes: z.string().optional(),
    next_action: z.string().optional(),
    next_action_due_at: z.string().optional(),
    actual_duration_minutes: z.number().int().positive().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Call')

    const { data, error } = await (ctx.supabase as any)
      .from('scheduled_calls')
      .select('*, client:clients(id, full_name, email)')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Call')
    return apiSuccess(data)
  },
  { scopes: ['calls:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Call')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateCallBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await (ctx.supabase as any)
      .from('scheduled_calls')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Call')

    const updatePayload: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    // Set completed_at/cancelled_at timestamps based on status change
    if (parsed.data.status === 'completed') {
      updatePayload.completed_at = new Date().toISOString()
    } else if (parsed.data.status === 'cancelled') {
      updatePayload.cancelled_at = new Date().toISOString()
    }

    const { data, error } = await (ctx.supabase as any)
      .from('scheduled_calls')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/calls] Update error:', error)
      return apiError('update_failed', 'Failed to update call', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['calls:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Call')

    // Cancel the call (soft delete via status change)
    const { error } = await (ctx.supabase as any)
      .from('scheduled_calls')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/calls] Cancel error:', error)
      return apiError('delete_failed', 'Failed to cancel call', 500)
    }

    return apiNoContent()
  },
  { scopes: ['calls:write'] }
)
