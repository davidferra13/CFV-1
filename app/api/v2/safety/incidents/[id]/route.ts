// API v2: Safety Incidents - Get & Update by ID
// GET   /api/v2/safety/incidents/:id
// PATCH /api/v2/safety/incidents/:id

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const FollowUpStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
})

const UpdateIncidentBody = z
  .object({
    event_id: z.string().uuid().nullable().optional(),
    incident_date: z.string().min(1).optional(),
    incident_type: z
      .enum([
        'food_safety',
        'guest_injury',
        'property_damage',
        'equipment_failure',
        'near_miss',
        'other',
      ])
      .optional(),
    description: z.string().min(1).optional(),
    parties_involved: z.string().nullable().optional(),
    immediate_action: z.string().nullable().optional(),
    follow_up_steps: z.array(FollowUpStepSchema).optional(),
    resolution_status: z.enum(['open', 'in_progress', 'resolved']).optional(),
    document_urls: z.array(z.string()).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Incident')

    const { data, error } = await (ctx.supabase as any)
      .from('chef_incidents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (error || !data) return apiNotFound('Incident')
    return apiSuccess(data)
  },
  { scopes: ['safety:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Incident')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateIncidentBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data: existing } = await (ctx.supabase as any)
      .from('chef_incidents')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!existing) return apiNotFound('Incident')

    const { data, error } = await (ctx.supabase as any)
      .from('chef_incidents')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/safety/incidents] Update error:', error)
      return apiError('update_failed', 'Failed to update incident', 500)
    }

    return apiSuccess(data)
  },
  { scopes: ['safety:write'] }
)
