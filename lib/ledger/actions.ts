// Ledger Query Actions
// Chef-only: View ledger entries and financial data

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type LedgerEntryFilters = {
  entryType?: string
  startDate?: string
  endDate?: string
  eventId?: string
}

/**
 * Get all ledger entries for chef's tenant with optional filters
 */
export async function getLedgerEntries(filters: LedgerEntryFilters = {}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('ledger_entries')
    .select(
      `
      *,
      event:events(id, occasion, event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)

  // Apply filters
  if (filters.entryType && filters.entryType !== 'all') {
    query = query.eq('entry_type', filters.entryType as any)
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  if (filters.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  const { data: entries, error } = await query.order('created_at', { ascending: false }).limit(1000)

  if (error) {
    console.error('[getLedgerEntries] Error:', error)
    throw new Error('Failed to fetch ledger entries')
  }

  return entries
}

/**
 * Export ledger entries as CSV
 */
export async function exportLedgerCSV(filters: LedgerEntryFilters = {}) {
  const entries = await getLedgerEntries(filters)

  // Build CSV
  const headers = [
    'Date',
    'Event',
    'Type',
    'Amount (cents)',
    'Payment Method',
    'Description',
    'Transaction Ref',
  ]
  const rows = entries.map((entry: any) => [
    new Date(entry.created_at).toISOString(),
    entry.event?.occasion || 'N/A',
    entry.entry_type,
    entry.amount_cents.toString(),
    entry.payment_method,
    entry.description,
    entry.transaction_reference || '',
  ])

  const { buildCsvSafe } = await import('@/lib/security/csv-sanitize')
  return buildCsvSafe(headers, rows)
}
