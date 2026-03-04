'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type SnapshotDocumentType =
  | 'summary'
  | 'grocery'
  | 'foh'
  | 'prep'
  | 'execution'
  | 'checklist'
  | 'packing'
  | 'reset'
  | 'travel'
  | 'shots'
  | 'all'

const SNAPSHOT_DOCUMENT_TYPES: SnapshotDocumentType[] = [
  'summary',
  'grocery',
  'foh',
  'prep',
  'execution',
  'checklist',
  'packing',
  'reset',
  'travel',
  'shots',
  'all',
]

export const SNAPSHOT_DOCUMENT_LABELS: Record<SnapshotDocumentType, string> = {
  summary: 'Event Summary',
  grocery: 'Grocery List',
  foh: 'Front-of-House Menu',
  prep: 'Prep Sheet',
  execution: 'Execution Sheet',
  checklist: 'Non-Negotiables Checklist',
  packing: 'Packing List',
  reset: 'Post-Service Reset Checklist',
  travel: 'Travel Route',
  shots: 'Content Asset Capture Sheet',
  all: 'Full 8-Sheet Packet',
}

export type EventDocumentSnapshot = {
  id: string
  eventId: string
  documentType: SnapshotDocumentType
  versionNumber: number
  filename: string
  sizeBytes: number
  generatedAt: string
  generatedBy: string | null
}

export type RecentDocumentSnapshot = EventDocumentSnapshot & {
  eventOccasion: string | null
  eventDate: string | null
  clientName: string | null
}

export type SnapshotDrilldownOrder = 'newest' | 'oldest'

export type SnapshotDrilldownFilters = {
  docType?: SnapshotDocumentType | null
  fromDate?: string | null
  toDate?: string | null
  versionNumber?: number | null
  order?: SnapshotDrilldownOrder
  page?: number
  pageSize?: number
}

export type SnapshotTypeStat = {
  documentType: SnapshotDocumentType
  count: number
  latest: EventDocumentSnapshot | null
}

export type EventSnapshotDrilldownResult = {
  items: EventDocumentSnapshot[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  typeStats: SnapshotTypeStat[]
  versionOptions: number[]
}

function mapEventDocumentSnapshot(row: any): EventDocumentSnapshot {
  return {
    id: row.id,
    eventId: row.event_id,
    documentType: row.document_type as SnapshotDocumentType,
    versionNumber: row.version_number,
    filename: row.filename,
    sizeBytes: row.size_bytes,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by ?? null,
  }
}

function normalizeDateInput(value: string | null | undefined): string | null {
  if (!value) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function normalizePage(value: number | null | undefined): number {
  if (!value || !Number.isInteger(value) || value < 1) return 1
  return value
}

function normalizePageSize(value: number | null | undefined): number {
  if (!value || !Number.isInteger(value) || value < 1) return 25
  return Math.min(100, value)
}

function normalizeOrder(value: SnapshotDrilldownOrder | null | undefined): SnapshotDrilldownOrder {
  return value === 'oldest' ? 'oldest' : 'newest'
}

export async function getEventDocumentSnapshots(
  eventId: string,
  limit = 200
): Promise<EventDocumentSnapshot[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_document_snapshots')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getEventDocumentSnapshots] Error:', error)
    return []
  }

  return (data ?? []).map(mapEventDocumentSnapshot)
}

