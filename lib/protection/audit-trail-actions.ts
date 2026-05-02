'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

export type AuditEntry = {
  id: string
  timestamp: string
  entity_type: 'event' | 'quote' | 'ledger'
  entity_id: string
  action: string
  details: string | null
  entity_label: string | null
}

/**
 * Fetch a unified audit trail from all immutable record tables.
 * UNION ALL across event_state_transitions, quote_state_transitions, and ledger_entries,
 * all tenant-scoped. Returns newest first, default limit 200.
 */
export async function getAuditTrail(filters?: {
  entity_type?: string
  start_date?: string
  end_date?: string
  limit?: number
}): Promise<AuditEntry[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const limit = filters?.limit ?? 200

  const params: unknown[] = [tenantId]
  let paramIdx = 2

  // Build optional date filters (applied to each sub-query)
  let dateFilter = ''
  if (filters?.start_date) {
    dateFilter += ` AND sub.timestamp >= $${paramIdx}`
    params.push(filters.start_date)
    paramIdx++
  }
  if (filters?.end_date) {
    dateFilter += ` AND sub.timestamp <= $${paramIdx}`
    params.push(filters.end_date)
    paramIdx++
  }

  // Build entity_type filter
  let typeFilter = ''
  if (filters?.entity_type && ['event', 'quote', 'ledger'].includes(filters.entity_type)) {
    typeFilter = ` AND sub.entity_type = $${paramIdx}`
    params.push(filters.entity_type)
    paramIdx++
  }

  params.push(limit)
  const limitParam = `$${paramIdx}`

  const sql = `
    SELECT sub.*
    FROM (
      SELECT
        est.id::text AS id,
        est.transitioned_at AS timestamp,
        'event'::text AS entity_type,
        est.event_id::text AS entity_id,
        COALESCE(est.from_status, 'new') || ' -> ' || est.to_status AS action,
        est.reason AS details,
        COALESCE(e.occasion, 'Event ' || LEFT(est.event_id::text, 8)) AS entity_label
      FROM event_state_transitions est
      LEFT JOIN events e ON e.id = est.event_id
      WHERE est.tenant_id = $1

      UNION ALL

      SELECT
        qst.id::text AS id,
        qst.transitioned_at AS timestamp,
        'quote'::text AS entity_type,
        qst.quote_id::text AS entity_id,
        COALESCE(qst.from_status, 'new') || ' -> ' || qst.to_status AS action,
        qst.reason AS details,
        'Quote ' || LEFT(qst.quote_id::text, 8) AS entity_label
      FROM quote_state_transitions qst
      WHERE qst.tenant_id = $1

      UNION ALL

      SELECT
        le.id::text AS id,
        le.created_at AS timestamp,
        'ledger'::text AS entity_type,
        COALESCE(le.event_id::text, le.id::text) AS entity_id,
        le.entry_type || ': ' || (le.amount_cents::numeric / 100)::text AS action,
        le.description AS details,
        COALESCE(e2.occasion, 'Ledger ' || LEFT(le.id::text, 8)) AS entity_label
      FROM ledger_entries le
      LEFT JOIN events e2 ON e2.id = le.event_id
      WHERE le.tenant_id = $1
    ) sub
    WHERE 1=1${dateFilter}${typeFilter}
    ORDER BY sub.timestamp DESC
    LIMIT ${limitParam}
  `

  try {
    const rows = await pgClient.unsafe(sql, params as any[])
    return rows as unknown as AuditEntry[]
  } catch (err) {
    console.error('[audit-trail] Failed to fetch audit trail', err)
    return []
  }
}
