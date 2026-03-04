import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getBusinessDocInfo, getDocumentReadiness } from '@/lib/documents/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import {
  getEventDocumentSnapshotDrilldown,
  SNAPSHOT_DOCUMENT_LABELS,
  type SnapshotDocumentType,
  type SnapshotDrilldownOrder,
} from '@/lib/documents/snapshot-actions'
import { getArchetypeDocumentPack } from '@/lib/documents/archetype-packs'
import {
  DOCUMENT_REQUEST_LABELS,
  getEventDocumentGenerationHealth,
} from '@/lib/documents/generation-jobs-actions'
import type { OperationalDocumentType } from '@/lib/documents/template-catalog'
import { DocumentSection } from '@/components/documents/document-section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type SnapshotDocFilter = 'any' | SnapshotDocumentType

type DrilldownQueryState = {
  doc: SnapshotDocFilter
  from: string
  to: string
  order: SnapshotDrilldownOrder
  version: string
  page: number
}

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

const SNAPSHOT_TYPE_FILTERS: Array<{ value: SnapshotDocFilter; label: string }> = [
  { value: 'any', label: 'Any Type' },
  ...SNAPSHOT_DOCUMENT_TYPES.map((type) => ({
    value: type,
    label: SNAPSHOT_DOCUMENT_LABELS[type],
  })),
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function isOperationalTypeReady(type: OperationalDocumentType, readiness: any): boolean {
  if (type === 'summary') return readiness.eventSummary.ready
  if (type === 'grocery') return readiness.groceryList.ready
  if (type === 'foh') return readiness.frontOfHouseMenu.ready
  if (type === 'prep') return readiness.prepSheet.ready
  if (type === 'execution') return readiness.executionSheet.ready
  if (type === 'checklist') return readiness.checklist.ready
  if (type === 'packing') return readiness.packingList.ready
  if (type === 'reset') return readiness.resetChecklist.ready
  if (type === 'travel') return readiness.travelRoute.ready
  if (type === 'shots') return true
  return false
}

function isSnapshotDocumentType(value: string): value is SnapshotDocumentType {
  return SNAPSHOT_DOCUMENT_TYPES.includes(value as SnapshotDocumentType)
}

function normalizeDateInput(value: string | undefined): string {
  if (!value) return ''
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function normalizeOrder(value: string | undefined): SnapshotDrilldownOrder {
  return value === 'oldest' ? 'oldest' : 'newest'
}

function normalizePage(value: string | undefined): number {
  if (!value) return 1
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return parsed
}

function buildDrilldownHref(
  eventId: string,
  current: DrilldownQueryState,
  overrides: Partial<DrilldownQueryState>
): string {
  const merged: DrilldownQueryState = {
    ...current,
    ...overrides,
  }

  if (merged.doc === 'any') {
    merged.version = ''
  }
  if (merged.page < 1) {
    merged.page = 1
  }

  const params = new URLSearchParams()
  if (merged.doc !== 'any') params.set('doc', merged.doc)
  if (merged.from) params.set('from', merged.from)
  if (merged.to) params.set('to', merged.to)
  if (merged.order !== 'newest') params.set('order', merged.order)
  if (merged.version) params.set('version', merged.version)
  if (merged.page > 1) params.set('page', String(merged.page))

  const query = params.toString()
  return query ? `/events/${eventId}/documents?${query}` : `/events/${eventId}/documents`
}

export default async function EventDocumentsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: {
    doc?: string
    from?: string
    to?: string
    order?: string
    version?: string
    page?: string
  }
}) {
  await requireChef()

  const rawDoc = (searchParams?.doc ?? 'any').trim().toLowerCase()
  const docFilter: SnapshotDocFilter =
    rawDoc === 'any' ? 'any' : isSnapshotDocumentType(rawDoc) ? rawDoc : 'any'
  let fromDate = normalizeDateInput(searchParams?.from)
  let toDate = normalizeDateInput(searchParams?.to)
  const order = normalizeOrder(searchParams?.order)
  const page = normalizePage(searchParams?.page)
  const rawVersion = (searchParams?.version ?? '').trim()
  const parsedVersion = Number.parseInt(rawVersion, 10)
  const versionFilter =
    docFilter !== 'any' && Number.isInteger(parsedVersion) && parsedVersion > 0
      ? parsedVersion
      : null
  const versionQuery = versionFilter ? String(versionFilter) : ''

  const rangeStart = fromDate ? new Date(`${fromDate}T00:00:00.000`).getTime() : null
  const rangeEnd = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null
  if (rangeStart !== null && rangeEnd !== null && rangeStart > rangeEnd) {
    ;[fromDate, toDate] = [toDate, fromDate]
  }

  const queryState: DrilldownQueryState = {
    doc: docFilter,
    from: fromDate,
    to: toDate,
    order,
    version: versionQuery,
    page,
  }

  const [event, readiness, businessDocs, archetype, drilldown, generationHealth] =
    await Promise.all([
      getEventById(params.id),
      getDocumentReadiness(params.id),
      getBusinessDocInfo(params.id).catch(() => null),
      getChefArchetype(),
      getEventDocumentSnapshotDrilldown(params.id, {
        docType: docFilter === 'any' ? null : docFilter,
        fromDate,
        toDate,
        versionNumber: versionFilter,
        order,
        page,
        pageSize: 25,
      }),
      getEventDocumentGenerationHealth(params.id),
    ])

  if (!event) notFound()

  const pack = getArchetypeDocumentPack(archetype)
  const readyCount = pack.recommendedOperationalDocs.filter((type) =>
    isOperationalTypeReady(type, readiness)
  ).length
  const packTypesParam = pack.recommendedOperationalDocs.join(',')
  const filteredSnapshots = drilldown.items
  const docVersionOptions = drilldown.versionOptions
  const nonEmptyTypeStats = drilldown.typeStats.filter((item) => item.count > 0)
  const generationTypeRows = generationHealth.byType.filter((row) => row.total > 0).slice(0, 8)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Documents Hub</h1>
          <p className="text-stone-400 mt-1">
            {event.occasion || 'Untitled Event'} -{' '}
            {format(new Date(event.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            Auto-generated docs + blank templates for manual fill.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/documents/${event.id}?type=all&archive=1`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary">Print All (8 Sheets)</Button>
          </a>
          <Link href={`/events/${event.id}`}>
            <Button variant="secondary">Back to Event</Button>
          </Link>
        </div>
      </div>

      <Card className="p-4 border-stone-700">
        <p className="text-sm text-stone-300">
          Use `Blank` for manual entry from scratch. Use `Interactive` or `View PDF` for
          auto-generated documents tied to this event.
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{pack.title}</h2>
            <p className="text-sm text-stone-400 mt-1">{pack.subtitle}</p>
            <p className="text-xs text-stone-500 mt-2">
              Ready now: {readyCount}/{pack.recommendedOperationalDocs.length} recommended docs
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/documents/${event.id}?type=pack&types=${encodeURIComponent(packTypesParam)}&archive=1`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="sm">
                Print Recommended Pack
              </Button>
            </a>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {pack.recommendedOperationalDocs.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between rounded border border-stone-800 px-3 py-2"
            >
              <p className="text-sm text-stone-200">{SNAPSHOT_DOCUMENT_LABELS[type]}</p>
              <span
                className={
                  isOperationalTypeReady(type, readiness)
                    ? 'text-xs text-emerald-500'
                    : 'text-xs text-amber-500'
                }
              >
                {isOperationalTypeReady(type, readiness) ? 'Ready' : 'Needs data'}
              </span>
            </div>
          ))}
        </div>
        {pack.futureDocs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-800">
            <p className="text-xs text-stone-500 mb-2">
              Next archetype-specific docs planned for this business type:
            </p>
            <div className="flex flex-wrap gap-2">
              {pack.futureDocs.map((item) => (
                <span
                  key={item}
                  className="text-xs rounded border border-stone-700 px-2 py-1 text-stone-400"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <DocumentSection eventId={event.id} readiness={readiness} businessDocs={businessDocs} />

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Generation Health</h2>
        <p className="text-stone-500 text-sm mb-4">
          Live status for auto-generated document jobs on this event.
        </p>

        {generationHealth.total === 0 ? (
          <p className="text-sm text-stone-500">
            No generation jobs recorded yet. Generate any document to start tracking health.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded border border-stone-800 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">Total</p>
                <p className="text-lg font-semibold text-stone-100">{generationHealth.total}</p>
              </div>
              <div className="rounded border border-stone-800 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">Succeeded</p>
                <p className="text-lg font-semibold text-emerald-500">
                  {generationHealth.succeeded}
                </p>
              </div>
              <div className="rounded border border-stone-800 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">Failed</p>
                <p className="text-lg font-semibold text-rose-500">{generationHealth.failed}</p>
              </div>
              <div className="rounded border border-stone-800 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">In Progress</p>
                <p className="text-lg font-semibold text-amber-500">{generationHealth.started}</p>
              </div>
            </div>

            <div className="space-y-2">
              {generationTypeRows.map((row) => (
                <div
                  key={row.requestedType}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border border-stone-800 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      {DOCUMENT_REQUEST_LABELS[row.requestedType]}
                    </p>
                    <p className="text-xs text-stone-500">
                      {row.succeeded} success / {row.failed} failed / {row.started} in progress
                    </p>
                  </div>
                  <div className="text-xs text-stone-500 text-right">
                    <p>
                      Last status:{' '}
                      <span className="text-stone-300">{row.lastStatus ?? 'unknown'}</span>
                    </p>
                    {row.lastCreatedAt && (
                      <p>{format(new Date(row.lastCreatedAt), 'MMM d, yyyy h:mm a')}</p>
                    )}
                    {row.lastError && row.lastStatus === 'failed' && (
                      <p className="text-rose-400 max-w-[340px] truncate" title={row.lastError}>
                        {row.lastError}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Archive Drilldown</h2>
        <p className="text-stone-500 text-sm mb-4">
          Filter archived PDFs by document type, date range, and version.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {SNAPSHOT_TYPE_FILTERS.map((filterOption) => (
            <Link
              key={filterOption.value}
              href={buildDrilldownHref(event.id, queryState, {
                doc: filterOption.value,
                version: '',
                page: 1,
              })}
            >
              <Button
                variant={docFilter === filterOption.value ? 'primary' : 'secondary'}
                size="sm"
              >
                {filterOption.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 border border-stone-800 rounded p-3">
          <form method="get" className="flex flex-wrap items-end gap-2">
            {docFilter !== 'any' && <input type="hidden" name="doc" value={docFilter} />}
            {order !== 'newest' && <input type="hidden" name="order" value={order} />}
            {versionQuery && docFilter !== 'any' && (
              <input type="hidden" name="version" value={versionQuery} />
            )}
            <div>
              <p className="text-[11px] text-stone-500 mb-1">From</p>
              <input
                type="date"
                name="from"
                defaultValue={fromDate}
                className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
              />
            </div>
            <div>
              <p className="text-[11px] text-stone-500 mb-1">To</p>
              <input
                type="date"
                name="to"
                defaultValue={toDate}
                className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Apply Range
            </Button>
            {(fromDate || toDate) && (
              <Link
                href={buildDrilldownHref(event.id, queryState, {
                  from: '',
                  to: '',
                  page: 1,
                })}
              >
                <Button variant="ghost" size="sm">
                  Clear Range
                </Button>
              </Link>
            )}
          </form>

          <div className="flex items-center gap-2">
            <p className="text-xs text-stone-500">Order</p>
            <Link href={buildDrilldownHref(event.id, queryState, { order: 'newest', page: 1 })}>
              <Button variant={order === 'newest' ? 'primary' : 'secondary'} size="sm">
                Newest
              </Button>
            </Link>
            <Link href={buildDrilldownHref(event.id, queryState, { order: 'oldest', page: 1 })}>
              <Button variant={order === 'oldest' ? 'primary' : 'secondary'} size="sm">
                Oldest
              </Button>
            </Link>
          </div>
        </div>

        {docFilter !== 'any' && docVersionOptions.length > 0 && (
          <div className="mt-3 p-3 rounded border border-stone-800">
            <p className="text-xs text-stone-500 mb-2">
              Version filter for {SNAPSHOT_DOCUMENT_LABELS[docFilter]}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={buildDrilldownHref(event.id, queryState, { version: '', page: 1 })}>
                <Button variant={!versionQuery ? 'primary' : 'secondary'} size="sm">
                  All Versions
                </Button>
              </Link>
              {docVersionOptions.map((versionNumber) => (
                <Link
                  key={versionNumber}
                  href={buildDrilldownHref(event.id, queryState, {
                    version: String(versionNumber),
                    page: 1,
                  })}
                >
                  <Button
                    variant={versionQuery === String(versionNumber) ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    v{versionNumber}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {nonEmptyTypeStats.length === 0 ? (
          <p className="text-sm text-stone-500 mt-4">
            No archived snapshots yet. Use any `Archive` button or `Print All (8 Sheets)` to save
            versioned PDFs.
          </p>
        ) : (
          <div className="space-y-3 mt-4">
            {nonEmptyTypeStats.map((entry) => {
              if (!entry.latest) return null
              return (
                <div
                  key={entry.documentType}
                  className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 border-b border-stone-800 pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-stone-100">
                      {SNAPSHOT_DOCUMENT_LABELS[entry.documentType]}
                    </p>
                    <p className="text-xs text-stone-500">
                      {entry.count} version{entry.count === 1 ? '' : 's'} - latest v
                      {entry.latest.versionNumber} on{' '}
                      {format(new Date(entry.latest.generatedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={buildDrilldownHref(event.id, queryState, {
                        doc: entry.documentType,
                        version: '',
                        page: 1,
                      })}
                    >
                      <Button
                        variant={docFilter === entry.documentType ? 'primary' : 'secondary'}
                        size="sm"
                      >
                        Drill In
                      </Button>
                    </Link>
                    <a
                      href={`/api/documents/snapshots/${entry.latest.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        Open Latest
                      </Button>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Snapshot Results</h2>
        <p className="text-stone-500 text-sm mb-4">
          Showing {filteredSnapshots.length} snapshot{filteredSnapshots.length === 1 ? '' : 's'} on
          this page from {drilldown.total} matching archived record
          {drilldown.total === 1 ? '' : 's'}.
        </p>
        {filteredSnapshots.length === 0 ? (
          <p className="text-sm text-stone-500">
            No snapshots match the current filters. Adjust type, date, or version filters.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredSnapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border border-stone-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {SNAPSHOT_DOCUMENT_LABELS[snapshot.documentType]} - v{snapshot.versionNumber}
                  </p>
                  <p className="text-xs text-stone-500">
                    {format(new Date(snapshot.generatedAt), 'MMM d, yyyy h:mm a')} -{' '}
                    {formatBytes(snapshot.sizeBytes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {docFilter === 'any' && (
                    <Link
                      href={buildDrilldownHref(event.id, queryState, {
                        doc: snapshot.documentType,
                        version: '',
                        page: 1,
                      })}
                    >
                      <Button variant="secondary" size="sm">
                        Type View
                      </Button>
                    </Link>
                  )}
                  <a
                    href={`/api/documents/snapshots/${snapshot.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {drilldown.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-stone-800 flex items-center justify-between">
            <div className="text-xs text-stone-500">
              Page {drilldown.page} of {drilldown.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={buildDrilldownHref(event.id, queryState, {
                  page: Math.max(1, drilldown.page - 1),
                })}
              >
                <Button variant="secondary" size="sm" disabled={!drilldown.hasPreviousPage}>
                  Previous
                </Button>
              </Link>
              <Link
                href={buildDrilldownHref(event.id, queryState, {
                  page: Math.min(drilldown.totalPages, drilldown.page + 1),
                })}
              >
                <Button variant="secondary" size="sm" disabled={!drilldown.hasNextPage}>
                  Next
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
