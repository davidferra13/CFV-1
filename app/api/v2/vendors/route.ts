// API v2: Vendors - List & Create
// GET  /api/v2/vendors?status=active&vendor_type=grocery&q=search&is_preferred=true&page=1&per_page=50
// POST /api/v2/vendors

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

const CreateVendorBody = z.object({
  name: z.string().min(1),
  vendor_type: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  account_number: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  is_preferred: z.boolean().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const status = url.searchParams.get('status')
    const vendorType = url.searchParams.get('vendor_type')
    const q = url.searchParams.get('q')
    const isPreferred = url.searchParams.get('is_preferred')
    const activeOnly = url.searchParams.get('active_only') !== 'false'

    let query = (ctx.supabase as any)
      .from('vendors')
      .select('*', { count: 'exact' })
      .eq('chef_id', ctx.tenantId)
      .order('name', { ascending: true })

    // Specific status filter takes precedence over active_only
    if (status) {
      query = query.eq('status', status)
    } else if (activeOnly) {
      query = query.eq('status', 'active')
    }
    if (vendorType) query = query.eq('vendor_type', vendorType)
    if (q) query = query.ilike('name', `%${q}%`)
    if (isPreferred === 'true') query = query.eq('is_preferred', true)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch vendors', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['vendors:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreateVendorBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await (ctx.supabase as any)
      .from('vendors')
      .insert({
        ...parsed.data,
        vendor_type: parsed.data.vendor_type || 'grocery',
        status: 'active',
        chef_id: ctx.tenantId,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/vendors] Create error:', error)
      return apiError('create_failed', 'Failed to create vendor', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['vendors:write'] }
)
