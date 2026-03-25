// API v2: Merge Clients
// POST /api/v2/clients/:id/merge
// Merges another client into this one (this client is kept)

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'

const MergeBody = z.object({
  merge_client_id: z.string().uuid(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const keepId = params?.id
    if (!keepId) return apiNotFound('Client')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = MergeBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const mergeId = parsed.data.merge_client_id

    if (keepId === mergeId) {
      return apiError('invalid_merge', 'Cannot merge a client into itself', 422)
    }

    // Verify both clients belong to tenant
    const { data: keepClient } = await ctx.db
      .from('clients')
      .select('id')
      .eq('id', keepId)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    if (!keepClient) return apiNotFound('Client (keep)')

    const { data: mergeClient } = await ctx.db
      .from('clients')
      .select('id')
      .eq('id', mergeId)
      .eq('tenant_id' as any, ctx.tenantId)
      .single()

    if (!mergeClient) return apiNotFound('Client (merge)')

    // Move all events from merge client to keep client
    await ctx.db
      .from('events')
      .update({ client_id: keepId } as any)
      .eq('client_id', mergeId)
      .eq('tenant_id', ctx.tenantId)

    // Move all inquiries
    await (ctx.db as any)
      .from('inquiries')
      .update({ client_id: keepId })
      .eq('client_id', mergeId)
      .eq('tenant_id', ctx.tenantId)

    // Move all quotes
    await (ctx.db as any)
      .from('quotes')
      .update({ client_id: keepId })
      .eq('client_id', mergeId)
      .eq('tenant_id', ctx.tenantId)

    // Soft-delete the merged client
    await ctx.db
      .from('clients')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', mergeId)
      .eq('tenant_id' as any, ctx.tenantId)

    // Return the kept client
    const { data: result } = await ctx.db.from('clients').select('*').eq('id', keepId).single()

    return apiSuccess(result)
  },
  { scopes: ['clients:write'] }
)
