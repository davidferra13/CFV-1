// API v2: Menus - List & Create
// GET  /api/v2/menus?event_id=...&page=1&per_page=50
// POST /api/v2/menus

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

const CreateMenuBody = z.object({
  event_id: z.string().uuid().optional(),
  menu_name: z.string().min(1),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  cuisine_type: z.string().optional(),
  target_guest_count: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const eventId = url.searchParams.get('event_id')

    let query = ctx.db
      .from('menus')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch menus', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['menus:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateMenuBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // If event_id provided, verify it belongs to tenant
    if (input.event_id) {
      const { data: event } = await ctx.db
        .from('events')
        .select('id')
        .eq('id', input.event_id)
        .eq('tenant_id', ctx.tenantId)
        .single()

      if (!event) {
        return apiError(
          'event_not_found',
          'Event not found or does not belong to your account',
          404
        )
      }
    }

    const { data: menu, error } = await ctx.db
      .from('menus')
      .insert({
        tenant_id: ctx.tenantId,
        event_id: input.event_id ?? null,
        menu_name: input.menu_name,
        service_style: input.service_style,
        cuisine_type: input.cuisine_type,
        target_guest_count: input.target_guest_count,
        notes: input.notes,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/menus] Create error:', error)
      return apiError('create_failed', 'Failed to create menu', 500)
    }

    return apiCreated(menu)
  },
  { scopes: ['menus:write'] }
)
