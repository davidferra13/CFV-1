// API v2: Accept Quote
// POST /api/v2/quotes/:id/accept
// Transitions quote from "sent" to "accepted"

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Quote')

    const { data: quote, error: fetchErr } = await ctx.db
      .from('quotes')
      .select('id, status, event_id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (fetchErr || !quote) return apiNotFound('Quote')

    if ((quote as any).status !== 'sent') {
      return apiError(
        'invalid_status',
        `Quote is "${(quote as any).status}", only sent quotes can be accepted`,
        422
      )
    }

    const { data: updated, error } = await ctx.db
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/quotes/accept] Error:', error)
      return apiError('accept_failed', 'Failed to accept quote', 500)
    }

    // Log state transition (non-blocking)
    try {
      await ctx.db.from('quote_state_transitions' as any).insert({
        tenant_id: ctx.tenantId,
        quote_id: id,
        from_status: 'sent',
        to_status: 'accepted',
        transitioned_by: ctx.keyId,
        metadata: { source: 'api_v2' },
      })
    } catch {}

    return apiSuccess({ quote: updated, status: 'accepted' })
  },
  { scopes: ['quotes:write'] }
)
