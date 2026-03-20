// API v2: Safety Incidents - List & Create
// GET  /api/v2/safety/incidents?status=open&type=food_safety&event_id=uuid&page=1&per_page=50
// POST /api/v2/safety/incidents

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

const FollowUpStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
})

const CreateIncidentBody = z.object({
  event_id: z.string().uuid().optional(),
  incident_date: z.string().min(1),
  incident_type: z.enum([
    'food_safety',
    'guest_injury',
    'property_damage',
    'equipment_failure',
    'near_miss',
    'other',
  ]),
  description: z.string().min(1),
  parties_involved: z.string().optional(),
  immediate_action: z.string().optional(),
  follow_up_steps: z.array(FollowUpStepSchema).optional(),
  resolution_status: z.enum(['open', 'in_progress', 'resolved']).optional(),
  document_urls: z.array(z.string()).optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')
    const incidentType = url.searchParams.get('type')
    const eventId = url.searchParams.get('event_id')

    let query = (ctx.supabase as any)
      .from('chef_incidents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('incident_date', { ascending: false })

    if (status) query = query.eq('resolution_status', status)
    if (incidentType) query = query.eq('incident_type', incidentType)
    if (eventId) query = query.eq('event_id', eventId)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch incidents', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['safety:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateIncidentBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await (ctx.supabase as any)
      .from('chef_incidents')
      .insert({
        ...parsed.data,
        tenant_id: ctx.tenantId,
        follow_up_steps: parsed.data.follow_up_steps ?? [],
        document_urls: parsed.data.document_urls ?? [],
        resolution_status: parsed.data.resolution_status ?? 'open',
      })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/safety/incidents] Create error:', error)
      return apiError('create_failed', 'Failed to create incident', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['safety:write'] }
)
