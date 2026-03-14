import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { isSnapshotDocumentType } from '@/lib/documents/document-definitions'
import {
  getTenantDocumentSnapshotDrilldown,
  type SnapshotDrilldownOrder,
} from '@/lib/documents/snapshot-actions'
import { SNAPSHOT_DOCUMENT_LABELS } from '@/lib/documents/snapshot-constants'

export const dynamic = 'force-dynamic'

const MAX_EXPORT_ROWS = 5000
const PAGE_SIZE = 250

function normalizeDateInput(value: string | null): string | null {
  if (!value) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function normalizeOrder(value: string | null): SnapshotDrilldownOrder {
  return value === 'oldest' ? 'oldest' : 'newest'
}

function normalizeVersion(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const normalized = String(value)
  if (!/[",\n]/.test(normalized)) return normalized
  return `"${normalized.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  try {
    await requireChef()

    const docRaw = (request.nextUrl.searchParams.get('doc') ?? 'any').trim().toLowerCase()
    const docType = isSnapshotDocumentType(docRaw) ? docRaw : null
    const eventId = (request.nextUrl.searchParams.get('eventId') ?? '').trim() || null
    const fromDate = normalizeDateInput(request.nextUrl.searchParams.get('from'))
    const toDate = normalizeDateInput(request.nextUrl.searchParams.get('to'))
    const order = normalizeOrder(request.nextUrl.searchParams.get('order'))
    const versionNumber = normalizeVersion(request.nextUrl.searchParams.get('version'))
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim()

    const rows: Awaited<ReturnType<typeof getTenantDocumentSnapshotDrilldown>>['items'] = []
    let page = 1
    let totalPages = 1

    do {
      const drilldown = await getTenantDocumentSnapshotDrilldown({
        eventId,
        docType,
        versionNumber,
        fromDate,
        toDate,
        order,
        query,
        page,
        pageSize: PAGE_SIZE,
      })

      rows.push(...drilldown.items)
      totalPages = drilldown.totalPages
      page += 1
    } while (page <= totalPages && rows.length < MAX_EXPORT_ROWS)

    const clippedRows = rows.slice(0, MAX_EXPORT_ROWS)
    const lines = [
      [
        'generated_at',
        'document_type',
        'document_label',
        'version_number',
        'filename',
        'size_bytes',
        'event_occasion',
        'event_date',
        'event_status',
        'client_name',
        'event_id',
        'snapshot_id',
      ].join(','),
      ...clippedRows.map((row) =>
        [
          escapeCsv(row.generatedAt),
          escapeCsv(row.documentType),
          escapeCsv(SNAPSHOT_DOCUMENT_LABELS[row.documentType]),
          escapeCsv(row.versionNumber),
          escapeCsv(row.filename),
          escapeCsv(row.sizeBytes),
          escapeCsv(row.eventOccasion),
          escapeCsv(row.eventDate),
          escapeCsv(row.eventStatus),
          escapeCsv(row.clientName),
          escapeCsv(row.eventId),
          escapeCsv(row.id),
        ].join(',')
      ),
    ]

    const csv = `${lines.join('\n')}\n`
    const stamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const fileName = `document-archive-export-${stamp}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-Export-Row-Count': String(clippedRows.length),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export document snapshots'
    if (message.toLowerCase().includes('unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[documents/snapshots/export] Error:', error)
    return NextResponse.json({ error: 'Failed to export snapshots' }, { status: 500 })
  }
}
