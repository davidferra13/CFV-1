// Ledger System - Append-Only Financial Truth
// Enforces System Law #3: All financial state derives from ledger
//
// SECURITY NOTE: This is a 'use server' file. Every export becomes a callable
// server action. The appendLedgerEntryFromWebhook function has been moved to
// append-internal.ts (NOT a server action) to prevent direct client invocation.
// Import from '@/lib/ledger/append-internal' for webhook/internal server use.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import { appendLedgerEntryInternal } from './append-internal'

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

  const result = await appendLedgerEntryInternal({
    ...input,
    tenant_id: user.tenantId!,
    created_by: user.id,
  })

  // Bust cached pages that display financial data
  if (input.event_id) revalidatePath(`/events/${input.event_id}`)
  revalidatePath('/events')
  revalidatePath('/dashboard')
  revalidatePath('/finance')

  // Bust Remy context cache so AI reflects financial change immediately (non-blocking)
  try {
    const { invalidateRemyContextCache } = await import('@/lib/ai/remy-context')
    invalidateRemyContextCache(user.tenantId!)
  } catch {
    /* non-blocking */
  }

  return result
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
  const db: any = createServerClient()

  // Fetch event to validate ownership
  const { data: event, error: eventError } = await db
    .from('events')
    .select('tenant_id, client_id')
    .eq('id', event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or does not belong to your tenant')
  }

  // Generate a transaction_reference for idempotency - prevents double-click double-entry.
  // Deterministic key: same event + amount + description = same reference.
  const transaction_reference = idempotency_key
    ? `adj_${idempotency_key}`
    : `adj_${event_id}_${amount_cents}_${description.slice(0, 32).replace(/\s+/g, '_')}`

  // Handle negative adjustments (discounts, credits): the ledger requires
  // is_refund=true for negative amounts. We route negative adjustments through
  // the 'credit' entry type with is_refund=true so the sign guard is satisfied.
  const isNegative = amount_cents < 0
  const result = await appendLedgerEntryInternal({
    tenant_id: user.tenantId!,
    client_id: event.client_id,
    entry_type: isNegative ? 'credit' : 'adjustment',
    amount_cents: isNegative ? amount_cents : amount_cents, // negative stays negative
    payment_method,
    description,
    event_id,
    transaction_reference,
    internal_notes: internal_notes || `Adjusted by ${user.email} at ${new Date().toISOString()}`,
    created_by: user.id,
    is_refund: isNegative ? true : undefined,
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

  // Bust cached pages that display financial data
  revalidatePath(`/events/${event_id}`)
  revalidatePath('/events')
  revalidatePath('/dashboard')
  revalidatePath('/finance')

  // Bust Remy context cache so AI reflects financial change immediately (non-blocking)
  try {
    const { invalidateRemyContextCache } = await import('@/lib/ai/remy-context')
    invalidateRemyContextCache(user.tenantId!)
  } catch {
    /* non-blocking */
  }

  return result
}

/**
 * Get ledger entries for an event (chef-only)
 */
export async function getEventLedger(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: entries, error } = await db
    .from('ledger_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    const { log } = await import('@/lib/logger')
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
  const db: any = createServerClient()

  const { data: entries, error } = await db
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
    const { log } = await import('@/lib/logger')
    log.ledger.error('Failed to fetch tenant ledger', { error })
    throw new Error('Failed to fetch tenant ledger')
  }

  return entries
}
