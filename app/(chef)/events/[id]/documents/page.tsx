import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getBusinessDocInfo, getDocumentReadiness } from '@/lib/documents/actions'
import { getEventFinancialSummaryFull } from '@/lib/events/financial-summary-actions'
import { evaluateReadinessForDocumentGeneration } from '@/lib/events/readiness'
import { getChefArchetype } from '@/lib/archetypes/actions'
import {
  getEventDocumentSnapshotDrilldown,
  type SnapshotDocumentType,
  type SnapshotDrilldownOrder,
} from '@/lib/documents/snapshot-actions'
import { SNAPSHOT_DOCUMENT_LABELS } from '@/lib/documents/snapshot-constants'
import { getArchetypeDocumentPack } from '@/lib/documents/archetype-packs'
import {
  DOCUMENT_REQUEST_LABELS,
  getEventDocumentBulkRunHistory,
  getEventDocumentGenerationHealth,
} from '@/lib/documents/generation-jobs-actions'
import type { OperationalDocumentType } from '@/lib/documents/template-catalog'
import { BulkGenerateRunner } from '@/components/documents/bulk-generate-runner'
import { DocumentSection } from '@/components/documents/document-section'
import { ReadinessAwareDocumentButton } from '@/components/documents/readiness-aware-document-button'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

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

