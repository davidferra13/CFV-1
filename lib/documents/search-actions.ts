'use server'

// Unified Document Search
// Cross-table search spanning receipts, chef_documents, and expenses.
// Supports text search, date range, amount range, and entity filters.
// Returns a unified result set sorted by date.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnifiedSearchFilters = {
  query?: string
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
  amountMinCents?: number
  amountMaxCents?: number
  eventId?: string
  clientId?: string
  sourceType?: 'all' | 'receipt' | 'document' | 'expense'
  limit?: number
  offset?: number
}

export type UnifiedSearchResult = {
  id: string
  source: 'receipt' | 'document' | 'expense'
  title: string
  summary: string | null
  date: string | null
  amountCents: number | null
  eventId: string | null
  eventName: string | null
  clientId: string | null
  clientName: string | null
  status: string | null
  documentType: string | null
  folderName: string | null
}

export type UnifiedSearchResponse = {
  results: UnifiedSearchResult[]
  total: number
  hasMore: boolean
}

// ─── Search ───────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 30

/**
 * Search across receipts, chef_documents, and expenses in one call.
 * Results are merged and sorted by date (newest first).
 */
export async function searchAllDocuments(
  filters: UnifiedSearchFilters = {}
): Promise<UnifiedSearchResponse> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, 100)
  const offset = filters.offset ?? 0
  const sourceType = filters.sourceType ?? 'all'

  const promises: Promise<UnifiedSearchResult[]>[] = []

  if (sourceType === 'all' || sourceType === 'receipt') {
    promises.push(searchReceipts(supabase, user.tenantId!, filters))
  }
  if (sourceType === 'all' || sourceType === 'document') {
    promises.push(searchDocuments(supabase, user.tenantId!, filters))
  }
  if (sourceType === 'all' || sourceType === 'expense') {
    promises.push(searchExpenses(supabase, user.tenantId!, filters))
  }

  const allResults = (await Promise.all(promises)).flat()

  // Sort by date descending (nulls last)
  allResults.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })

  const total = allResults.length
  const paged = allResults.slice(offset, offset + limit)

  return {
    results: paged,
    total,
    hasMore: offset + limit < total,
  }
}

// ─── Individual source searches ───────────────────────────────────────────────

async function searchReceipts(
  supabase: any,
  tenantId: string,
  filters: UnifiedSearchFilters
): Promise<UnifiedSearchResult[]> {
  let query = supabase
    .from('receipt_photos')
    .select(
      `
      id, event_id, client_id, upload_status, created_at, notes,
      events(occasion),
      clients(name),
      receipt_extractions(
        store_name, purchase_date, total_cents, extraction_confidence
      )
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.eventId) query = query.eq('event_id', filters.eventId)
  if (filters.clientId) query = query.eq('client_id', filters.clientId)

  const { data } = await query

  return (data ?? [])
    .map((row: any) => {
      const ext = (row.receipt_extractions as any)?.[0]
      const storeName = ext?.store_name ?? null
      const purchaseDate = ext?.purchase_date ?? null
      const totalCents = ext?.total_cents ?? null

      // Apply text filter
      if (filters.query) {
        const q = filters.query.toLowerCase()
        const searchable = [storeName, row.notes].filter(Boolean).join(' ').toLowerCase()
        if (!searchable.includes(q)) return null
      }

      // Apply date filter
      const dateStr = purchaseDate ?? row.created_at?.split('T')[0]
      if (filters.dateFrom && dateStr && dateStr < filters.dateFrom) return null
      if (filters.dateTo && dateStr && dateStr > filters.dateTo) return null

      // Apply amount filter
      if (filters.amountMinCents && (!totalCents || totalCents < filters.amountMinCents))
        return null
      if (filters.amountMaxCents && totalCents && totalCents > filters.amountMaxCents) return null

      return {
        id: row.id,
        source: 'receipt' as const,
        title: storeName ?? 'Receipt',
        summary: row.notes,
        date: dateStr ?? null,
        amountCents: totalCents,
        eventId: row.event_id,
        eventName: (row.events as any)?.occasion ?? null,
        clientId: row.client_id,
        clientName: (row.clients as any)?.name ?? null,
        status: row.upload_status,
        documentType: 'receipt',
        folderName: null,
      }
    })
    .filter(Boolean) as UnifiedSearchResult[]
}

async function searchDocuments(
  supabase: any,
  tenantId: string,
  filters: UnifiedSearchFilters
): Promise<UnifiedSearchResult[]> {
  let query = supabase
    .from('chef_documents')
    .select(
      `
      id, title, document_type, summary, created_at, event_id, client_id,
      events(occasion),
      clients(name),
      chef_folders(name)
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.eventId) query = query.eq('event_id', filters.eventId)
  if (filters.clientId) query = query.eq('client_id', filters.clientId)
  if (filters.query)
    query = query.or(`title.ilike.%${filters.query}%,summary.ilike.%${filters.query}%`)

  const { data } = await query

  return (data ?? [])
    .map((row: any) => {
      const dateStr = row.created_at?.split('T')[0]
      if (filters.dateFrom && dateStr && dateStr < filters.dateFrom) return null
      if (filters.dateTo && dateStr && dateStr > filters.dateTo) return null

      return {
        id: row.id,
        source: 'document' as const,
        title: row.title,
        summary: row.summary,
        date: dateStr ?? null,
        amountCents: null,
        eventId: row.event_id,
        eventName: (row.events as any)?.occasion ?? null,
        clientId: row.client_id,
        clientName: (row.clients as any)?.name ?? null,
        status: null,
        documentType: row.document_type,
        folderName: (row.chef_folders as any)?.name ?? null,
      }
    })
    .filter(Boolean) as UnifiedSearchResult[]
}

async function searchExpenses(
  supabase: any,
  tenantId: string,
  filters: UnifiedSearchFilters
): Promise<UnifiedSearchResult[]> {
  let query = supabase
    .from('expenses')
    .select(
      `
      id, description, vendor_name, category, amount_cents, expense_date, event_id, notes,
      events(occasion)
    `
    )
    .eq('tenant_id', tenantId)
    .order('expense_date', { ascending: false })
    .limit(100)

  if (filters.eventId) query = query.eq('event_id', filters.eventId)
  if (filters.dateFrom) query = query.gte('expense_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('expense_date', filters.dateTo)
  if (filters.amountMinCents) query = query.gte('amount_cents', filters.amountMinCents)
  if (filters.amountMaxCents) query = query.lte('amount_cents', filters.amountMaxCents)

  const { data } = await query

  return (data ?? [])
    .map((row: any) => {
      // Apply text filter
      if (filters.query) {
        const q = filters.query.toLowerCase()
        const searchable = [row.description, row.vendor_name, row.notes, row.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(q)) return null
      }

      return {
        id: row.id,
        source: 'expense' as const,
        title: row.vendor_name ?? row.description ?? 'Expense',
        summary: row.description,
        date: row.expense_date ?? null,
        amountCents: row.amount_cents,
        eventId: row.event_id,
        eventName: (row.events as any)?.occasion ?? null,
        clientId: null,
        clientName: null,
        status: null,
        documentType: row.category,
        folderName: null,
      }
    })
    .filter(Boolean) as UnifiedSearchResult[]
}
