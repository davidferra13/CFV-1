// API v2: Calls - List & Create
// GET  /api/v2/calls?status=scheduled&call_type=discovery&page=1&per_page=50
// POST /api/v2/calls

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

const CreateCallBody = z.object({
  client_id: z.string().uuid().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_company: z.string().optional(),
  call_type: z.enum([
    'discovery',
    'follow_up',
    'proposal_walkthrough',
    'pre_event_logistics',
    'vendor_supplier',
    'partner',
    'general',
    'prospecting',
  ]),
  inquiry_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  scheduled_at: z.string().min(1),
  duration_minutes: z.number().int().positive().default(30),
  timezone: z.string().optional(),
  title: z.string().optional(),
  prep_notes: z.string().optional(),
  agenda_items: z
    .array(
      z.object({
        item: z.string().min(1),
        source: z.enum(['manual', 'inquiry', 'event']).default('manual'),
      })
    )
    .optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')
    const callType = url.searchParams.get('call_type')
    const clientId = url.searchParams.get('client_id')

    let query = (ctx.supabase as any)
      .from('scheduled_calls')
      .select('*, client:clients(id, full_name, email)', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('scheduled_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (callType) query = query.eq('call_type', callType)
    if (clientId) query = query.eq('client_id', clientId)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch calls', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['calls:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateCallBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Build agenda items with IDs
    const agendaItems = (input.agenda_items || []).map((item, i) => ({
      id: `agenda-${Date.now()}-${i}`,
      item: item.item,
      completed: false,
      source: item.source,
    }))

    const { data, error } = await (ctx.supabase as any)
      .from('scheduled_calls')
      .insert({
        tenant_id: ctx.tenantId,
        client_id: input.client_id || null,
        contact_name: input.contact_name || null,
        contact_phone: input.contact_phone || null,
        contact_company: input.contact_company || null,
        call_type: input.call_type,
        inquiry_id: input.inquiry_id || null,
        event_id: input.event_id || null,
        scheduled_at: input.scheduled_at,
        duration_minutes: input.duration_minutes,
        timezone: input.timezone || 'America/New_York',
        title: input.title || null,
        status: 'scheduled',
        prep_notes: input.prep_notes || null,
        agenda_items: agendaItems,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/calls] Create error:', error)
      return apiError('create_failed', 'Failed to create call', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['calls:write'] }
)
