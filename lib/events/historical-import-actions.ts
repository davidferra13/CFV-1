// Historical Event Import - Server Actions
// Creates past events directly in `completed` status, bypassing the FSM.
// Intended for onboarding: chefs logging events from before they joined ChefFlow.
//
// DESIGN DECISIONS:
// - Events are inserted directly as `completed` - no state transitions logged.
// - If a payment amount is provided, a ledger entry IS created so financials are accurate.
// - If a client name is provided without an ID, we find the first name-match or create a minimal client.
// - Location fields default to "Imported" to satisfy DB constraints (chef can update later).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type HistoricalEventInput = {
  event_date: string // YYYY-MM-DD required
  client_id: string | null // UUID of existing client - if provided, skip name lookup
  client_name: string | null // Used to find/create client if client_id is null
  occasion: string | null
  guest_count: number | null
  location_city: string | null
  service_style: 'plated' | 'family_style' | 'buffet' | 'cocktail' | 'tasting_menu' | 'other' | null
  amount_paid_cents: number | null // If > 0, creates a ledger entry
  payment_method: 'cash' | 'venmo' | 'paypal' | 'zelle' | 'card' | 'check' | 'other' | null
  notes: string | null
}

export type HistoricalEventResult = {
  success: boolean
  eventId?: string
  clientId?: string
  clientCreated?: boolean
  error?: string
  label: string // human-readable description for result display
}

// ============================================
// RESOLVE CLIENT
// Find existing client by ID or name, or create a minimal record.
// ============================================

async function resolveClient(
  db: any,
  tenantId: string,
  userId: string,
  clientId: string | null,
  clientName: string | null
): Promise<{ id: string; created: boolean }> {
  // If a UUID was explicitly provided, trust it.
  if (clientId) {
    const { data } = await db
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()
    if (data) return { id: data.id, created: false }
    throw new Error(`Client ID ${clientId} not found in your account`)
  }

  if (!clientName || clientName.trim().length < 2) {
    throw new Error('A client name or existing client must be provided')
  }

  const name = clientName.trim()

  // Try to find an existing client by name (case-insensitive)
  const { data: existing } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('full_name', name)
    .limit(1)
    .single()

  if (existing) return { id: existing.id, created: false }

  // Create a minimal client record
  const placeholderEmail = `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.import`

  const { data: newClient, error } = await db
    .from('clients')
    .insert({
      tenant_id: tenantId,
      full_name: name,
      email: placeholderEmail,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !newClient) {
    throw new Error(`Failed to create client record for "${name}"`)
  }

  return { id: newClient.id, created: true }
}

// ============================================
// IMPORT SINGLE HISTORICAL EVENT
// ============================================

export async function importHistoricalEvent(
  input: HistoricalEventInput
): Promise<HistoricalEventResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const label = [input.event_date, input.client_name || 'Unknown client', input.occasion || '']
    .filter(Boolean)
    .join(' - ')

  try {
    // 1. Resolve client
    const { id: resolvedClientId, created: clientCreated } = await resolveClient(
      db,
      user.tenantId!,
      user.id,
      input.client_id,
      input.client_name
    )

    // 2. Insert event directly as `completed`
    const city = input.location_city?.trim() || 'Imported'
    const { data: event, error: eventError } = await db
      .from('events')
      .insert({
        tenant_id: user.tenantId!,
        client_id: resolvedClientId,
        status: 'completed',
        event_date: input.event_date,
        serve_time: '12:00',
        guest_count: input.guest_count ?? 1,
        occasion: input.occasion || null,
        service_style: input.service_style || null,
        location_address: city,
        location_city: city,
        location_state: null,
        location_zip: '00000',
        site_notes: [input.notes, '[Historical import - logged during onboarding]']
          .filter(Boolean)
          .join('\n'),
        quoted_price_cents: input.amount_paid_cents ?? null,
        payment_status: input.amount_paid_cents && input.amount_paid_cents > 0 ? 'paid' : 'unpaid',
        pricing_model: input.amount_paid_cents ? 'flat_rate' : null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (eventError || !event) {
      console.error('[importHistoricalEvent] Event insert error:', eventError)
      throw new Error('Failed to create historical event record')
    }

    // 3. Optionally create ledger entry for the payment
    if (input.amount_paid_cents && input.amount_paid_cents > 0) {
      const paymentMethod = input.payment_method || 'cash'
      const { error: ledgerError } = await db.from('ledger_entries').insert({
        tenant_id: user.tenantId!,
        client_id: resolvedClientId,
        event_id: event.id,
        entry_type: 'payment',
        amount_cents: input.amount_paid_cents,
        payment_method: paymentMethod,
        description: `Historical payment - ${input.occasion || input.event_date}`,
        received_at: `${input.event_date}T00:00:00Z`,
        internal_notes: 'Imported from historical records during chef onboarding',
        created_by: user.id,
      })

      if (ledgerError) {
        // Ledger failure is logged but not fatal - the event still exists
        console.error('[importHistoricalEvent] Ledger insert error:', ledgerError)
      }
    }

    revalidatePath('/events')
    revalidatePath('/financials')

    return {
      success: true,
      eventId: event.id,
      clientId: resolvedClientId,
      clientCreated,
      label,
    }
  } catch (err) {
    console.error('[importHistoricalEvent] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      label,
    }
  }
}

// ============================================
// IMPORT MULTIPLE HISTORICAL EVENTS (BATCH)
// ============================================

export async function importHistoricalEvents(inputs: HistoricalEventInput[]): Promise<{
  results: HistoricalEventResult[]
  imported: number
  failed: number
  loyalty?: {
    eventsProcessed: number
    totalPointsAwarded: number
    tierChanges: { clientName: string; oldTier: string; newTier: string }[]
  }
}> {
  const results: HistoricalEventResult[] = []

  for (const input of inputs) {
    const result = await importHistoricalEvent(input)
    results.push(result)
  }

  const imported = results.filter((r) => r.success).length

  // Auto-backfill loyalty for all newly imported events
  let loyalty:
    | {
        eventsProcessed: number
        totalPointsAwarded: number
        tierChanges: { clientName: string; oldTier: string; newTier: string }[]
      }
    | undefined

  if (imported > 0) {
    try {
      const { backfillLoyaltyForHistoricalImports } = await import('@/lib/loyalty/actions')
      const backfillResult = await backfillLoyaltyForHistoricalImports()
      loyalty = {
        eventsProcessed: backfillResult.eventsProcessed,
        totalPointsAwarded: backfillResult.totalPointsAwarded,
        tierChanges: backfillResult.tierChanges.map((tc) => ({
          clientName: tc.clientName,
          oldTier: tc.oldTier,
          newTier: tc.newTier,
        })),
      }
    } catch (err) {
      // Loyalty backfill failure is non-blocking - events are already imported
      console.error('[importHistoricalEvents] Loyalty backfill failed (non-blocking):', err)
    }
  }

  return {
    results,
    imported,
    failed: results.filter((r) => !r.success).length,
    loyalty,
  }
}

// ============================================
// GET EXISTING CLIENTS FOR TYPEAHEAD
// Returns a slim list for the form's client selector
// ============================================

export async function getClientsForHistoricalImport(): Promise<
  { id: string; full_name: string }[]
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .order('full_name', { ascending: true })
    .limit(200)

  return data || []
}
