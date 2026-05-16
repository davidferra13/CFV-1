'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  dismissHistoricalFinding,
  getHistoricalScanStatus,
  importHistoricalFinding,
} from '@/lib/gmail/historical-scan-actions'
import {
  buildBusinessHistorySummary,
  buildUnifiedReviewQueue,
  mapGmailFindingRow,
} from './review-queue'
import type { BusinessHistoryFinding, BusinessHistorySummary } from './types'

async function countTenantRows(db: any, table: string, tenantId: string): Promise<number> {
  const { count } = await db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  return count ?? 0
}

async function loadGmailFindingRows(db: any, tenantId: string, limit = 200) {
  const { data, error } = await db
    .from('gmail_historical_findings')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('received_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getBusinessHistoryImportDashboard(): Promise<{
  summary: BusinessHistorySummary
  findings: BusinessHistoryFinding[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [
    gmailRows,
    clients,
    events,
    scan,
    importLogs,
    clientCount,
    eventCount,
    inquiryCount,
    expenseCount,
    ledgerCount,
  ] = await Promise.all([
    loadGmailFindingRows(db, tenantId, 250),
    db
      .from('clients')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(500),
    db
      .from('events')
      .select('id, occasion, event_date, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: false })
      .limit(500),
    getHistoricalScanStatus().catch(() => null),
    db
      .from('import_logs')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(500),
    countTenantRows(db, 'clients', tenantId),
    countTenantRows(db, 'events', tenantId),
    countTenantRows(db, 'inquiries', tenantId),
    countTenantRows(db, 'expenses', tenantId),
    countTenantRows(db, 'ledger_entries', tenantId),
  ])

  const findings = buildUnifiedReviewQueue({
    gmailRows,
    existingClients:
      clients.data?.map((client: any) => ({
        id: client.id,
        fullName: client.full_name,
        email: client.email,
      })) ?? [],
    existingEvents:
      events.data?.map((event: any) => ({
        id: event.id,
        occasion: event.occasion,
        eventDate: event.event_date,
        clientName: event.client?.full_name ?? null,
      })) ?? [],
  })

  return {
    findings,
    summary: buildBusinessHistorySummary({
      findings,
      canonicalCounts: {
        staged: 0,
        imported: 0,
        dismissed: 0,
        clients: clientCount,
        events: eventCount,
        inquiries: inquiryCount,
        expenses: expenseCount,
        ledgerEntries: ledgerCount,
      },
      scan: scan
        ? {
            enabled: scan.enabled,
            status: scan.status,
            totalProcessed: scan.totalProcessed,
            lastRunAt: scan.lastRunAt,
          }
        : null,
      importLogCount: importLogs.data?.length ?? 0,
    }),
  }
}

export async function approveBusinessHistoryFinding(formData: FormData): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const findingId = String(formData.get('findingId') ?? '')
  if (!findingId) throw new Error('Missing finding id')

  const { data: row, error } = await db
    .from('gmail_historical_findings')
    .select('*')
    .eq('id', findingId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !row) throw new Error('Finding not found')
  const finding = mapGmailFindingRow(row)

  if (finding.category === 'inquiry' || finding.category === 'existing_thread') {
    await importHistoricalFinding(finding.id)
  } else {
    await db
      .from('gmail_historical_findings')
      .update({
        status: 'imported',
        reviewed_at: new Date().toISOString(),
        ai_reasoning: `${row.ai_reasoning ?? ''}\nReviewed as ${finding.category}; ready for ${finding.proposedDestination} mapping.`,
      })
      .eq('id', finding.id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/imports/business-history')
  revalidatePath('/inbox/history-scan')
}

export async function dismissBusinessHistoryFinding(formData: FormData): Promise<void> {
  await requireChef()
  const findingId = String(formData.get('findingId') ?? '')
  if (!findingId) throw new Error('Missing finding id')
  await dismissHistoricalFinding(findingId)
  revalidatePath('/imports/business-history')
}

export async function deleteBusinessHistoryFindings(formData: FormData): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const status = String(formData.get('status') ?? '')
  const olderThanDays = Number(formData.get('olderThanDays') ?? 0)

  let query = db.from('gmail_historical_findings').delete().eq('tenant_id', user.tenantId!)

  if (status === 'dismissed' || status === 'imported') {
    query = query.eq('status', status)
  } else {
    throw new Error('Only dismissed or imported staged findings can be deleted from this control')
  }

  if (Number.isFinite(olderThanDays) && olderThanDays > 0) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()
    query = query.lt('reviewed_at', cutoff)
  }

  const { error } = await query
  if (error) throw new Error(error.message)

  revalidatePath('/imports/business-history')
  revalidatePath('/inbox/history-scan')
}
