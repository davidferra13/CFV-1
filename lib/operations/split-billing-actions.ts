// Split Billing Server Actions
// Chef-only: Manage split billing configurations for events
// Uses events.split_billing JSONB column (migration 20260312000006)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const SplitEntrySchema = z.object({
  clientId: z.string().uuid('Client ID must be a valid UUID'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  amountCents: z.number().int().nonnegative('Amount must be non-negative'),
})

const SetSplitBillingSchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  splits: z.array(SplitEntrySchema).min(1, 'At least one split entry is required'),
})

export type SplitEntry = z.infer<typeof SplitEntrySchema>
export type SetSplitBillingInput = z.infer<typeof SetSplitBillingSchema>

// ============================================
// RETURN TYPES
// ============================================

export type SplitBillingConfig = {
  eventId: string
  splits: SplitEntry[]
}

export type SplitInvoice = {
  clientId: string
  percentage: number
  amountCents: number
  calculatedAmountCents: number
}

export type SplitInvoiceSummary = {
  eventId: string
  totalAmountCents: number
  invoices: SplitInvoice[]
}

// ============================================
// HELPERS
// ============================================

function parseSplitBilling(raw: any): SplitEntry[] {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw.map((entry: any) => ({
    clientId: entry.client_id ?? entry.clientId ?? '',
    percentage: entry.percentage ?? 0,
    amountCents: entry.amount_cents ?? entry.amountCents ?? 0,
  }))
}

function serializeSplits(splits: SplitEntry[]): any[] {
  return splits.map((s) => ({
    client_id: s.clientId,
    percentage: s.percentage,
    amount_cents: s.amountCents,
  }))
}

// ============================================
// ACTIONS
// ============================================

/**
 * Set the split billing configuration for an event.
 * Stores the splits array in the events.split_billing JSONB column.
 */
export async function setSplitBilling(eventId: string, splits: SplitEntry[]) {
  const user = await requireChef()
  const validated = SetSplitBillingSchema.parse({ eventId, splits })
  const supabase = createServerClient()

  // Validate that percentages sum to 100
  const totalPercent = validated.splits.reduce((sum, s) => sum + s.percentage, 0)
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Split percentages must sum to 100 (currently ${totalPercent.toFixed(2)})`)
  }

  const { error } = await supabase
    .from('events')
    .update({ split_billing: serializeSplits(validated.splits) } as any)
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setSplitBilling] Error:', error)
    throw new Error('Failed to set split billing')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Get the split billing configuration for an event.
 * Reads and parses the events.split_billing JSONB column.
 */
export async function getSplitBilling(eventId: string): Promise<SplitBillingConfig> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select('id, split_billing' as any)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) {
    console.error('[getSplitBilling] Error:', error)
    throw new Error('Event not found')
  }

  return {
    eventId: (data as any).id,
    splits: parseSplitBilling((data as any).split_billing),
  }
}

/**
 * Generate split invoices for an event based on split_billing config and total amount.
 * Uses the event's quoted_price_cents to calculate each client's share.
 * If explicit amountCents are set on splits, those override the percentage calculation.
 */
export async function generateSplitInvoices(eventId: string): Promise<SplitInvoiceSummary> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select('id, quoted_price_cents, split_billing' as any)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) {
    console.error('[generateSplitInvoices] Error:', error)
    throw new Error('Event not found')
  }

  const event = data as any
  const totalAmountCents: number = event.quoted_price_cents ?? 0
  const splits = parseSplitBilling(event.split_billing)

  if (splits.length === 0) {
    throw new Error('No split billing configured for this event')
  }

  const invoices: SplitInvoice[] = splits.map((split) => {
    // If an explicit amount is set, use it; otherwise calculate from percentage
    const calculatedAmountCents = split.amountCents > 0
      ? split.amountCents
      : Math.round((totalAmountCents * split.percentage) / 100)

    return {
      clientId: split.clientId,
      percentage: split.percentage,
      amountCents: split.amountCents,
      calculatedAmountCents,
    }
  })

  return {
    eventId,
    totalAmountCents,
    invoices,
  }
}