export async function getRecentDocumentSnapshots(limit = 80): Promise<RecentDocumentSnapshot[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_document_snapshots')
    .select(
      `
      id,
      event_id,
      document_type,
      version_number,
      filename,
      size_bytes,
      generated_at,
      generated_by,
      event:events!inner(
        occasion,
        event_date,
        client:clients(full_name)
      )
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentDocumentSnapshots] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...mapEventDocumentSnapshot(row),
    eventOccasion: row.event?.occasion ?? null,
    eventDate: row.event?.event_date ?? null,
    clientName: row.event?.client?.full_name ?? null,
  }))
}

export async function getEventDocumentSnapshotDrilldown(
  eventId: string,
  filters: SnapshotDrilldownFilters = {}
): Promise<EventSnapshotDrilldownResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const docType = filters.docType ?? null
  const fromDate = normalizeDateInput(filters.fromDate)
  const toDate = normalizeDateInput(filters.toDate)
  const versionNumber =
    filters.versionNumber && Number.isInteger(filters.versionNumber) && filters.versionNumber > 0
      ? filters.versionNumber
      : null
  const order = normalizeOrder(filters.order)
  const page = normalizePage(filters.page)
  const pageSize = normalizePageSize(filters.pageSize)
  const rangeFrom = (page - 1) * pageSize
  const rangeTo = rangeFrom + pageSize - 1

  const applyDateRange = (query: any) => {
    let next = query
    if (fromDate) {
      next = next.gte('generated_at', `${fromDate}T00:00:00.000`)
    }
    if (toDate) {
      next = next.lte('generated_at', `${toDate}T23:59:59.999`)
    }
    return next
  }

  const applyCoreFilters = (query: any, includeDocType = true, includeVersion = true) => {
    let next = query.eq('tenant_id', user.tenantId!).eq('event_id', eventId)
    if (includeDocType && docType) {
      next = next.eq('document_type', docType)
    }
    if (includeVersion && versionNumber) {
      next = next.eq('version_number', versionNumber)
    }
    return applyDateRange(next)
  }

  const listQuery = applyCoreFilters(
    supabase.from('event_document_snapshots').select('*', { count: 'exact' })
  )
    .order('generated_at', { ascending: order === 'oldest' })
    .range(rangeFrom, rangeTo)

  const [{ data: rows, error: rowsError, count }, typeStats, versionOptions] = await Promise.all([
    listQuery,
    Promise.all(
      SNAPSHOT_DOCUMENT_TYPES.map(async (type) => {
        const countQuery = applyCoreFilters(
          supabase.from('event_document_snapshots').select('id', { count: 'exact', head: true }),
          false,
          false
        ).eq('document_type', type)

        const latestQuery = applyCoreFilters(
          supabase.from('event_document_snapshots').select('*'),
          false,
          false
        )
          .eq('document_type', type)
          .order('generated_at', { ascending: false })
          .limit(1)

        const [{ count: typeCount, error: countError }, { data: latestRows, error: latestError }] =
          await Promise.all([countQuery, latestQuery])

        if (countError || latestError) {
          console.error('[getEventDocumentSnapshotDrilldown] Type stats error:', {
            type,
            countError,
            latestError,
          })
        }

        const latest =
          latestRows && latestRows.length > 0 ? mapEventDocumentSnapshot(latestRows[0]) : null
        return {
          documentType: type,
          count: typeCount ?? 0,
          latest,
        } satisfies SnapshotTypeStat
      })
    ),
    (async () => {
      if (!docType) return [] as number[]
      const { data: versionRows, error: versionError } = await applyCoreFilters(
        supabase.from('event_document_snapshots').select('version_number'),
        true,
        false
      )
        .order('version_number', { ascending: false })
        .limit(200)

      if (versionError) {
        console.error('[getEventDocumentSnapshotDrilldown] Version options error:', versionError)
        return [] as number[]
      }

      return Array.from(
        new Set((versionRows ?? []).map((row: any) => row.version_number as number))
      ).sort((a, b) => b - a)
    })(),
  ])

  if (rowsError) {
    console.error('[getEventDocumentSnapshotDrilldown] List query error:', rowsError)
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      typeStats,
      versionOptions,
    }
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  let safePage = Math.min(page, totalPages)
  let items = (rows ?? []).map(mapEventDocumentSnapshot)

  if (total > 0 && page > totalPages) {
    const fallbackFrom = (safePage - 1) * pageSize
    const fallbackTo = fallbackFrom + pageSize - 1
    const { data: fallbackRows, error: fallbackError } = await applyCoreFilters(
      supabase.from('event_document_snapshots').select('*')
    )
      .order('generated_at', { ascending: order === 'oldest' })
      .range(fallbackFrom, fallbackTo)

    if (fallbackError) {
      console.error('[getEventDocumentSnapshotDrilldown] Fallback page query error:', fallbackError)
    } else {
      items = (fallbackRows ?? []).map(mapEventDocumentSnapshot)
    }
  }

  const hasNextPage = safePage < totalPages
  const hasPreviousPage = safePage > 1

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    typeStats,
    versionOptions,
  }
}
