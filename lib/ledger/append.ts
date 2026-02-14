// Ledger System - Append-Only Financial Truth
// Enforces System Law #3: All financial state derives from ledger

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type LedgerEntryType =
  | 'charge_created'
  | 'charge_succeeded'
  | 'charge_failed'
  | 'refund_created'
  | 'refund_succeeded'
  | 'payout_created'
  | 'payout_paid'
  | 'adjustment'

export type AppendLedgerEntryInput = {
  tenant_id: string
  entry_type: LedgerEntryType
  amount_cents: number // Must be in minor units (cents)
  currency?: string
  event_id?: string
  client_id?: string
  stripe_event_id?: string | null // Idempotency key for webhooks
  stripe_object_id?: string | null // payment_intent_xxx, charge_xxx, etc.
  stripe_event_type?: string | null
  description: string
  metadata?: Record<string, any>
  created_by?: string | null // Null for webhook entries
}

/**
 * Append entry to ledger
 * CRITICAL: This is append-only. Entries are immutable (enforced by triggers)
 */
export async function appendLedgerEntry(input: AppendLedgerEntryInput) {
  // Use service role for webhook calls, otherwise check auth
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
      entry_type: input.entry_type,
      amount_cents: input.amount_cents,
      currency: input.currency || 'usd',
      event_id: input.event_id,
      client_id: input.client_id,
      stripe_event_id: input.stripe_event_id,
      stripe_object_id: input.stripe_object_id,
      stripe_event_type: input.stripe_event_type,
      description: input.description,
      metadata: input.metadata,
      created_by: input.created_by
    })
    .select()
    .single()

  if (error) {
    // Check if duplicate stripe_event_id (idempotency)
    if (error.code === '23505' && error.message.includes('unique_stripe_event')) {
      console.log('[appendLedgerEntry] Duplicate stripe event (idempotent):', input.stripe_event_id)
      return { duplicate: true, entry: null }
    }

    console.error('[appendLedgerEntry] Error:', error)
    throw new Error(`Failed to append ledger entry: ${error.message}`)
  }

  return { duplicate: false, entry: data }
}

/**
 * Create manual adjustment (chef-only)
 * Requires explicit chef authentication and logs who made the adjustment
 */
export async function createAdjustment({
  event_id,
  amount_cents,
  description,
  metadata = {}
}: {
  event_id: string
  amount_cents: number
  description: string
  metadata?: Record<string, any>
}) {
  const user = await requireChef()
  const supabase = createServerClient()

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

  return appendLedgerEntry({
    tenant_id: user.tenantId!,
    entry_type: 'adjustment',
    amount_cents,
    currency: 'usd',
    event_id,
    client_id: event.client_id,
    description,
    metadata: {
      ...metadata,
      adjusted_by: user.email,
      adjusted_at: new Date().toISOString(),
      chef_id: user.entityId
    },
    created_by: user.id
  })
}

/**
 * Get ledger entries for an event (chef-only)
 */
export async function getEventLedger(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getEventLedger] Error:', error)
    throw new Error('Failed to fetch ledger entries')
  }

  return entries
}

/**
 * Get all ledger entries for tenant (chef-only, for financial dashboard)
 */
export async function getTenantLedger(limit = 100) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('*, event:events(title)')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getTenantLedger] Error:', error)
    throw new Error('Failed to fetch tenant ledger')
  }

  return entries
}
