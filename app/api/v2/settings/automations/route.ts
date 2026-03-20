// API v2: Automation Rules - List & Create
// GET  /api/v2/settings/automations?active=true
// POST /api/v2/settings/automations

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiCreated, apiValidationError, apiError } from '@/lib/api/v2'

const CreateRuleBody = z.object({
  name: z.string().min(1),
  trigger_event: z.string().min(1),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in']),
        value: z.unknown(),
      })
    )
    .optional(),
  action_type: z.string().min(1),
  action_config: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const active = url.searchParams.get('active')

    let query = ctx.supabase
      .from('automation_rules' as any)
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (active === 'true') query = query.eq('is_active', true)
    if (active === 'false') query = query.eq('is_active', false)

    const { data, error } = await query
    if (error) return apiError('database_error', 'Failed to fetch automation rules', 500)

    return apiSuccess(data ?? [])
  },
  { scopes: ['settings:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateRuleBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await ctx.supabase
      .from('automation_rules' as any)
      .insert({
        tenant_id: ctx.tenantId,
        name: parsed.data.name,
        trigger_event: parsed.data.trigger_event,
        conditions: parsed.data.conditions ?? [],
        action_type: parsed.data.action_type,
        action_config: parsed.data.action_config ?? {},
        is_active: parsed.data.is_active ?? true,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/settings/automations] Create error:', error)
      return apiError('create_failed', 'Failed to create automation rule', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['settings:write'] }
)
