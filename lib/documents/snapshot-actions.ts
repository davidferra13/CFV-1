'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  SNAPSHOT_DOCUMENT_TYPES,
  type SnapshotDocumentType,
} from '@/lib/documents/document-definitions'
import { SNAPSHOT_DOCUMENT_LABELS } from '@/lib/documents/snapshot-constants'

export type { SnapshotDocumentType } from '@/lib/documents/document-definitions'

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

export type TenantDocumentSnapshot = RecentDocumentSnapshot & {
  eventStatus: string | null
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

export type TenantSnapshotDrilldownResult = {
  items: TenantDocumentSnapshot[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  typeStats: SnapshotTypeStat[]
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

function mapRecentDocumentSnapshot(row: any): RecentDocumentSnapshot {
  return {
    ...mapEventDocumentSnapshot(row),
    eventOccasion: row.event?.occasion ?? null,
    eventDate: row.event?.event_date ?? null,
    clientName: row.event?.client?.full_name ?? null,
  }
}

function mapTenantDocumentSnapshot(row: any): TenantDocumentSnapshot {
  return {
    ...mapRecentDocumentSnapshot(row),
    eventStatus: row.event?.status ?? null,
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

function normalizeSearchQuery(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim().toLowerCase()
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
        status,
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

  return (data ?? []).map(mapRecentDocumentSnapshot)
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

  const versionOptionsPromise: Promise<number[]> = (async () => {
    if (!docType) return []
    const { data: versionRows, error: versionError } = await applyCoreFilters(
      supabase.from('event_document_snapshots').select('version_number'),
      true,
      false
    )
      .order('version_number', { ascending: false })
      .limit(200)

    if (versionError) {
      console.error('[getEventDocumentSnapshotDrilldown] Version options error:', versionError)
      return []
    }

    const uniqueVersions = Array.from(
      new Set(
        (versionRows ?? [])
          .map((row: any) => Number(row.version_number))
          .filter((value: number) => Number.isInteger(value) && value > 0)
      )
    ) as number[]
    uniqueVersions.sort((a, b) => b - a)
    return uniqueVersions
  })()

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
    versionOptionsPromise,
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

export type TenantSnapshotDrilldownFilters = {
  eventId?: string | null
  docType?: SnapshotDocumentType | null
  versionNumber?: number | null
  fromDate?: string | null
  toDate?: string | null
  order?: SnapshotDrilldownOrder
  page?: number
  pageSize?: number
  query?: string | null
}

const SEARCH_MAX_ROWS = 2000

export async function getTenantDocumentSnapshotDrilldown(
  filters: TenantSnapshotDrilldownFilters = {}
): Promise<TenantSnapshotDrilldownResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const eventId = filters.eventId?.trim() || null
  const docType = filters.docType ?? null
  const versionNumber =
    filters.versionNumber && Number.isInteger(filters.versionNumber) && filters.versionNumber > 0
      ? filters.versionNumber
      : null
  const fromDate = normalizeDateInput(filters.fromDate)
  const toDate = normalizeDateInput(filters.toDate)
  const order = normalizeOrder(filters.order)
  const page = normalizePage(filters.page)
  const pageSize = normalizePageSize(filters.pageSize)
  const searchQuery = normalizeSearchQuery(filters.query)
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
    let next = query.eq('tenant_id', user.tenantId!)
    if (eventId) {
      next = next.eq('event_id', eventId)
    }
    if (includeDocType && docType) {
      next = next.eq('document_type', docType)
    }
    if (includeVersion && versionNumber) {
      next = next.eq('version_number', versionNumber)
    }
    return applyDateRange(next)
  }

  const buildSearchHaystack = (row: TenantDocumentSnapshot): string =>
    [
      row.filename,
      row.eventOccasion ?? '',
      row.clientName ?? '',
      row.eventStatus ?? '',
      SNAPSHOT_DOCUMENT_LABELS[row.documentType],
    ]
      .join(' ')
      .toLowerCase()

  const baseSelect = `
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
      status,
      client:clients(full_name)
    )
  `

  const queryPath = async (): Promise<TenantSnapshotDrilldownResult> => {
    const { data: allRows, error } = await applyCoreFilters(
      supabase.from('event_document_snapshots').select(baseSelect)
    )
      .order('generated_at', { ascending: order === 'oldest' })
      .limit(SEARCH_MAX_ROWS)

    if (error) {
      console.error('[getTenantDocumentSnapshotDrilldown] Search query error:', error)
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: page > 1,
        typeStats: SNAPSHOT_DOCUMENT_TYPES.map((type) => ({
          documentType: type,
          count: 0,
          latest: null,
        })),
      }
    }

    const typedRows = (allRows ?? []).map(mapTenantDocumentSnapshot)
    const filtered = typedRows.filter((row: TenantDocumentSnapshot) =>
      buildSearchHaystack(row).includes(searchQuery)
    )
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    const typeStats = SNAPSHOT_DOCUMENT_TYPES.map((type) => {
      const bucket = filtered.filter((row: TenantDocumentSnapshot) => row.documentType === type)
      const latestRow =
        bucket.length === 0
          ? null
          : [...bucket].sort(
              (a, b) => Date.parse(b.generatedAt || '') - Date.parse(a.generatedAt || '')
            )[0]
      return {
        documentType: type,
        count: bucket.length,
        latest: latestRow
          ? {
              id: latestRow.id,
              eventId: latestRow.eventId,
              documentType: latestRow.documentType,
              versionNumber: latestRow.versionNumber,
              filename: latestRow.filename,
              sizeBytes: latestRow.sizeBytes,
              generatedAt: latestRow.generatedAt,
              generatedBy: latestRow.generatedBy,
            }
          : null,
      } satisfies SnapshotTypeStat
    })

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
      typeStats,
    }
  }

  if (searchQuery) {
    return queryPath()
  }

  const listQuery = applyCoreFilters(
    supabase
      .from('event_document_snapshots')
      .select(baseSelect, { count: 'exact' })
      .order('generated_at', { ascending: order === 'oldest' })
      .range(rangeFrom, rangeTo)
  )

  const [{ data: rows, error: rowsError, count }, typeStats] = await Promise.all([
    listQuery,
    Promise.all(
      SNAPSHOT_DOCUMENT_TYPES.map(async (type) => {
        const countQuery = applyCoreFilters(
          supabase.from('event_document_snapshots').select('id', { count: 'exact', head: true }),
          false
        ).eq('document_type', type)

        const latestQuery = applyCoreFilters(
          supabase.from('event_document_snapshots').select('*'),
          false
        )
          .eq('document_type', type)
          .order('generated_at', { ascending: false })
          .limit(1)

        const [{ count: typeCount, error: countError }, { data: latestRows, error: latestError }] =
          await Promise.all([countQuery, latestQuery])

        if (countError || latestError) {
          console.error('[getTenantDocumentSnapshotDrilldown] Type stats error:', {
            type,
            countError,
            latestError,
          })
        }

        return {
          documentType: type,
          count: typeCount ?? 0,
          latest:
            latestRows && latestRows.length > 0 ? mapEventDocumentSnapshot(latestRows[0]) : null,
        } satisfies SnapshotTypeStat
      })
    ),
  ])

  if (rowsError) {
    console.error('[getTenantDocumentSnapshotDrilldown] List query error:', rowsError)
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      typeStats,
    }
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  let items = (rows ?? []).map(mapTenantDocumentSnapshot)
  if (total > 0 && page > totalPages) {
    const fallbackFrom = (safePage - 1) * pageSize
    const fallbackTo = fallbackFrom + pageSize - 1
    const { data: fallbackRows, error: fallbackError } = await applyCoreFilters(
      supabase.from('event_document_snapshots').select(baseSelect)
    )
      .order('generated_at', { ascending: order === 'oldest' })
      .range(fallbackFrom, fallbackTo)

    if (fallbackError) {
      console.error(
        '[getTenantDocumentSnapshotDrilldown] Fallback page query error:',
        fallbackError
      )
    } else {
      items = (fallbackRows ?? []).map(mapTenantDocumentSnapshot)
    }
  }

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
    typeStats,
  }
}
