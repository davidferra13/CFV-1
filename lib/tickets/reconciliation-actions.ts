import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/db/server'
import {
  reconcileTicketFinancialTruth,
  type TicketReconciliationMismatch,
  type TicketReconciliationMismatchCode,
} from '@/lib/tickets/reconciliation'

type DbClient = any

type TicketReconciliationAuditOptions = {
  db?: DbClient
  tenantId?: string
  limit?: number
  now?: Date
  skipAdminAuth?: boolean
}

type TicketAuditRow = {
  id: string
  event_id: string | null
  tenant_id: string | null
  total_cents: number | null
  payment_status: string | null
  capacity_released_at: string | null
  stripe_payment_intent_id?: string | null
  stripe_checkout_session_id?: string | null
}

type LedgerAuditRow = {
  id: string
  tenant_id: string | null
  event_id: string | null
  amount_cents: number | null
  entry_type: string | null
  transaction_reference?: string | null
  is_refund?: boolean | null
  internal_notes?: string | null
  description?: string | null
}

const DEFAULT_AUDIT_LIMIT = 5000
const LEDGER_SELECT =
  'id, tenant_id, event_id, amount_cents, entry_type, transaction_reference, is_refund, internal_notes, description'
const TICKET_SELECT =
  'id, event_id, tenant_id, total_cents, payment_status, capacity_released_at, stripe_payment_intent_id, stripe_checkout_session_id'

export async function runTicketReconciliationAudit(
  options: TicketReconciliationAuditOptions = {}
) {
  if (!options.skipAdminAuth) {
    await requireAdmin()
  }

  const db = options.db ?? createServerClient({ admin: true })
  const limit = normalizeLimit(options.limit)
  const checkedAt = (options.now ?? new Date()).toISOString()
  const tickets = await fetchTicketRows({ db, tenantId: options.tenantId, limit })
  const ledgerEntries = await fetchLedgerRows({
    db,
    tenantId: options.tenantId,
    tickets,
    limit,
  })
  const result = reconcileTicketFinancialTruth({ tickets, ledgerEntries })

  return {
    checkedAt,
    tenantId: options.tenantId ?? null,
    ticketCount: tickets.length,
    ledgerEntryCount: ledgerEntries.length,
    mismatchCount: result.mismatches.length,
    issueCount: result.mismatches.length,
    summaryByCode: summarizeByCode(result.mismatches),
    mismatches: result.mismatches,
    truncated: tickets.length >= limit || ledgerEntries.length >= limit,
  }
}

export async function runTicketReconciliationAuditForCron(
  options: Omit<TicketReconciliationAuditOptions, 'skipAdminAuth'> = {}
) {
  return runTicketReconciliationAudit({ ...options, skipAdminAuth: true })
}

async function fetchTicketRows(input: {
  db: DbClient
  tenantId?: string
  limit: number
}): Promise<TicketAuditRow[]> {
  let query = input.db.from('event_tickets').select(TICKET_SELECT)

  if (input.tenantId) {
    query = query.eq('tenant_id', input.tenantId)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(input.limit)
  if (error) throw new Error(`Failed to load ticket reconciliation rows: ${error.message}`)
  return data ?? []
}

async function fetchLedgerRows(input: {
  db: DbClient
  tenantId?: string
  tickets: TicketAuditRow[]
  limit: number
}): Promise<LedgerAuditRow[]> {
  const byId = new Map<string, LedgerAuditRow>()
  const eventIds = unique(input.tickets.map((ticket) => ticket.event_id).filter(isPresentString))

  for (const chunk of chunkValues(eventIds, 200)) {
    let query = input.db.from('ledger_entries').select(LEDGER_SELECT).in('event_id', chunk)
    if (input.tenantId) query = query.eq('tenant_id', input.tenantId)

    const { data, error } = await query.limit(input.limit)
    if (error) throw new Error(`Failed to load event ticket ledger rows: ${error.message}`)
    for (const row of data ?? []) byId.set(row.id, row)
  }

  for (const pattern of ['stripe_ticket_%', 'ticket_refund_%']) {
    let query = input.db
      .from('ledger_entries')
      .select(LEDGER_SELECT)
      .like('transaction_reference', pattern)

    if (input.tenantId) query = query.eq('tenant_id', input.tenantId)

    const { data, error } = await query.limit(input.limit)
    if (error) throw new Error(`Failed to load ticket ledger references: ${error.message}`)
    for (const row of data ?? []) byId.set(row.id, row)
  }

  return Array.from(byId.values()).slice(0, input.limit)
}

function summarizeByCode(mismatches: TicketReconciliationMismatch[]) {
  const summary = Object.create(null) as Record<TicketReconciliationMismatchCode, number>
  for (const mismatch of mismatches) {
    summary[mismatch.code] = (summary[mismatch.code] ?? 0) + 1
  }
  return summary
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isInteger(limit) || !limit || limit <= 0) return DEFAULT_AUDIT_LIMIT
  return Math.min(limit, DEFAULT_AUDIT_LIMIT)
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function isPresentString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
