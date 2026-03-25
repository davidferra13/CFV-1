// API v2: Clients - List & Create
// GET  /api/v2/clients?q=search&status=active&page=1&per_page=50
// POST /api/v2/clients

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

const CreateClientBody = z.object({
  full_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'lead', 'archived']).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const q = url.searchParams.get('q')
    const status = url.searchParams.get('status')

    let query = ctx.db
      .from('clients')
      .select(
        'id, full_name, email, phone, status, dietary_restrictions, allergies, created_at, updated_at',
        {
          count: 'exact',
        }
      )
      .eq('chef_id', ctx.tenantId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status as any)
    if (q) query = query.ilike('full_name', `%${q}%`)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch clients', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['clients:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateClientBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    const { data: client, error } = await ctx.db
      .from('clients')
      .insert({
        chef_id: ctx.tenantId,
        tenant_id: ctx.tenantId,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone,
        status: input.status ?? 'active',
        dietary_restrictions: input.dietary_restrictions,
        allergies: input.allergies,
        notes: input.notes,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        source: input.source ?? 'api',
        tags: input.tags,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/clients] Create error:', error)
      return apiError('create_failed', 'Failed to create client', 500)
    }

    return apiCreated(client)
  },
  { scopes: ['clients:write'] }
)
