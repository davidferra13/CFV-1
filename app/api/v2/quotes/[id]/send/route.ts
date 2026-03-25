// API v2: Send Quote to Client
// POST /api/v2/quotes/:id/send
// Transitions quote from "draft" to "sent"

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Quote')

    const { data: quote, error: fetchErr } = await ctx.db
      .from('quotes')
      .select('id, status, client_id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (fetchErr || !quote) return apiNotFound('Quote')

    if ((quote as any).status !== 'draft') {
      return apiError(
        'invalid_status',
        `Quote is "${(quote as any).status}", only draft quotes can be sent`,
        422
      )
    }

    const { data: updated, error } = await ctx.db
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/quotes/send] Error:', error)
      return apiError('send_failed', 'Failed to send quote', 500)
    }

    // Log state transition (non-blocking)
    try {
      await ctx.db.from('quote_state_transitions' as any).insert({
        tenant_id: ctx.tenantId,
        quote_id: id,
        from_status: 'draft',
        to_status: 'sent',
        transitioned_by: ctx.keyId,
        metadata: { source: 'api_v2' },
      })
    } catch {}

    return apiSuccess({ quote: updated, status: 'sent' })
  },
  { scopes: ['quotes:write'] }
)