const CORE_PACKET_OPERATIONAL_TYPES: OperationalDocumentType[] = [
  'summary',
  'grocery',
  'foh',
  'prep',
  'execution',
  'checklist',
  'packing',
  'reset',
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatCurrency(cents: number | null | undefined): string {
  const amount = Number(cents ?? 0) / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
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

function isCorePacketOperationalType(type: OperationalDocumentType): boolean {
  return CORE_PACKET_OPERATIONAL_TYPES.includes(type)
}

function buildOperationalDocWorkspaceHref(eventId: string, type: OperationalDocumentType): string {
  if (type === 'travel') return `/events/${eventId}/travel`
  if (type === 'packing') return `/events/${eventId}/pack`
  return `/events/${eventId}/interactive?type=${type}`
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
    returnTo?: string
  }
}) {
  await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)

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

  const [
    event,
    readiness,
    businessDocs,
    archetype,
    drilldown,
    archiveBaseline,
    generationHealth,
    bulkRunHistory,
    financialSummary,
    readinessGate,
  ] = await Promise.all([
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
    getEventDocumentSnapshotDrilldown(params.id, {
      page: 1,
      pageSize: 1,
    }),
    getEventDocumentGenerationHealth(params.id),
    getEventDocumentBulkRunHistory(params.id),
    getEventFinancialSummaryFull(params.id).catch(() => null),
    evaluateReadinessForDocumentGeneration(params.id).catch(() => null),
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
  const exportParams = new URLSearchParams({ eventId: event.id })
  if (docFilter !== 'any') exportParams.set('doc', docFilter)
  if (fromDate) exportParams.set('from', fromDate)
  if (toDate) exportParams.set('to', toDate)
  if (order !== 'newest') exportParams.set('order', order)
  if (versionQuery) exportParams.set('version', versionQuery)
  const eventArchiveExportHref = `/api/documents/snapshots/export?${exportParams.toString()}`
  const archiveStatsByType = new Map(
    archiveBaseline.typeStats.map((item) => [item.documentType, item])
  )
  const packetSnapshotCount = archiveStatsByType.get('all')?.count ?? 0
  const packetLatestSnapshot = archiveStatsByType.get('all')?.latest ?? null

  const recommendedDocReadiness = pack.recommendedOperationalDocs.map((type) => {
    const ready = isOperationalTypeReady(type, readiness)
    const typeStat = archiveStatsByType.get(type)
    const individualArchivedCount = typeStat?.count ?? 0
    const coveredByPacket = isCorePacketOperationalType(type) && packetSnapshotCount > 0
    const archived = individualArchivedCount > 0 || coveredByPacket
    return {
      type,
      ready,
      archived,
      individualArchivedCount,
      coveredByPacket,
      latestSnapshotId:
        individualArchivedCount > 0
          ? (typeStat?.latest?.id ?? null)
          : coveredByPacket
            ? (packetLatestSnapshot?.id ?? null)
            : null,
    }
  })

  const readinessComplete = recommendedDocReadiness.every((row) => row.ready)
  const archiveComplete = recommendedDocReadiness.every((row) => row.archived)
  const missingDataRows = recommendedDocReadiness.filter((row) => !row.ready)
  const readyToArchiveRows = recommendedDocReadiness.filter((row) => row.ready && !row.archived)
  const archivedRows = recommendedDocReadiness.filter((row) => row.archived)
  const firstMissingDataType = missingDataRows[0]?.type ?? null
  const readyRecommendedTypes = recommendedDocReadiness
    .filter((row) => row.ready)
    .map((row) => row.type)
  const missingArchiveTypes = recommendedDocReadiness
    .filter((row) => row.ready && !row.archived)
    .map((row) => row.type)
  const latestBulkFailedTypes =
    bulkRunHistory[0]?.docs.filter((doc) => doc.status === 'failed').map((doc) => doc.type) ?? []
  const historicalRetryRuns = bulkRunHistory
    .filter((run) => run.failed > 0)
    .slice(0, 4)
    .map((run) => ({
      runId: run.runId,
      failedTypes: run.docs.filter((doc) => doc.status === 'failed').map((doc) => doc.type),
      label: run.startedAt
        ? format(new Date(run.startedAt), 'MMM d h:mm a')
        : run.runId.slice(0, 8),
    }))
  const deliveryChecklist = [
    {
      label: 'Recommended docs have enough data to generate',
      done: readinessComplete,
      hint: `${recommendedDocReadiness.filter((row) => row.ready).length}/${recommendedDocReadiness.length} ready`,
    },
    {
      label: 'Recommended docs are archived as versioned PDFs',
      done: archiveComplete,
      hint: `${recommendedDocReadiness.filter((row) => row.archived).length}/${recommendedDocReadiness.length} archived`,
    },
    {
      label: 'Core packet snapshot exists (Print All)',
      done: packetSnapshotCount > 0,
      hint:
        packetSnapshotCount > 0
          ? `${packetSnapshotCount} packet snapshot${packetSnapshotCount === 1 ? '' : 's'}`
          : 'No packet snapshot archived yet',
    },
  ]
  const deliveryDoneCount = deliveryChecklist.filter((item) => item.done).length
  const deliveryProgressPct = Math.round((deliveryDoneCount / deliveryChecklist.length) * 100)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Event Documents</h1>
          <p className="text-stone-400 mt-1">
            {event.occasion || 'Untitled Event'} -{' '}
            {format(new Date(event.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </p>
          <p className="text-sm text-stone-500 mt-1">
            Generate event PDFs automatically or start from blank templates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReadinessAwareDocumentButton
            eventId={event.id}
            href={`/api/documents/${event.id}?type=all&archive=1`}
            label="Print All (8 Sheets)"
            readiness={readinessGate}
          />
          <Link href={returnTo ?? `/events/${event.id}`}>
            <Button variant="secondary">Back to Event</Button>
          </Link>
        </div>
      </div>

      <Card className="p-4 border-stone-700">
        <p className="text-sm text-stone-300">
          Use `Blank` to fill from scratch. Use `Interactive` or `View PDF` for event-generated
          documents.
        </p>
      </Card>

      <Card className="p-6 border-stone-700">
        <h2 className="text-xl font-semibold">Quick Start</h2>
        <p className="text-sm text-stone-400 mt-1">
          Follow these steps: fill missing info, generate PDFs, then open the latest packet.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border border-stone-800 p-3 space-y-2">
            <p className="text-xs-tight uppercase tracking-wide text-stone-500">Step 1</p>
            <p className="text-sm font-medium text-stone-100">Fill Missing Data</p>
            <p className="text-xs text-stone-500">
              {missingDataRows.length === 0
                ? 'All recommended docs are data-ready.'
                : `${missingDataRows.length} doc${missingDataRows.length === 1 ? '' : 's'} still need data.`}
            </p>
            {firstMissingDataType ? (
              <Link href={buildOperationalDocWorkspaceHref(event.id, firstMissingDataType)}>
                <Button variant="secondary" size="sm">
                  Open First Missing Doc
                </Button>
              </Link>
            ) : (
              <span className="text-xs text-emerald-400">Done</span>
            )}
          </div>

          <div className="rounded border border-stone-800 p-3 space-y-2">
            <p className="text-xs-tight uppercase tracking-wide text-stone-500">Step 2</p>
            <p className="text-sm font-medium text-stone-100">Create PDFs</p>
            <p className="text-xs text-stone-500">
              {readyToArchiveRows.length === 0
                ? 'No new docs waiting to archive.'
                : `${readyToArchiveRows.length} ready doc${readyToArchiveRows.length === 1 ? '' : 's'} can be archived now.`}
            </p>
            <span className="text-xs text-stone-400">Use the automation buttons below.</span>
          </div>

          <div className="rounded border border-stone-800 p-3 space-y-2">
            <p className="text-xs-tight uppercase tracking-wide text-stone-500">Step 3</p>
            <p className="text-sm font-medium text-stone-100">Open or Share</p>
            <p className="text-xs text-stone-500">
              {archivedRows.length}/{recommendedDocReadiness.length} recommended docs archived.
            </p>
            <div className="flex flex-wrap gap-2">
              {packetLatestSnapshot ? (
                <Button
                  variant="ghost"
                  size="sm"
                  href={`/api/documents/snapshots/${packetLatestSnapshot.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Latest Packet
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" href={eventArchiveExportHref}>
                Export Archive CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <details className="rounded border border-stone-800 px-4 py-3">
        <summary className="cursor-pointer text-sm text-stone-300">
          Service packet details ({readyCount}/{pack.recommendedOperationalDocs.length} ready)
        </summary>
        <Card className="p-6 mt-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{pack.title}</h2>
              <p className="text-sm text-stone-400 mt-1">{pack.subtitle}</p>
              <p className="text-xs text-stone-500 mt-2">
                Ready now: {readyCount}/{pack.recommendedOperationalDocs.length} recommended docs
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ReadinessAwareDocumentButton
                eventId={event.id}
                href={`/api/documents/${event.id}?type=pack&types=${encodeURIComponent(packTypesParam)}&archive=1`}
                label="Print Recommended Pack"
                readiness={readinessGate}
                variant="primary"
                size="sm"
              />
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
      </details>

      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Completion Checklist</h2>
            <p className="text-sm text-stone-400 mt-1">
              Final checks so nothing gets missed before service.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Progress</span>
            <span
              className={`text-sm font-semibold ${deliveryProgressPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {deliveryProgressPct}%
            </span>
          </div>
        </div>

        <div className="mt-3 h-2 rounded bg-stone-800 overflow-hidden">
          <div
            className={
              deliveryProgressPct === 100 ? 'h-full bg-emerald-500' : 'h-full bg-amber-500'
            }
            style={{ width: `${deliveryProgressPct}%` }}
          />
        </div>

        <div className="mt-4 space-y-2">
          {deliveryChecklist.map((item) => (
            <div
              key={item.label}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded border border-stone-800 px-3 py-2"
            >
              <p className="text-sm text-stone-100">{item.label}</p>
              <p className={`text-xs ${item.done ? 'text-emerald-400' : 'text-amber-400'}`}>
                {item.done ? 'Done' : 'Pending'} - {item.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <p className="text-xs text-stone-500 mb-2">
            One click generates missing packet PDFs and logs each run.
          </p>
          <BulkGenerateRunner
            eventId={event.id}
            readiness={readinessGate}
            recommendedTypes={pack.recommendedOperationalDocs}
            readyRecommendedTypes={readyRecommendedTypes}
            missingArchiveTypes={missingArchiveTypes}
            initialLatestFailedTypes={latestBulkFailedTypes}
            historicalRetryRuns={historicalRetryRuns}
          />
        </div>

        <details className="mt-5 rounded border border-stone-800 px-3 py-2">
          <summary className="cursor-pointer text-sm text-stone-300">
            Per-document status and actions
          </summary>
          <div className="mt-3 space-y-2">
            {recommendedDocReadiness.map((row) => (
              <div
                key={row.type}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 rounded border border-stone-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {SNAPSHOT_DOCUMENT_LABELS[row.type]}
                  </p>
                  <p className="text-xs text-stone-500">
                    Data:{' '}
                    <span className={row.ready ? 'text-emerald-400' : 'text-amber-400'}>
                      {row.ready ? 'Ready' : 'Needs data'}
                    </span>
                    {' - '}Archive:{' '}
                    <span className={row.archived ? 'text-emerald-400' : 'text-amber-400'}>
                      {row.archived ? 'Saved' : 'Missing'}
                    </span>
                    {row.coveredByPacket && !row.individualArchivedCount
                      ? ' - Covered by packet snapshot'
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!row.ready ? (
                    <Link href={buildOperationalDocWorkspaceHref(event.id, row.type)}>
                      <Button variant="secondary" size="sm">
                        Fill Data
                      </Button>
                    </Link>
                  ) : !row.archived ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      href={`/api/documents/${event.id}?type=${row.type}&archive=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Archive Now
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      href={`/api/documents/${event.id}?type=${row.type}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Preview
                    </Button>
                  )}
                  {row.latestSnapshotId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      href={`/api/documents/snapshots/${row.latestSnapshotId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Latest Snapshot
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      </Card>

      <details className="rounded border border-stone-800 px-4 py-3">
        <summary className="cursor-pointer text-sm text-stone-300">
          Optional: Financial summary for this event
        </summary>
        <Card className="p-6 mt-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Financial Snapshot</h2>
              <p className="text-sm text-stone-400 mt-1">
                Revenue, cost, and profit status for this event without leaving Documents Hub.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${event.id}/financial`}>
                <Button variant="secondary" size="sm">
                  Financial Hub
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                href={`/api/documents/financial-summary/${event.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Financial PDF
              </Button>
            </div>
          </div>

          {!financialSummary ? (
            <p className="text-sm text-stone-500 mt-4">
              Financial snapshot unavailable right now. Open Financial Hub to review event ledger
              and expenses.
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded border border-stone-800 px-3 py-2">
                  <p className="text-xs-tight uppercase tracking-wide text-stone-500">Quoted</p>
                  <p className="text-sm font-semibold text-stone-100">
                    {formatCurrency(financialSummary.revenue.quotedPriceCents)}
                  </p>
                </div>
                <div className="rounded border border-stone-800 px-3 py-2">
                  <p className="text-xs-tight uppercase tracking-wide text-stone-500">Received</p>
                  <p className="text-sm font-semibold text-stone-100">
                    {formatCurrency(financialSummary.revenue.totalReceivedCents)}
                  </p>
                </div>
                <div className="rounded border border-stone-800 px-3 py-2">
                  <p className="text-xs-tight uppercase tracking-wide text-stone-500">Total Cost</p>
                  <p className="text-sm font-semibold text-stone-100">
                    {formatCurrency(financialSummary.costs.totalCostCents)}
                  </p>
                </div>
                <div className="rounded border border-stone-800 px-3 py-2">
                  <p className="text-xs-tight uppercase tracking-wide text-stone-500">Net Profit</p>
                  <p
                    className={`text-sm font-semibold ${financialSummary.margins.netProfitWithTipCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {formatCurrency(financialSummary.margins.netProfitWithTipCents)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs rounded border border-stone-700 px-2 py-1 text-stone-400">
                  Food Cost: {financialSummary.margins.foodCostPercent}%
                </span>
                <span className="text-xs rounded border border-stone-700 px-2 py-1 text-stone-400">
                  Gross Margin: {financialSummary.margins.grossMarginPercent}%
                </span>
                <span className="text-xs rounded border border-stone-700 px-2 py-1 text-stone-400">
                  Pending Items: {financialSummary.pendingItems.length}
                </span>
                {financialSummary.event.financialClosed && (
                  <span className="text-xs rounded border border-emerald-700/60 px-2 py-1 text-emerald-400">
                    Financially Closed
                  </span>
                )}
              </div>
            </>
          )}
        </Card>
      </details>

      <DocumentSection
        eventId={event.id}
        readiness={readiness}
        businessDocs={businessDocs}
        readinessGate={readinessGate}
      />

      <details className="rounded border border-stone-800 px-4 py-3">
        <summary className="cursor-pointer text-sm text-stone-300">
          Advanced tools: automation logs, archive filters, and all snapshots
        </summary>

        <div className="mt-4 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Automation Activity</h2>
            <p className="text-stone-500 text-sm mb-4">
              Recent status for document generation jobs on this event.
            </p>

            {generationHealth.total === 0 ? (
              <p className="text-sm text-stone-500">
                No generation jobs recorded yet. Generate any document to start tracking health.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded border border-stone-800 px-3 py-2">
                    <p className="text-xs-tight uppercase tracking-wide text-stone-500">Total</p>
                    <p className="text-lg font-semibold text-stone-100">{generationHealth.total}</p>
                  </div>
                  <div className="rounded border border-stone-800 px-3 py-2">
                    <p className="text-xs-tight uppercase tracking-wide text-stone-500">
                      Succeeded
                    </p>
                    <p className="text-lg font-semibold text-emerald-500">
                      {generationHealth.succeeded}
                    </p>
                  </div>
                  <div className="rounded border border-stone-800 px-3 py-2">
                    <p className="text-xs-tight uppercase tracking-wide text-stone-500">Failed</p>
                    <p className="text-lg font-semibold text-rose-500">{generationHealth.failed}</p>
                  </div>
                  <div className="rounded border border-stone-800 px-3 py-2">
                    <p className="text-xs-tight uppercase tracking-wide text-stone-500">
                      In Progress
                    </p>
                    <p className="text-lg font-semibold text-amber-500">
                      {generationHealth.started}
                    </p>
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
                          {row.succeeded} succeeded / {row.failed} failed / {row.started} running
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

                {bulkRunHistory.length > 0 && (
                  <div className="pt-3 border-t border-stone-800">
                    <h3 className="text-sm font-semibold text-stone-200 mb-2">Bulk Runs</h3>
                    <div className="space-y-2">
                      {bulkRunHistory.map((run) => (
                        <div
                          key={run.runId}
                          className="rounded border border-stone-800 px-3 py-2 space-y-1"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <p className="text-xs text-stone-400">
                              Run {run.runId} - {run.succeeded} of {run.total} succeeded
                              {run.failed > 0 ? `, ${run.failed} failed` : ''}
                            </p>
                            <p className="text-xs text-stone-500">
                              {run.startedAt
                                ? format(new Date(run.startedAt), 'MMM d, yyyy h:mm a')
                                : 'Unknown start'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {run.docs.map((doc) => {
                              const className = `text-xs-tight rounded border px-2 py-0.5 ${
                                doc.status === 'succeeded'
                                  ? 'border-emerald-700/60 text-emerald-400'
                                  : doc.status === 'failed'
                                    ? 'border-rose-700/60 text-rose-400'
                                    : 'border-amber-700/60 text-amber-400'
                              }`

                              if (doc.snapshotId) {
                                return (
                                  <a
                                    key={`${run.runId}-${doc.type}`}
                                    href={`/api/documents/snapshots/${doc.snapshotId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${className} hover:underline`}
                                    title={`${SNAPSHOT_DOCUMENT_LABELS[doc.type]} (open snapshot)`}
                                  >
                                    {SNAPSHOT_DOCUMENT_LABELS[doc.type]}
                                  </a>
                                )
                              }

                              return (
                                <span
                                  key={`${run.runId}-${doc.type}`}
                                  className={className}
                                  title={doc.error ?? undefined}
                                >
                                  {SNAPSHOT_DOCUMENT_LABELS[doc.type]}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Archive Filters</h2>
            <p className="text-stone-500 text-sm mb-4">
              Filter saved PDFs by type, date range, and version.
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
                  <p className="text-xs-tight text-stone-500 mb-1">From</p>
                  <input
                    type="date"
                    name="from"
                    defaultValue={fromDate}
                    className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
                  />
                </div>
                <div>
                  <p className="text-xs-tight text-stone-500 mb-1">To</p>
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
                <Button variant="ghost" size="sm" href={eventArchiveExportHref}>
                  Export CSV
                </Button>
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
                No archived PDFs yet. Use any `Archive` button or `Print All (8 Sheets)` to save
                versioned copies.
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
                        <Button
                          variant="ghost"
                          size="sm"
                          href={`/api/documents/snapshots/${entry.latest.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open Latest
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Archive Results</h2>
            <p className="text-stone-500 text-sm mb-4">
              Showing {filteredSnapshots.length} result{filteredSnapshots.length === 1 ? '' : 's'}{' '}
              on this page from {drilldown.total} matching archived record
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
                        {SNAPSHOT_DOCUMENT_LABELS[snapshot.documentType]} - v
                        {snapshot.versionNumber}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        href={`/api/documents/snapshots/${snapshot.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </Button>
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
      </details>
    </div>
  )
}
