// API v2: Send Quote to Client
// POST /api/v2/quotes/:id/send
// Transitions quote from "draft" to "sent"

import { withApiAuth, apiSuccess, apiNotFound, apiError } from '@/lib/api/v2'
import { executeInteraction } from '@/lib/interactions'

export const POST = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Quote')

    const { data: quote, error: fetchErr } = await ctx.db
      .from('quotes')
      .select('id, status, client_id, tenant_id, event_id, inquiry_id, total_quoted_cents')
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

    await executeInteraction({
      action_type: 'send_quote',
      actor_id: `api_key:${ctx.keyId}`,
      actor: { role: 'system', actorId: `api_key:${ctx.keyId}`, tenantId: ctx.tenantId },
      target_type: (updated as any).event_id ? 'event' : 'system',
      target_id: (updated as any).event_id ?? id,
      context_type: 'client',
      context_id: (updated as any).client_id,
      visibility: 'private',
      metadata: {
        tenant_id: ctx.tenantId,
        client_id: (updated as any).client_id,
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
      idempotency_key: `send_quote:${id}:api_v2`,
    })

    // Log state transition (non-blocking)
    try {
      await ctx.db.from('quote_state_transitions' as any).insert({
        tenant_id: ctx.tenantId,
        quote_id: id,
        from_status: 'draft',
        to_status: 'sent',
        transitioned_by: null,
        metadata: { source: 'api_v2', api_key_id: ctx.keyId },
      })
    } catch (err) {
      console.error('[v2/quotes/send] State transition record failed (non-blocking):', err)
    }

    return apiSuccess({ quote: updated, status: 'sent' })
  },
  { scopes: ['quotes:write'] }
)
