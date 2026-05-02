'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getAuditTrail } from '@/lib/protection/audit-trail-actions'
import { buildCsvSafe } from '@/lib/security/csv-sanitize'

// Traceability Export - CSV and PDF export of audit trail data.
// Module: protection
// For compliance audits: full chain of state transitions, quote changes, financial entries.

export type TraceabilityExportFilters = {
  entity_type?: string
  start_date?: string
  end_date?: string
}

/**
 * Export audit trail as CSV.
 * Returns { csv: string, filename: string } ready for download.
 */
export async function exportTraceabilityCSV(
  filters?: TraceabilityExportFilters
): Promise<{ csv: string; filename: string }> {
  await requireChef()

  const entries = await getAuditTrail({
    ...filters,
    limit: 5000, // generous limit for export
  })

  const headers = ['Timestamp', 'Type', 'Entity ID', 'Entity Label', 'Action', 'Details']
  const rows = entries.map((e) => [
    e.timestamp,
    e.entity_type,
    e.entity_id,
    e.entity_label || '',
    e.action,
    e.details || '',
  ])

  const csv = buildCsvSafe(headers, rows)
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `chefflow-traceability-${dateStr}.csv`

  return { csv, filename }
}

/**
 * Export audit trail as structured JSON for PDF generation.
 * Client-side PDF rendering avoids server-side jsPDF bundle issues.
 */
export async function exportTraceabilityData(filters?: TraceabilityExportFilters): Promise<{
  entries: Array<{
    timestamp: string
    entity_type: string
    entity_id: string
    entity_label: string | null
    action: string
    details: string | null
  }>
  summary: {
    totalEntries: number
    eventTransitions: number
    quoteTransitions: number
    ledgerEntries: number
    dateRange: { start: string | null; end: string | null }
    generatedAt: string
  }
  filename: string
}> {
  await requireChef()

  const entries = await getAuditTrail({
    ...filters,
    limit: 5000,
  })

  const eventTransitions = entries.filter((e) => e.entity_type === 'event').length
  const quoteTransitions = entries.filter((e) => e.entity_type === 'quote').length
  const ledgerEntries = entries.filter((e) => e.entity_type === 'ledger').length

  const timestamps = entries.map((e) => e.timestamp).sort()
  const dateStr = new Date().toISOString().split('T')[0]

  return {
    entries,
    summary: {
      totalEntries: entries.length,
      eventTransitions,
      quoteTransitions,
      ledgerEntries,
      dateRange: {
        start: timestamps[0] || null,
        end: timestamps[timestamps.length - 1] || null,
      },
      generatedAt: new Date().toISOString(),
    },
    filename: `chefflow-traceability-${dateStr}`,
  }
}
