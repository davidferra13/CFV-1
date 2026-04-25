// API v2: Accept Quote
// POST /api/v2/quotes/:id/accept
// Transitions quote from "sent" to "accepted"

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { executeInteraction } from '@/lib/interactions'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Quote')

    const { data: quote, error: fetchErr } = await ctx.db
      .from('quotes')
      .select('id, status, event_id, tenant_id, client_id, inquiry_id, total_quoted_cents')
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

    await executeInteraction({
      action_type: 'approve_quote',
      actor_id: `api_key:${ctx.keyId}`,
      actor: { role: 'system', actorId: `api_key:${ctx.keyId}`, tenantId: ctx.tenantId },
      target_type: (updated as any).event_id ? 'event' : 'system',
      target_id: (updated as any).event_id ?? id,
      context_type: 'client',
      context_id: (updated as any).client_id ?? null,
      visibility: 'private',
      metadata: {
        tenant_id: ctx.tenantId,
        client_id: (updated as any).client_id ?? null,
        quote_id: id,
        inquiry_id: (updated as any).inquiry_id ?? null,
        event_id: (updated as any).event_id ?? null,
        total_quoted_cents: (updated as any).total_quoted_cents ?? null,
        source: 'api_v2',
        api_key_id: ctx.keyId,
        suppress_interaction_notifications: true,
        suppress_interaction_activity: true,
        suppress_interaction_automation: true,
      },
      idempotency_key: `approve_quote:${id}:api_v2`,
    })

    // Log state transition (non-blocking)
    try {
      await ctx.db.from('quote_state_transitions' as any).insert({
        tenant_id: ctx.tenantId,
        quote_id: id,
        from_status: 'sent',
        to_status: 'accepted',
        transitioned_by: null,
        metadata: { source: 'api_v2', api_key_id: ctx.keyId },
      })
    } catch (err) {
      console.error('[v2/quotes/accept] State transition record failed (non-blocking):', err)
    }

    return apiSuccess({ quote: updated, status: 'accepted' })
  },
  { scopes: ['quotes:write'] }
)
