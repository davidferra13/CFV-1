// API v2: Partners - List & Create
// GET  /api/v2/partners?type=venue&status=active&q=search&page=1&per_page=50
// POST /api/v2/partners

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

const CreatePartnerBody = z.object({
  name: z.string().min(1),
  partner_type: z
    .enum(['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other'])
    .default('individual'),
  contact_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  booking_url: z.string().url().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  commission_notes: z.string().optional(),
  is_showcase_visible: z.boolean().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const partnerType = url.searchParams.get('type')
    const status = url.searchParams.get('status')
    const q = url.searchParams.get('q')

    let query = (ctx.supabase as any)
      .from('referral_partners')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('name', { ascending: true })

    if (partnerType) query = query.eq('partner_type', partnerType)
    if (status) query = query.eq('status', status)
    if (q) query = query.ilike('name', `%${q}%`)

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch partners', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['partners:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CreatePartnerBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { data, error } = await (ctx.supabase as any)
      .from('referral_partners')
      .insert({
        tenant_id: ctx.tenantId,
        name: parsed.data.name,
        partner_type: parsed.data.partner_type,
        contact_name: parsed.data.contact_name || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
        booking_url: parsed.data.booking_url || null,
        description: parsed.data.description || null,
        notes: parsed.data.notes || null,
        commission_notes: parsed.data.commission_notes || null,
        is_showcase_visible: parsed.data.is_showcase_visible ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/v2/partners] Create error:', error)
      return apiError('create_failed', 'Failed to create partner', 500)
    }

    return apiCreated(data)
  },
  { scopes: ['partners:write'] }
)
