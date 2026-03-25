// API v2: Loyalty Members - List & Enroll
// GET  /api/v2/loyalty/members?tier=...&search=...&page=1&per_page=50
// POST /api/v2/loyalty/members  (award welcome points to enroll a client)
//
// Loyalty membership is tracked on the clients table (loyalty_points, loyalty_tier).
// "Members" are clients with loyalty_points > 0 or explicit enrollment via welcome points.

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

const EnrollMemberBody = z.object({
  client_id: z.string().uuid(),
  welcome_points: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
})

export const GET = withApiAuth(
  async (req, ctx) => {
    const url = new URL(req.url)
    const pagination = parsePagination(url)
    const tier = url.searchParams.get('tier')
    const search = url.searchParams.get('search')

    // Query clients who have loyalty data (points > 0 or tier set)
    let query = ctx.db
      .from('clients')
      .select(
        'id, full_name, email, phone, loyalty_points, loyalty_tier, total_events_completed, total_guests_served, created_at',
        { count: 'exact' }
      )
      .eq('tenant_id' as any, ctx.tenantId)
      .gt('loyalty_points' as any, -1) // include all clients with loyalty data
      .order('loyalty_points' as any, { ascending: false })

    if (tier) query = query.eq('loyalty_tier' as any, tier)
    if (search) {
      query = query.ilike('full_name' as any, `%${search.replace(/[%_,.()"'\\]/g, '')}%`)
    }

    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) return apiError('database_error', 'Failed to fetch loyalty members', 500)

    return apiSuccess(data ?? [], paginationMeta(pagination, count ?? 0))
  },
  { scopes: ['loyalty:read'] }
)

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = EnrollMemberBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Verify client belongs to tenant
    const { data: client } = await ctx.db
      .from('clients')
      .select('id, full_name, loyalty_points, loyalty_tier')
      .eq('id', input.client_id)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    if (!client) {
      return apiError(
        'client_not_found',
        'Client not found or does not belong to your account',
        404
      )
    }

    const welcomePoints = input.welcome_points ?? 0

    if (welcomePoints > 0) {
      // Insert a welcome bonus transaction
      const { error: txError } = await (ctx.db as any).from('loyalty_transactions').insert({
        tenant_id: ctx.tenantId,
        client_id: input.client_id,
        type: 'bonus',
        points: welcomePoints,
        description: input.description ?? 'Welcome bonus (API enrollment)',
        created_by: ctx.keyId,
      } as any)

      if (txError) {
        console.error('[api/v2/loyalty/members] Transaction error:', txError)
        return apiError('enroll_failed', 'Failed to enroll member', 500)
      }

      // Update client loyalty_points
      const newPoints = ((client as any).loyalty_points ?? 0) + welcomePoints
      await ctx.db
        .from('clients')
        .update({ loyalty_points: newPoints } as any)
        .eq('id', input.client_id)
        .eq('tenant_id' as any, ctx.tenantId)
    }

    // Re-fetch updated client
    const { data: updated } = await ctx.db
      .from('clients')
      .select('id, full_name, email, loyalty_points, loyalty_tier')
      .eq('id', input.client_id)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    return apiCreated(updated)
  },
  { scopes: ['loyalty:write'] }
)
