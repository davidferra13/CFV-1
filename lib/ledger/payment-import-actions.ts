'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type PaymentImportInput = {
  date: string // YYYY-MM-DD
  client_id: string | null
  client_name: string | null
  amount_cents: number
  payment_method: 'cash' | 'venmo' | 'paypal' | 'zelle' | 'card' | 'check' | 'other' | null
  entry_type: 'payment' | 'deposit' | 'tip' | 'refund'
  description: string | null
}

export type PaymentImportResult = {
  success: boolean
  ledgerEntryId?: string
  clientId?: string
  clientCreated?: boolean
  error?: string
  label: string
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
// IMPORT SINGLE PAYMENT
// ============================================

export async function importPayment(input: PaymentImportInput): Promise<PaymentImportResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const label = [
    input.date,
    input.client_name || 'Unknown client',
    input.amount_cents ? `$${(input.amount_cents / 100).toFixed(2)}` : '',
    input.entry_type !== 'payment' ? input.entry_type : '',
  ]
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

    // 2. Insert ledger entry
    const paymentMethod = input.payment_method || 'cash'
    const description =
      input.description?.trim() || `Historical ${input.entry_type} - ${input.date}`

    const { data: ledgerEntry, error: ledgerError } = await db
      .from('ledger_entries')
      .insert({
        tenant_id: user.tenantId!,
        client_id: resolvedClientId,
        event_id: null,
        entry_type: input.entry_type,
        amount_cents: input.amount_cents,
        payment_method: paymentMethod,
        description,
        received_at: `${input.date}T00:00:00Z`,
        internal_notes: 'Historical payment - imported from records',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (ledgerError || !ledgerEntry) {
      console.error('[importPayment] Ledger insert error:', ledgerError)
      throw new Error('Failed to create ledger entry')
    }

    revalidatePath('/finance')
    revalidatePath('/events')

    return {
      success: true,
      ledgerEntryId: ledgerEntry.id,
      clientId: resolvedClientId,
      clientCreated,
      label,
    }
  } catch (err) {
    console.error('[importPayment] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      label,
    }
  }
}

// ============================================
// IMPORT MULTIPLE PAYMENTS (BATCH)
// ============================================

export async function importPayments(inputs: PaymentImportInput[]): Promise<{
  results: PaymentImportResult[]
  imported: number
  failed: number
}> {
  const results: PaymentImportResult[] = []

  for (const input of inputs) {
    const result = await importPayment(input)
    results.push(result)
  }

  const imported = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  // Revalidate once after batch (individual calls also revalidate, but this ensures coverage)
  if (imported > 0) {
    revalidatePath('/finance')
    revalidatePath('/events')
  }

  return {
    results,
    imported,
    failed,
  }
}
