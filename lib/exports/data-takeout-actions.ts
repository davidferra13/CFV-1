'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildCsvSafe } from '@/lib/security/csv-sanitize'
import { generateICS } from '@/lib/scheduling/generate-ics'
import { zipSync } from 'fflate'
import {
  TAKEOUT_CATEGORIES,
  TAKEOUT_CATEGORY_MAP,
  type TakeoutCategoryId,
} from './takeout-categories'

// Max rows per table to prevent unbounded memory usage
const MAX_ROWS = 50_000

type TakeoutManifest = {
  version: '1.0'
  exportedAt: string
  chefName: string
  businessName: string | null
  categories: string[]
  counts: Record<string, number>
  format: 'chefflow-takeout-v1'
}

// ============================================================
// estimateTakeoutSize
// ============================================================

export async function estimateTakeoutSize(categoryIds: TakeoutCategoryId[]): Promise<{
  totalEstimateBytes: number
  perCategory: Record<string, { count: number; estimateBytes: number }>
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.entityId

  const perCategory: Record<string, { count: number; estimateBytes: number }> = {}
  let totalEstimateBytes = 0

  for (const catId of categoryIds) {
    const cat = TAKEOUT_CATEGORY_MAP.get(catId)
    if (!cat) continue

    // Count rows in primary table only (first table in list)
    const primary = cat.tables[0]
    const fk = primary.fkColumn ?? 'tenant_id'
    let count = 0
    try {
      const { data } = await db
        .from(primary.name)
        .select('id', { count: 'exact', head: true })
        .eq(fk, tenantId)
      count = data?.length ?? 0
    } catch {
      // Table might not exist; count stays 0
    }

    // Rough estimate: ~500 bytes per row for text categories, 100KB per photo
    const bytesPerRow = cat.heavyCategory ? 100_000 : 500
    const estimate = count * bytesPerRow
    perCategory[catId] = { count, estimateBytes: estimate }
    totalEstimateBytes += estimate
  }

  return { totalEstimateBytes, perCategory }
}

// ============================================================
// getCategoryCounts (lightweight, for UI display)
// ============================================================

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.entityId

  const counts: Record<string, number> = {}

  await Promise.all(
    TAKEOUT_CATEGORIES.map(async (cat) => {
      const primary = cat.tables[0]
      const fk = primary.fkColumn ?? 'tenant_id'
      try {
        const { data } = await db.from(primary.name).select('id').eq(fk, tenantId).limit(MAX_ROWS)
        counts[cat.id] = data?.length ?? 0
      } catch {
        counts[cat.id] = 0
      }
    })
  )

  return counts
}

// ============================================================
// buildTakeoutZip
// ============================================================

export async function buildTakeoutZip(
  categoryIds: TakeoutCategoryId[],
  options: { includePDFs?: boolean } = {}
): Promise<{
  bytes: Uint8Array
  filename: string
  manifest: TakeoutManifest
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.entityId

  const encoder = new TextEncoder()
  const zipFiles: Record<string, Uint8Array> = {}
  const counts: Record<string, number> = {}
  const dateStr = new Date().toISOString().slice(0, 10)
  const prefix = `chefflow-export-${dateStr}`

  // Helper: query a table with tenant scoping
  async function queryTable(
    tableName: string,
    fkColumn: string = 'tenant_id'
  ): Promise<Record<string, unknown>[]> {
    try {
      const { data } = await db.from(tableName).select('*').eq(fkColumn, tenantId).limit(MAX_ROWS)
      return (data || []) as Record<string, unknown>[]
    } catch {
      return []
    }
  }

  // Helper: add JSON file to zip
  function addJson(path: string, data: unknown) {
    zipFiles[`${prefix}/${path}`] = encoder.encode(JSON.stringify(data, null, 2))
  }

  // Helper: add CSV file to zip
  function addCsv(path: string, headers: string[], rows: unknown[][]) {
    const csv = buildCsvSafe(headers, rows as (string | number | null | undefined)[][])
    zipFiles[`${prefix}/${path}`] = encoder.encode(csv)
  }

  // Process each selected category
  for (const catId of categoryIds) {
    const cat = TAKEOUT_CATEGORY_MAP.get(catId)
    if (!cat) continue

    // Fetch all tables for this category in parallel
    const tableData = await Promise.all(
      cat.tables.map(async (t) => ({
        name: t.name,
        rows: await queryTable(t.name, t.fkColumn),
      }))
    )

    const primaryRows = tableData[0]?.rows ?? []
    counts[catId] = primaryRows.length

    if (primaryRows.length === 0 && !cat.formats.includes('files')) {
      continue // Skip empty categories
    }

    // Always include JSON
    if (tableData.length === 1) {
      addJson(`${cat.folder}/${tableData[0].name}.json`, tableData[0].rows)
    } else {
      const combined: Record<string, unknown[]> = {}
      for (const td of tableData) {
        combined[td.name] = td.rows
      }
      addJson(`${cat.folder}/${catId}.json`, combined)
    }

    // Add CSV for categories that support it
    if (cat.formats.includes('csv') && primaryRows.length > 0) {
      const headers = Object.keys(primaryRows[0])
      const rows = primaryRows.map((row) =>
        headers.map((h) => {
          const val = row[h]
          if (val == null) return null
          if (typeof val === 'object') return JSON.stringify(val)
          return val
        })
      )
      addCsv(`${cat.folder}/${tableData[0].name}.csv`, headers, rows)
    }

    // Add ICS for events
    if (catId === 'events' && cat.formats.includes('ics')) {
      const events = primaryRows.filter((e: any) => e.event_date && e.status !== 'cancelled')
      if (events.length > 0) {
        const icsEntries = events.map((e: any) =>
          generateICS({
            id: e.id,
            title: e.occasion || 'Event',
            eventDate: String(e.event_date).slice(0, 10),
            startTime: e.start_time ?? undefined,
            endTime: e.end_time ?? undefined,
            location: e.location ?? undefined,
            guestCount: e.guest_count ?? undefined,
          })
        )
        // Merge individual ICS into a multi-event calendar
        const vcalHeader =
          'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ChefFlow//Data Export//EN\r\nCALSCALE:GREGORIAN\r\n'
        const vcalFooter = 'END:VCALENDAR\r\n'
        const vevents = icsEntries
          .map((ics) => {
            const start = ics.indexOf('BEGIN:VEVENT')
            const end = ics.indexOf('END:VEVENT') + 'END:VEVENT'.length
            return start >= 0 ? ics.slice(start, end) : ''
          })
          .filter(Boolean)
        const mergedIcs = vcalHeader + vevents.join('\r\n') + '\r\n' + vcalFooter
        zipFiles[`${prefix}/${cat.folder}/events.ics`] = encoder.encode(mergedIcs)
      }
    }
  }

  // Build manifest
  const { data: chefData } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const manifest: TakeoutManifest = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    chefName: chefData?.display_name ?? 'Unknown',
    businessName: chefData?.business_name ?? null,
    categories: categoryIds,
    counts,
    format: 'chefflow-takeout-v1',
  }

  addJson('manifest.json', manifest)

  // Build ZIP
  const bytes = zipSync(zipFiles)
  const filename = `chefflow-export-${dateStr}.zip`

  return { bytes, filename, manifest }
}
