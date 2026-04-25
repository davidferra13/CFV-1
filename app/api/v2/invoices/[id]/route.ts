// API v2: Invoices - Get & Update by ID
// GET   /api/v2/invoices/:id
// PATCH /api/v2/invoices/:id
//
// Invoices are computed views over events + ledger_entries.
// The "id" here is the event ID. PATCH can assign/update invoice metadata.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { withApiAuth, apiSuccess, apiNotFound, apiValidationError, apiError } from '@/lib/api/v2'
import { appendLedgerEntryInternal } from '@/lib/ledger/append-internal'
import { executeInteraction } from '@/lib/interactions'

const UpdateInvoiceBody = z
  .object({
    invoice_number: z.string().min(1).optional(),
    invoice_issued_at: z.string().optional(),
    invoice_notes: z.string().optional(),
    mark_paid: z.boolean().optional(),
    paid_amount_cents: z.number().int().positive().max(99_999_999).optional(),
    payment_method: z.enum(['cash', 'venmo', 'paypal', 'zelle', 'card', 'check']).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mark_paid) {
      if (!val.paid_amount_cents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'paid_amount_cents is required when mark_paid is true',
          path: ['paid_amount_cents'],
        })
      }
      if (!val.payment_method) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'payment_method is required when mark_paid is true',
          path: ['payment_method'],
        })
      }
    }
  })

export const GET = withApiAuth(
  async (_req, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Invoice')

    const { data, error } = await ctx.db
      .from('events')
      .select(
        'id, status, occasion, event_date, guest_count, quoted_price_cents, invoice_number, invoice_issued_at, invoice_notes, client:clients(id, full_name, email)'
      )
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .not('invoice_number', 'is', null)
      .single()

    if (error || !data) return apiNotFound('Invoice')
    return apiSuccess(data)
  },
  { scopes: ['finance:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Invoice')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateInvoiceBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Verify event belongs to tenant and has an invoice
    const { data: existing } = await ctx.db
      .from('events')
      .select('id, invoice_number, client_id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (!existing) return apiNotFound('Invoice')

    // If no invoice_number yet and one is being set, allow it.
    // If no invoice_number yet and none is being set, reject.
    if (!existing.invoice_number && !parsed.data.invoice_number) {
      return apiError(
        'no_invoice',
        'This event does not have an invoice yet. Provide invoice_number to assign one.',
        422
      )
    }

    // If mark_paid, append a ledger entry BEFORE updating the event record.
    // Idempotent on transaction_reference = invoice_paid_{event_id}.
    if (parsed.data.mark_paid) {
      const { data: eventDetail } = await ctx.db
        .from('events')
        .select('client_id, invoice_number')
        .eq('id', id)
        .eq('tenant_id', ctx.tenantId)
        .single()

      if (!(eventDetail as any)?.client_id) {
        return apiError(
          'missing_client',
          'Event must have an associated client to record payment',
          422
        )
      }

      try {
        await appendLedgerEntryInternal({
          tenant_id: ctx.tenantId,
          client_id: (eventDetail as any).client_id,
          entry_type: 'payment',
          amount_cents: parsed.data.paid_amount_cents!,
          payment_method: parsed.data.payment_method!,
          description: `Invoice payment${(eventDetail as any).invoice_number ? ` (Invoice #${(eventDetail as any).invoice_number})` : ''}`,
          event_id: id,
          transaction_reference: `invoice_paid_${id}`,
          created_by: null,
        })
        // Bust financial caches after ledger write
        revalidatePath('/dashboard')
        revalidatePath('/finance')
        revalidatePath(`/events/${id}`)
        await executeInteraction({
          action_type: 'mark_paid',
          actor_id: `api_key:${ctx.keyId}`,
          actor: { role: 'system', actorId: `api_key:${ctx.keyId}`, tenantId: ctx.tenantId },
          target_type: 'event',
          target_id: id,
          context_type: 'client',
          context_id: (eventDetail as any).client_id,
          visibility: 'private',
          metadata: {
            tenant_id: ctx.tenantId,
            client_id: (eventDetail as any).client_id,
            event_id: id,
            amount_cents: parsed.data.paid_amount_cents,
            payment_method: parsed.data.payment_method,
            source: 'api_v2_invoice',
            api_key_id: ctx.keyId,
            suppress_interaction_notifications: true,
            suppress_interaction_activity: true,
            suppress_interaction_automation: true,
          },
          idempotency_key: `mark_paid:invoice:${id}:${parsed.data.paid_amount_cents}`,
        })
      } catch (ledgerErr: any) {
        // Only throw if it's not a duplicate (idempotent re-call is fine)
        if (!ledgerErr?.message?.includes('duplicate')) {
          console.error('[api/v2/invoices] Ledger append error:', ledgerErr)
          return apiError('ledger_failed', 'Failed to record payment in ledger', 500)
        }
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.invoice_number !== undefined) {
      updatePayload.invoice_number = parsed.data.invoice_number
    }
    if (parsed.data.invoice_issued_at !== undefined) {
      updatePayload.invoice_issued_at = parsed.data.invoice_issued_at
    }
    if (parsed.data.invoice_notes !== undefined) {
      updatePayload.invoice_notes = parsed.data.invoice_notes
    }

    const { data, error } = await ctx.db
      .from('events')
      .update(updatePayload as any)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select(
        'id, status, occasion, event_date, guest_count, quoted_price_cents, invoice_number, invoice_issued_at, invoice_notes, client:clients(id, full_name, email)'
      )
      .single()

    if (error) {
      console.error('[api/v2/invoices] Update error:', error)
      return apiError('update_failed', 'Failed to update invoice', 500)
    }

    if (parsed.data.invoice_number !== undefined) {
      await executeInteraction({
        action_type: 'send_invoice',
        actor_id: `api_key:${ctx.keyId}`,
        actor: { role: 'system', actorId: `api_key:${ctx.keyId}`, tenantId: ctx.tenantId },
        target_type: 'event',
        target_id: id,
        context_type: 'client',
        context_id: (existing as any).client_id,
        visibility: 'private',
        metadata: {
          tenant_id: ctx.tenantId,
          client_id: (existing as any).client_id,
          event_id: id,
          invoice_number: parsed.data.invoice_number,
          source: 'api_v2_invoice',
          api_key_id: ctx.keyId,
          suppress_interaction_notifications: true,
          suppress_interaction_activity: true,
          suppress_interaction_automation: true,
        },
        idempotency_key: `send_invoice:${id}:${parsed.data.invoice_number}`,
      })
    }

    return apiSuccess(data)
  },
  { scopes: ['finance:write'] }
)
