// Ledger System - Append-Only Financial Truth
// Enforces System Law #3: All financial state derives from ledger

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import type { Database } from '@/types/database'

export type LedgerEntryType = Database['public']['Enums']['ledger_entry_type']
// 'payment' | 'deposit' | 'installment' | 'final_payment' | 'tip' | 'refund' | 'adjustment' | 'add_on' | 'credit'

export type PaymentMethod = Database['public']['Enums']['payment_method']
// 'cash' | 'venmo' | 'paypal' | 'zelle' | 'card' | 'check'

export type AppendLedgerEntryInput = {
  tenant_id: string
  client_id: string
  entry_type: LedgerEntryType
  amount_cents: number
  payment_method: PaymentMethod
  description: string
  event_id?: string | null
  transaction_reference?: string | null // For idempotency (e.g., Stripe event ID)
  payment_card_used?: string | null
  internal_notes?: string | null
  is_refund?: boolean
  refund_reason?: string | null
  refunded_entry_id?: string | null
  received_at?: string | null
  created_by?: string | null // Null for webhook entries
}

/**
 * Append ledger entry on behalf of an authenticated chef.
 * Caller should NOT provide tenant_id or created_by; these are filled from the session.
 */
export async function appendLedgerEntryForChef(
  input: Omit<AppendLedgerEntryInput, 'tenant_id' | 'created_by'>
) {
  const user = await requireChef()

  return appendLedgerEntryInternal({
    ...input,
    tenant_id: user.tenantId!,
    created_by: user.id,
  })
}

/**
 * Internal ledger append - NOT exported as a server action.
 * Only callable from other server-side functions in this module or via
 * the explicit re-export in lib/ledger/internal.ts for webhook use.
 * CRITICAL: This is append-only. Entries are immutable (enforced by triggers)
 */
async function appendLedgerEntryInternal(input: AppendLedgerEntryInput) {
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
 * Webhook-safe ledger append - for use by the Stripe webhook handler only.
 * This is a named export but NOT directly callable by clients because
 * callers must provide valid tenant_id/client_id/event_id from verified webhook data.
 * The function itself validates nothing about the caller - the webhook handler
 * is responsible for signature verification before calling this.
 */
export async function appendLedgerEntryFromWebhook(
  input: AppendLedgerEntryInput & { created_by: null }
) {
  return appendLedgerEntryInternal(input)
}

/**
 * Create manual adjustment (chef-only)
 * Requires explicit chef authentication and logs who made the adjustment
 */
export async function createAdjustment({
  event_id,
  amount_cents,
  description,
  payment_method = 'cash',
  internal_notes,
  idempotency_key,
}: {
  event_id: string
  amount_cents: number
  description: string
  payment_method?: PaymentMethod
  internal_notes?: string
  idempotency_key?: string
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event to validate ownership
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('tenant_id, client_id')
    .eq('id', event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or does not belong to your tenant')
  }

  // Generate a transaction_reference for idempotency - prevents double-click double-entry.
  // If the caller provides an idempotency_key, use it; otherwise generate one from inputs.
  const transaction_reference = idempotency_key
    ? `adj_${idempotency_key}`
    : `adj_${event_id}_${amount_cents}_${Date.now()}`

  const result = await appendLedgerEntryInternal({
    tenant_id: user.tenantId!,
    client_id: event.client_id,
    entry_type: 'adjustment',
    amount_cents,
    payment_method,
    description,
    event_id,
    transaction_reference,
    internal_notes: internal_notes || `Adjusted by ${user.email} at ${new Date().toISOString()}`,
    created_by: user.id,
  })

  // Log chef activity (non-blocking, captured in side_effect_failures)
  {
    const { nonBlocking } = await import('@/lib/monitoring/non-blocking')
    await nonBlocking(
      {
        source: 'ledger-append',
        operation: 'log_chef_activity',
        severity: 'high',
        entityType: 'ledger_entry',
        entityId: result.entry?.id,
        tenantId: user.tenantId,
        context: { event_id, amount_cents },
      },
      async () => {
        const { logChefActivity } = await import('@/lib/activity/log-chef')
        await logChefActivity({
          tenantId: user.tenantId!,
          actorId: user.id,
          action: 'ledger_entry_created',
          domain: 'financial',
          entityType: 'ledger_entry',
          entityId: result.entry?.id,
          summary: `Recorded adjustment: $${(amount_cents / 100).toFixed(2)} - ${description}`,
          context: {
            amount_cents,
            entry_type: 'adjustment',
            payment_method,
            event_id,
            amount_display: `$${(amount_cents / 100).toFixed(2)}`,
          },
          clientId: event.client_id,
        })
      }
    )
  }

  return result
}

/**
 * Get ledger entries for an event (chef-only)
 */
export async function getEventLedger(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    log.ledger.error('Failed to fetch event ledger', { error, context: { eventId } })
    throw new Error('Failed to fetch ledger entries')
  }

  return entries
}

/**
 * Get all ledger entries for tenant (chef-only, for financial dashboard)
 */
export async function getTenantLedger(limit = 100) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select(
      `
      *,
      event:events(id, occasion, event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    log.ledger.error('Failed to fetch tenant ledger', { error })
    throw new Error('Failed to fetch tenant ledger')
  }

  return entries
}
