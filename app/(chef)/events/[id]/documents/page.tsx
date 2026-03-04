import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getBusinessDocInfo, getDocumentReadiness } from '@/lib/documents/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import {
  getEventDocumentSnapshots,
  SNAPSHOT_DOCUMENT_LABELS,
  type SnapshotDocumentType,
} from '@/lib/documents/snapshot-actions'
import { getArchetypeDocumentPack } from '@/lib/documents/archetype-packs'
import type { OperationalDocumentType } from '@/lib/documents/template-catalog'
import { DocumentSection } from '@/components/documents/document-section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type SnapshotDocFilter = 'any' | SnapshotDocumentType
type SnapshotOrder = 'newest' | 'oldest'

type DrilldownQueryState = {
  doc: SnapshotDocFilter
  from: string
  to: string
  order: SnapshotOrder
  version: string
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

function normalizeOrder(value: string | undefined): SnapshotOrder {
  return value === 'oldest' ? 'oldest' : 'newest'
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

  const params = new URLSearchParams()
  if (merged.doc !== 'any') params.set('doc', merged.doc)
  if (merged.from) params.set('from', merged.from)
  if (merged.to) params.set('to', merged.to)
  if (merged.order !== 'newest') params.set('order', merged.order)
  if (merged.version) params.set('version', merged.version)

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
  }
}) {
  await requireChef()

  const [event, readiness, businessDocs, snapshots, archetype] = await Promise.all([
    getEventById(params.id),
    getDocumentReadiness(params.id),
    getBusinessDocInfo(params.id).catch(() => null),
    getEventDocumentSnapshots(params.id, 500),
    getChefArchetype(),
  ])

  if (!event) notFound()

  const rawDoc = (searchParams?.doc ?? 'any').trim().toLowerCase()
  const docFilter: SnapshotDocFilter =
    rawDoc === 'any' ? 'any' : isSnapshotDocumentType(rawDoc) ? rawDoc : 'any'
  let fromDate = normalizeDateInput(searchParams?.from)
  let toDate = normalizeDateInput(searchParams?.to)
  const order = normalizeOrder(searchParams?.order)
  const rawVersion = (searchParams?.version ?? '').trim()
  const parsedVersion = Number.parseInt(rawVersion, 10)
  const versionFilter =
    docFilter !== 'any' && Number.isInteger(parsedVersion) && parsedVersion > 0
      ? parsedVersion
      : null
  const versionQuery = versionFilter ? String(versionFilter) : ''

  let rangeStart = fromDate ? new Date(`${fromDate}T00:00:00.000`).getTime() : null
  let rangeEnd = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null
  if (rangeStart !== null && rangeEnd !== null && rangeStart > rangeEnd) {
    ;[rangeStart, rangeEnd] = [rangeEnd, rangeStart]
    ;[fromDate, toDate] = [toDate, fromDate]
  }

  const queryState: DrilldownQueryState = {
    doc: docFilter,
    from: fromDate,
    to: toDate,
    order,
    version: versionQuery,
  }

  const pack = getArchetypeDocumentPack(archetype)
  const readyCount = pack.recommendedOperationalDocs.filter((type) =>
    isOperationalTypeReady(type, readiness)
  ).length
  const packTypesParam = pack.recommendedOperationalDocs.join(',')

  const statsByType = new Map<
    SnapshotDocumentType,
    {
      count: number
      latest: (typeof snapshots)[number] | null
      oldest: (typeof snapshots)[number] | null
    }
  >()

  for (const type of SNAPSHOT_DOCUMENT_TYPES) {
    statsByType.set(type, { count: 0, latest: null, oldest: null })
  }

  for (const snapshot of snapshots) {
    const stats = statsByType.get(snapshot.documentType)
    if (!stats) continue

    stats.count += 1
    if (
      !stats.latest ||
      new Date(snapshot.generatedAt).getTime() > new Date(stats.latest.generatedAt).getTime()
    ) {
      stats.latest = snapshot
    }
    if (
      !stats.oldest ||
      new Date(snapshot.generatedAt).getTime() < new Date(stats.oldest.generatedAt).getTime()
    ) {
      stats.oldest = snapshot
    }
  }

  const filteredSnapshots = snapshots
    .filter((snapshot) => {
      if (docFilter !== 'any' && snapshot.documentType !== docFilter) return false
      if (versionFilter && snapshot.versionNumber !== versionFilter) return false
      const generatedAt = new Date(snapshot.generatedAt).getTime()
      if (rangeStart !== null && generatedAt < rangeStart) return false
      if (rangeEnd !== null && generatedAt > rangeEnd) return false
      return true
    })
    .sort((a, b) => {
      const aTime = new Date(a.generatedAt).getTime()
      const bTime = new Date(b.generatedAt).getTime()
      return order === 'oldest' ? aTime - bTime : bTime - aTime
    })

  const docVersionOptions =
    docFilter === 'any'
      ? []
      : Array.from(
          new Set(
            snapshots
              .filter((snapshot) => snapshot.documentType === docFilter)
              .map((snapshot) => snapshot.versionNumber)
          )
        ).sort((a, b) => b - a)

  const nonEmptyTypeStats = SNAPSHOT_DOCUMENT_TYPES.map((type) => ({
    type,
    stats: statsByType.get(type)!,
  })).filter((item) => item.stats.count > 0)

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
              <Link href={buildDrilldownHref(event.id, queryState, { from: '', to: '' })}>
                <Button variant="ghost" size="sm">
                  Clear Range
                </Button>
              </Link>
            )}
          </form>

          <div className="flex items-center gap-2">
            <p className="text-xs text-stone-500">Order</p>
            <Link href={buildDrilldownHref(event.id, queryState, { order: 'newest' })}>
              <Button variant={order === 'newest' ? 'primary' : 'secondary'} size="sm">
                Newest
              </Button>
            </Link>
            <Link href={buildDrilldownHref(event.id, queryState, { order: 'oldest' })}>
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
              <Link href={buildDrilldownHref(event.id, queryState, { version: '' })}>
                <Button variant={!versionQuery ? 'primary' : 'secondary'} size="sm">
                  All Versions
                </Button>
              </Link>
              {docVersionOptions.map((versionNumber) => (
                <Link
                  key={versionNumber}
                  href={buildDrilldownHref(event.id, queryState, {
                    version: String(versionNumber),
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
            {nonEmptyTypeStats.map(({ type, stats }) => {
              const latest = stats.latest
              if (!latest) return null
              return (
                <div
                  key={type}
                  className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 border-b border-stone-800 pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-stone-100">{SNAPSHOT_DOCUMENT_LABELS[type]}</p>
                    <p className="text-xs text-stone-500">
                      {stats.count} version{stats.count === 1 ? '' : 's'} - latest v
                      {latest.versionNumber} on{' '}
                      {format(new Date(latest.generatedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={buildDrilldownHref(event.id, queryState, {
                        doc: type,
                        version: '',
                      })}
                    >
                      <Button variant={docFilter === type ? 'primary' : 'secondary'} size="sm">
                        Drill In
                      </Button>
                    </Link>
                    <a
                      href={`/api/documents/snapshots/${latest.id}`}
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
          Showing {filteredSnapshots.length} snapshot{filteredSnapshots.length === 1 ? '' : 's'}{' '}
          from {snapshots.length} archived records.
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
        {snapshots.length >= 500 && (
          <p className="text-xs text-stone-500 mt-4">
            Showing the most recent 500 archives for performance.
          </p>
        )}
      </Card>
    </div>
  )
}
