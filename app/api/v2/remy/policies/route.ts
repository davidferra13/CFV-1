// API v2: Remy Approval Policies - List & Create/Upsert
// GET  /api/v2/remy/policies?page=1&per_page=50
// POST /api/v2/remy/policies (upserts by tenant_id + task_type)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiCreated,
  apiValidationError,
  apiError,
  parsePagination,
  paginationMeta,
} from '@/lib/api/v2'

const CreatePolicyBody = z.object({
  task_type: z.string().min(1),
  decision: z.enum(['allow', 'deny', 'ask']),
  reason: z.string().optional(),
  enabled: z.boolean().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)

    let query = (ctx.db as any)
      .from('remy_approval_policies')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('task_type', { ascending: true })

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch Remy policies', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['remy:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreatePolicyBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const payload = {
      tenant_id: ctx.tenantId,
      task_type: parsed.data.task_type,
      decision: parsed.data.decision,
      reason: parsed.data.reason?.trim() || null,
      enabled: parsed.data.enabled ?? true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (ctx.db as any)
      .from('remy_approval_policies')
      .upsert(payload, { onConflict: 'tenant_id,task_type' })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/remy/policies] Create error:', error)
      return apiError('create_failed', 'Failed to create Remy policy', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['remy:write'] }
)
