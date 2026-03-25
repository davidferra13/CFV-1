// API v2: Goals - Get, Update & Archive by ID
// GET    /api/v2/goals/:id
// PATCH  /api/v2/goals/:id
// DELETE /api/v2/goals/:id (archives the goal)

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

const UpdateGoalBody = z
  .object({
    label: z.string().trim().min(1).max(100).optional(),
    target_value: z.number().int().min(0).optional(),
    period_start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
      .optional(),
    period_end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
      .optional(),
    status: z.enum(['active', 'paused', 'archived']).optional(),
    nudge_enabled: z.boolean().optional(),
    nudge_level: z.enum(['gentle', 'standard', 'aggressive']).optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Goal')

    const { data, error } = await (ctx.db as any)
      .from('chef_goals')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Goal')
    return apiSuccess(data)
  },
  { scopes: ['goals:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Goal')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateGoalBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify goal belongs to tenant
    const { data: existing } = await (ctx.db as any)
      .from('chef_goals')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Goal')

    const updatePayload: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (ctx.db as any)
      .from('chef_goals')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/goals] Update error:', error)
      return apiError('update_failed', 'Failed to update goal', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['goals:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Goal')

    // Archive the goal (soft delete via status change)
    const { error } = await (ctx.db as any)
      .from('chef_goals')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/goals] Archive error:', error)
      return apiError('delete_failed', 'Failed to archive goal', 500)
    }

    return apiNoContent()
  },
  { scopes: ['goals:write'] }
)
