// API v2: Loyalty Members - Get & Update by client ID
// GET   /api/v2/loyalty/members/:id  (client ID)
// PATCH /api/v2/loyalty/members/:id  (adjust points, update tier)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateMemberBody = z
  .object({
    adjust_points: z.number().int().optional(),
    adjustment_description: z.string().optional(),
    loyalty_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Loyalty member')

    // Fetch client with loyalty data
    const { data: client, error } = await ctx.db
      .from('clients')
      .select(
        'id, full_name, email, phone, loyalty_points, loyalty_tier, total_events_completed, total_guests_served, created_at'
      )
      .eq('id', id)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    if (error || !client) return apiNotFound('Loyalty member')

    // Fetch transaction history
    const { data: transactions } = await (ctx.db as any)
      .from('loyalty_transactions')
      .select('id, type, points, description, event_id, created_at')
      .eq('client_id', id)
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })
      .limit(100)

    return apiSuccess({
      ...client,
      transactions: transactions ?? [],
    })
  },
  { scopes: ['loyalty:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Loyalty member')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateMemberBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Verify client belongs to tenant
    const { data: client } = await ctx.db
      .from('clients')
      .select('id, loyalty_points, loyalty_tier')
      .eq('id', id)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    if (!client) return apiNotFound('Loyalty member')

    // Handle point adjustment
    if (input.adjust_points && input.adjust_points !== 0) {
      const txType = input.adjust_points > 0 ? 'bonus' : 'adjustment'

      const { error: txError } = await (ctx.db as any).from('loyalty_transactions').insert({
        tenant_id: ctx.tenantId,
        client_id: id,
        type: txType,
        points: input.adjust_points,
        description:
          input.adjustment_description ??
          `Manual adjustment via API (${input.adjust_points > 0 ? '+' : ''}${input.adjust_points} pts)`,
        created_by: ctx.keyId,
      } as any)

      if (txError) {
        console.error('[api/v2/loyalty/members] Transaction error:', txError)
        return apiError('update_failed', 'Failed to record point adjustment', 500)
      }
    }

    // Build client update payload
    const updates: Record<string, unknown> = {}

    if (input.adjust_points && input.adjust_points !== 0) {
      updates.loyalty_points = ((client as any).loyalty_points ?? 0) + input.adjust_points
    }
    if (input.loyalty_tier) {
      updates.loyalty_tier = input.loyalty_tier
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await ctx.db
        .from('clients')
        .update(updates as any)
        .eq('id', id)
        .eq('tenant_id' as any, ctx.tenantId)

      if (error) {
        console.error('[api/v2/loyalty/members] Update error:', error)
        return apiError('update_failed', 'Failed to update loyalty member', 500)
      }
    }

    // Re-fetch updated client
    const { data: updated } = await ctx.db
      .from('clients')
      .select('id, full_name, email, loyalty_points, loyalty_tier')
      .eq('id', id)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    return apiSuccess(updated)
  },
  { scopes: ['loyalty:write'] }
)
