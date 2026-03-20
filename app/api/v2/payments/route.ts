// API v2: Record Manual Payment
// POST /api/v2/payments
//
// Records a manual payment (cash, check, Venmo, etc.) and appends to the ledger.
// Stripe payments come through webhooks, not this endpoint.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiCreated, apiValidationError, apiError, apiNotFound } from '@/lib/api/v2'

const RecordPaymentBody = z.object({
  event_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  payment_method: z.enum(['cash', 'venmo', 'paypal', 'zelle', 'card', 'check', 'other']),
  entry_type: z.enum(['payment', 'deposit', 'final_payment', 'tip']).optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = RecordPaymentBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const input = parsed.data

    // Verify event belongs to tenant
    const { data: event } = await ctx.supabase
      .from('events')
      .select('id, tenant_id')
      .eq('id', input.event_id)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!event) return apiNotFound('Event')

    // Append ledger entry (immutable, append-only)
    const { data: entry, error } = await ctx.supabase
      .from('ledger_entries')
      .insert({
        tenant_id: ctx.tenantId,
        event_id: input.event_id,
        amount_cents: input.amount_cents,
        entry_type: input.entry_type ?? 'payment',
        payment_method: input.payment_method,
        description: input.description ?? `Manual ${input.payment_method} payment via API`,
        transaction_reference: input.reference ?? `api_${Date.now()}`,
        created_by: ctx.keyId,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[api/v2/payments] Create error:', error)
      return apiError('create_failed', 'Failed to record payment', 500)
    }

    return apiCreated(entry)
  },
  { scopes: ['finance:write'] }
)
