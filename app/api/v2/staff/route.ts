// API v2: Staff - List & Create
// GET  /api/v2/staff?status=active&role=sous_chef&q=search&page=1&per_page=50
// POST /api/v2/staff

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

const CreateStaffBody = z.object({
  name: z.string().min(1),
  role: z.enum([
    'sous_chef',
    'kitchen_assistant',
    'service_staff',
    'server',
    'bartender',
    'dishwasher',
    'other',
  ]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  hourly_rate_cents: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')
    const role = url.searchParams.get('role')
    const q = url.searchParams.get('q')
    const activeOnly = url.searchParams.get('active_only') !== 'false'

    let query = (ctx.db as any)
      .from('staff_members')
      .select(
        'id, chef_id, name, role, phone, email, notes, is_active, status, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('chef_id', ctx.tenantId)
      .order('name', { ascending: true })

    // Specific status filter takes precedence over active_only
    if (status) {
      query = query.eq('status', status)
    } else if (activeOnly) {
      query = query.eq('is_active', true)
    }
    if (role) query = query.eq('role', role)
    if (q) query = query.ilike('name', `%${q}%`)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch staff', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['staff:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateStaffBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await (ctx.db as any)
      .from('staff_members')
      .insert({
        ...parsed.data,
        chef_id: ctx.tenantId,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/staff] Create error:', error)
      return apiError('create_failed', 'Failed to create staff member', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['staff:write'] }
)
