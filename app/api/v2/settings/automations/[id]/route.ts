// API v2: Automation Rules - Update & Delete by ID
// PATCH  /api/v2/settings/automations/:id
// DELETE /api/v2/settings/automations/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
  apiNoContent,
} from '@/lib/api/v2'

const UpdateRuleBody = z
  .object({
    name: z.string().min(1).optional(),
    trigger_event: z.string().min(1).optional(),
    conditions: z
      .array(
        z.object({
          field: z.string(),
          operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in']),
          value: z.unknown(),
        })
      )
      .optional(),
    action_type: z.string().min(1).optional(),
    action_config: z.record(z.string(), z.unknown()).optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Automation rule')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateRuleBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await ctx.supabase
      .from('automation_rules' as any)
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Automation rule')

    const { data, error } = await ctx.supabase
      .from('automation_rules' as any)
      .update({ ...parsed.data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/settings/automations] Update error:', error)
      return apiError('update_failed', 'Failed to update automation rule', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['settings:write'] }
)

export const DELETE = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Automation rule')

    const { error } = await ctx.supabase
      .from('automation_rules' as any)
      .delete()
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/settings/automations] Delete error:', error)
      return apiError('delete_failed', 'Failed to delete automation rule', 500)
    }

    return apiNoContent()
  },
  { scopes: ['settings:write'] }
)
