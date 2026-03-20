// Internal ledger append functions - NOT a server action file.
// These functions run on the server but are NOT directly callable from the client.
// Only import from other server-side code (webhook routes, server actions).

import { createServerClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import type { AppendLedgerEntryInput } from './append'

/**
 * Core ledger append. NOT exported as a server action.
 * Append-only: entries are immutable (enforced by DB triggers).
 */
export async function appendLedgerEntryInternal(input: AppendLedgerEntryInput) {
  // Use service role for webhook calls (created_by === null), otherwise anon key
  const useServiceRole = input.created_by === null
  const supabase = createServerClient({ admin: useServiceRole })

  // Validate amounts are integers (minor units only)
  if (!Number.isInteger(input.amount_cents)) {
    throw new Error('Amount must be in minor units (cents, integer only)')
  }

  const { data, error } = await supabase
    .from('ledger_entries')
    .insert({
      tenant_id: input.tenant_id,
      client_id: input.client_id,
      entry_type: input.entry_type,
      amount_cents: input.amount_cents,
      payment_method: input.payment_method,
      description: input.description,
      event_id: input.event_id,
      transaction_reference: input.transaction_reference,
      payment_card_used: input.payment_card_used,
      internal_notes: input.internal_notes,
      is_refund: input.is_refund,
      refund_reason: input.refund_reason,
      refunded_entry_id: input.refunded_entry_id,
      received_at: input.received_at,
      created_by: input.created_by,
    })
    .select()
    .single()

  if (error) {
    // Check if duplicate transaction_reference (idempotency)
    if (error.code === '23505' && input.transaction_reference) {
      log.ledger.info('Duplicate transaction (idempotent)', {
        context: { transaction_reference: input.transaction_reference },
      })
      return { duplicate: true, entry: null }
    }

    log.ledger.error('Failed to append entry', { error, context: { entry_type: input.entry_type } })
    throw new Error('Failed to append ledger entry')
  }

  // Outbound webhook (non-blocking)
  try {
    const { emitWebhook } = await import('@/lib/webhooks/emitter')
    await emitWebhook(input.tenant_id, 'payment.received', {
      ledger_entry_id: data.id,
      entry_type: input.entry_type,
      amount_cents: input.amount_cents,
      event_id: input.event_id,
    })
  } catch (err) {
    console.error('[non-blocking] payment.received webhook failed', err)
  }

  return { duplicate: false, entry: data }
}

/**
 * Webhook-safe ledger append. For use by Stripe webhook handler and
 * other trusted server-side callers only.
 *
 * NOT a server action (not in a 'use server' file), so it cannot be
 * called directly from client code.
 */
export async function appendLedgerEntryFromWebhook(
  input: AppendLedgerEntryInput & { created_by: null }
) {
  return appendLedgerEntryInternal(input)
}
