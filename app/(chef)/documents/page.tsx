import Link from 'next/link'
import { format } from 'date-fns'
import { getEvents } from '@/lib/events/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import {
  DOCUMENT_TEMPLATE_CATALOG,
  type DocumentTemplateEntry,
  type DocumentTemplateSlug,
} from '@/lib/documents/template-catalog'
import {
  getRecentDocumentSnapshots,
  getTenantDocumentSnapshotDrilldown,
  type SnapshotDocumentType,
  type SnapshotDrilldownOrder,
} from '@/lib/documents/snapshot-actions'
import { SNAPSHOT_DOCUMENT_LABELS } from '@/lib/documents/snapshot-constants'
import { getArchetypeDocumentPack } from '@/lib/documents/archetype-packs'
import {
  EVENT_WORKSPACE_PHASES,
  getEventStatusBadgeClass,
  getEventWorkspacePhase,
  isEventWorkspacePhaseKey,
  type EventWorkspacePhaseKey,
} from '@/lib/documents/event-workspace'
import {
  getBusinessDocumentVaultOverview,
  SUPPORTED_CHEF_DOCUMENT_TYPES,
} from '@/lib/documents/file-service'
import { BusinessDocumentVault } from '@/components/documents/business-document-vault'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type EventListItem = {
  id: string
  occasion: string | null
  event_date: string
  status: string | null
  client?: { full_name?: string | null } | null
}

type EventWorkspaceRow = {
  id: string
  occasion: string
  eventDate: string
  status: string
  phase: EventWorkspacePhaseKey
  clientName: string
  snapshotCount: number
  latestSnapshotAt: string | null
}

type TemplateGroup = {
  id: string
  label: string
  slugs: DocumentTemplateSlug[]
}

type SnapshotDocFilter = 'any' | SnapshotDocumentType

type SnapshotQueryState = {
  doc: SnapshotDocFilter
  from: string
  to: string
  order: SnapshotDrilldownOrder
  q: string
  page: number
}

type VaultDocumentType = (typeof SUPPORTED_CHEF_DOCUMENT_TYPES)[number]

type VaultQueryState = {
  q: string
  type: VaultDocumentType | 'all'
}

type DocumentsPageState = {
  phaseFilter: EventWorkspacePhaseKey | 'all'
  phaseQuery: string
  snapshot: SnapshotQueryState
  vault: VaultQueryState
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

const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    id: 'service-core',
    label: 'Service Core',
    slugs: [
      'event-summary',
      'grocery-list',
      'front-of-house-menu',
      'prep-sheet',
      'execution-sheet',
      'non-negotiables-checklist',
      'packing-list',
      'post-service-reset',
    ],
  },
  {
    id: 'movement-and-content',
    label: 'Movement and Content',
    slugs: ['travel-route', 'content-asset-capture'],
  },
]

function buildDocumentsPageHref(
  current: DocumentsPageState,
  overrides?: {
    phaseFilter?: EventWorkspacePhaseKey | 'all'
    phaseQuery?: string
    snapshot?: Partial<SnapshotQueryState>
    vault?: Partial<VaultQueryState>
  }
): string {
  const mergedSnapshot: SnapshotQueryState = {
    ...current.snapshot,
    ...overrides?.snapshot,
  }
  const mergedVault: VaultQueryState = {
    ...current.vault,
    ...overrides?.vault,
  }
  const phaseFilter = overrides?.phaseFilter ?? current.phaseFilter
  const phaseQuery = overrides?.phaseQuery ?? current.phaseQuery
  const params = new URLSearchParams()
  if (phaseFilter !== 'all') params.set('phase', phaseFilter)
  if (phaseQuery) params.set('q', phaseQuery)

  if (mergedSnapshot.doc !== 'any') params.set('s_doc', mergedSnapshot.doc)
  if (mergedSnapshot.from) params.set('s_from', mergedSnapshot.from)
  if (mergedSnapshot.to) params.set('s_to', mergedSnapshot.to)
  if (mergedSnapshot.order !== 'newest') params.set('s_order', mergedSnapshot.order)
  if (mergedSnapshot.q) params.set('s_q', mergedSnapshot.q)
  if (mergedSnapshot.page > 1) params.set('s_page', String(mergedSnapshot.page))

  if (mergedVault.type !== 'all') params.set('v_type', mergedVault.type)
  if (mergedVault.q) params.set('v_q', mergedVault.q)

  const queryString = params.toString()
  return queryString ? `/documents?${queryString}` : '/documents'
}

function isSnapshotDocumentType(value: string): value is SnapshotDocumentType {
  return SNAPSHOT_DOCUMENT_TYPES.includes(value as SnapshotDocumentType)
}

function normalizeDateInput(value: string | undefined): string {
  if (!value) return ''
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function normalizeSnapshotOrder(value: string | undefined): SnapshotDrilldownOrder {
  return value === 'oldest' ? 'oldest' : 'newest'
}

function normalizeSnapshotPage(value: string | undefined): number {
  if (!value) return 1
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return parsed
}

function buildSnapshotFilterHref(
  current: DocumentsPageState,
  overrides: Partial<SnapshotQueryState>
): string {
  return buildDocumentsPageHref(current, {
    snapshot: overrides,
  })
}

function buildSnapshotExportHref(current: SnapshotQueryState): string {
  const params = new URLSearchParams()
  if (current.doc !== 'any') params.set('doc', current.doc)
  if (current.from) params.set('from', current.from)
  if (current.to) params.set('to', current.to)
  if (current.order !== 'newest') params.set('order', current.order)
  if (current.q) params.set('q', current.q)
  const queryString = params.toString()
  return queryString
    ? `/api/documents/snapshots/export?${queryString}`
    : '/api/documents/snapshots/export'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatEventDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Date TBD'
  return format(parsed, 'EEE, MMM d, yyyy')
}

function formatSnapshotHint(snapshotCount: number, latestSnapshotAt: string | null): string {
  if (snapshotCount === 0 || !latestSnapshotAt) return 'No recent archived PDFs'
  const parsed = new Date(latestSnapshotAt)
  if (Number.isNaN(parsed.getTime())) {
    return `${snapshotCount} recent archive${snapshotCount === 1 ? '' : 's'}`
  }
  return `${snapshotCount} recent archive${snapshotCount === 1 ? '' : 's'} - latest ${format(
    parsed,
    'MMM d, yyyy h:mm a'
  )}`
}

function normalizeStatusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

function formatTokenLabel(value: string): string {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function isSupportedVaultDocumentType(value: string): value is VaultDocumentType {
  return SUPPORTED_CHEF_DOCUMENT_TYPES.includes(value as VaultDocumentType)
}

export default async function DocumentsIndexPage({
  searchParams,
}: {
  searchParams?: {
    phase?: string
    q?: string
    s_doc?: string
    s_from?: string
    s_to?: string
    s_order?: string
    s_q?: string
    s_page?: string
    v_q?: string
    v_type?: string
  }
}) {
  const rawDocFilter = (searchParams?.s_doc ?? 'any').trim().toLowerCase()
  const snapshotDocFilter: SnapshotDocFilter =
    rawDocFilter === 'any' ? 'any' : isSnapshotDocumentType(rawDocFilter) ? rawDocFilter : 'any'
  let snapshotFromDate = normalizeDateInput(searchParams?.s_from)
  let snapshotToDate = normalizeDateInput(searchParams?.s_to)
  const snapshotOrder = normalizeSnapshotOrder(searchParams?.s_order)
  const snapshotSearch = (searchParams?.s_q ?? '').trim()
  const snapshotPage = normalizeSnapshotPage(searchParams?.s_page)
  const snapshotStart = snapshotFromDate
    ? new Date(`${snapshotFromDate}T00:00:00.000`).getTime()
    : null
  const snapshotEnd = snapshotToDate ? new Date(`${snapshotToDate}T23:59:59.999`).getTime() : null
  if (snapshotStart !== null && snapshotEnd !== null && snapshotStart > snapshotEnd) {
    ;[snapshotFromDate, snapshotToDate] = [snapshotToDate, snapshotFromDate]
  }

  const rawQuery = (searchParams?.q ?? '').trim()
  const query = rawQuery.toLowerCase()
  const requestedPhase = searchParams?.phase ?? 'all'
  const phaseFilter: EventWorkspacePhaseKey | 'all' =
    requestedPhase === 'all' || !requestedPhase
      ? 'all'
      : isEventWorkspacePhaseKey(requestedPhase)
        ? requestedPhase
        : 'all'
  const rawVaultQuery = (searchParams?.v_q ?? '').trim()
  const requestedVaultType = (searchParams?.v_type ?? 'all').trim().toLowerCase()
  const vaultDocumentType: VaultDocumentType | 'all' =
    requestedVaultType === 'all'
      ? 'all'
      : isSupportedVaultDocumentType(requestedVaultType)
        ? requestedVaultType
        : 'all'

  const [events, recentSnapshots, archetype, archiveDrilldown, vaultOverview] = await Promise.all([
    ((await getEvents().catch(() => [])) || []) as EventListItem[],
    getRecentDocumentSnapshots(400),
    getChefArchetype(),
    getTenantDocumentSnapshotDrilldown({
      docType: snapshotDocFilter === 'any' ? null : snapshotDocFilter,
      fromDate: snapshotFromDate,
      toDate: snapshotToDate,
      order: snapshotOrder,
      query: snapshotSearch,
      page: snapshotPage,
      pageSize: 30,
    }),
    getBusinessDocumentVaultOverview({
      limit: 10,
      query: rawVaultQuery || undefined,
      documentType: vaultDocumentType !== 'all' ? vaultDocumentType : null,
    }),
  ])
  const pack = getArchetypeDocumentPack(archetype)

  const snapshotQueryState: SnapshotQueryState = {
    doc: snapshotDocFilter,
    from: snapshotFromDate,
    to: snapshotToDate,
    order: snapshotOrder,
    q: snapshotSearch,
    page: archiveDrilldown.page,
  }
  const vaultQueryState: VaultQueryState = {
    q: rawVaultQuery,
    type: vaultDocumentType,
  }
  const documentsPageState: DocumentsPageState = {
    phaseFilter,
    phaseQuery: rawQuery,
    snapshot: snapshotQueryState,
    vault: vaultQueryState,
  }
  const preservedVaultParams = [
    phaseFilter !== 'all' ? { name: 'phase', value: phaseFilter } : null,
    rawQuery ? { name: 'q', value: rawQuery } : null,
    snapshotDocFilter !== 'any' ? { name: 's_doc', value: snapshotDocFilter } : null,
    snapshotFromDate ? { name: 's_from', value: snapshotFromDate } : null,
    snapshotToDate ? { name: 's_to', value: snapshotToDate } : null,
    snapshotOrder !== 'newest' ? { name: 's_order', value: snapshotOrder } : null,
    snapshotSearch ? { name: 's_q', value: snapshotSearch } : null,
    archiveDrilldown.page > 1 ? { name: 's_page', value: String(archiveDrilldown.page) } : null,
  ].filter((value): value is { name: string; value: string } => Boolean(value))
  const vaultCountByType = new Map(
    vaultOverview.typeCounts.map((entry) => [entry.documentType, entry.count])
  )
  const vaultFilterLinks = [
    {
      label: `All (${vaultOverview.totalUploaded})`,
      href: buildDocumentsPageHref(documentsPageState, {
        vault: { type: 'all' },
      }),
      active: vaultQueryState.type === 'all',
    },
    ...SUPPORTED_CHEF_DOCUMENT_TYPES.filter(
      (type) => (vaultCountByType.get(type) ?? 0) > 0 || vaultQueryState.type === type
    ).map((type) => ({
      label: `${formatTokenLabel(type)} (${vaultCountByType.get(type) ?? 0})`,
      href: buildDocumentsPageHref(documentsPageState, {
        vault: { type },
      }),
      active: vaultQueryState.type === type,
    })),
  ]
  const vaultResetHref = buildDocumentsPageHref(documentsPageState, {
    vault: { q: '', type: 'all' },
  })

  const templateBySlug = new Map<DocumentTemplateSlug, DocumentTemplateEntry>(
    DOCUMENT_TEMPLATE_CATALOG.map((template) => [template.slug, template])
  )

  const snapshotSummaryByEvent = new Map<
    string,
    { snapshotCount: number; latestSnapshotAt: string | null }
  >()
  for (const snapshot of recentSnapshots) {
    const existing = snapshotSummaryByEvent.get(snapshot.eventId)
    if (!existing) {
      snapshotSummaryByEvent.set(snapshot.eventId, {
        snapshotCount: 1,
        latestSnapshotAt: snapshot.generatedAt,
      })
      continue
    }
    existing.snapshotCount += 1
  }

  const workspaceRows: EventWorkspaceRow[] = events
    .map((event) => {
      const snapshotInfo = snapshotSummaryByEvent.get(event.id)
      const status = event.status ?? 'draft'
      return {
        id: event.id,
        occasion: event.occasion || 'Untitled Event',
        eventDate: event.event_date,
        status,
        phase: getEventWorkspacePhase(status),
        clientName: event.client?.full_name || 'No client linked',
        snapshotCount: snapshotInfo?.snapshotCount ?? 0,
        latestSnapshotAt: snapshotInfo?.latestSnapshotAt ?? null,
      }
    })
    .filter((event) => {
      if (phaseFilter !== 'all' && event.phase !== phaseFilter) return false
      if (!query) return true
      const searchable = `${event.occasion} ${event.clientName} ${event.status}`.toLowerCase()
      return searchable.includes(query)
    })

  const rowsByPhase = new Map<EventWorkspacePhaseKey, EventWorkspaceRow[]>()
  for (const phase of EVENT_WORKSPACE_PHASES) {
    rowsByPhase.set(phase.id, [])
  }
  for (const row of workspaceRows) {
    rowsByPhase.get(row.phase)?.push(row)
  }

  for (const phase of EVENT_WORKSPACE_PHASES) {
    const rows = rowsByPhase.get(phase.id) ?? []
    rows.sort((a, b) => {
      const aTime = new Date(a.eventDate).getTime()
      const bTime = new Date(b.eventDate).getTime()
      if (phase.id === 'closeout' || phase.id === 'cancelled') return bTime - aTime
      return aTime - bTime
    })
  }

  const visiblePhaseSections =
    phaseFilter === 'all'
      ? EVENT_WORKSPACE_PHASES
      : EVENT_WORKSPACE_PHASES.filter((phase) => phase.id === phaseFilter)

  const packTypesParam = encodeURIComponent(pack.recommendedOperationalDocs.join(','))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Grab Anything Documents</h1>
        <p className="text-stone-400 mt-1">
          Open any dinner and generate every required sheet, or download blank templates.
        </p>
      </div>

      <BusinessDocumentVault
        overview={vaultOverview}
        preservedParams={preservedVaultParams}
        filterLinks={vaultFilterLinks}
        resetHref={vaultResetHref}
      />

      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">{pack.title}</h2>
            <p className="text-sm text-stone-400 mb-3">{pack.subtitle}</p>
            <div className="flex flex-wrap gap-2">
              {pack.recommendedOperationalDocs.map((type) => (
                <span
                  key={type}
                  className="text-xs rounded border border-stone-700 px-2 py-1 text-stone-300"
                >
                  {SNAPSHOT_DOCUMENT_LABELS[type]}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-stone-500 max-w-md">
            Every event row below supports one-click `Open Hub`, `Print Pack`, and `Print All`.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Event-First Document Workspace</h2>
            <p className="text-sm text-stone-400 mt-1">
              Find events by lifecycle phase, then open or print docs immediately.
            </p>
          </div>
          <form method="get" className="flex items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={rawQuery}
              placeholder="Search event, client, or status..."
              className="h-10 rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 placeholder:text-stone-500 w-64 max-w-[60vw]"
            />
            {snapshotDocFilter !== 'any' && <input type="hidden" name="s_doc" value={snapshotDocFilter} />}
            {snapshotFromDate && <input type="hidden" name="s_from" value={snapshotFromDate} />}
            {snapshotToDate && <input type="hidden" name="s_to" value={snapshotToDate} />}
            {snapshotOrder !== 'newest' && <input type="hidden" name="s_order" value={snapshotOrder} />}
            {snapshotSearch && <input type="hidden" name="s_q" value={snapshotSearch} />}
            {archiveDrilldown.page > 1 && (
              <input type="hidden" name="s_page" value={archiveDrilldown.page} />
            )}
            {vaultQueryState.type !== 'all' && (
              <input type="hidden" name="v_type" value={vaultQueryState.type} />
            )}
            {vaultQueryState.q && <input type="hidden" name="v_q" value={vaultQueryState.q} />}
            {phaseFilter !== 'all' && <input type="hidden" name="phase" value={phaseFilter} />}
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            {(rawQuery || phaseFilter !== 'all') && (
              <Link
                href={buildDocumentsPageHref(documentsPageState, {
                  phaseFilter: 'all',
                  phaseQuery: '',
                })}
              >
                <Button variant="ghost" size="sm">
                  Reset
                </Button>
              </Link>
            )}
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={buildDocumentsPageHref(documentsPageState, {
              phaseFilter: 'all',
            })}
          >
            <Button variant={phaseFilter === 'all' ? 'primary' : 'secondary'} size="sm">
              All ({workspaceRows.length})
            </Button>
          </Link>
          {EVENT_WORKSPACE_PHASES.map((phase) => {
            const count = rowsByPhase.get(phase.id)?.length ?? 0
            return (
              <Link
                key={phase.id}
                href={buildDocumentsPageHref(documentsPageState, {
                  phaseFilter: phase.id,
                })}
              >
                <Button variant={phaseFilter === phase.id ? 'primary' : 'secondary'} size="sm">
                  {phase.label} ({count})
                </Button>
              </Link>
            )
          })}
        </div>
      </Card>

      {visiblePhaseSections.map((phase) => {
        const rows = rowsByPhase.get(phase.id) ?? []
        return (
          <Card key={phase.id} className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{phase.label}</h3>
                <p className="text-xs text-stone-500 mt-1">{phase.description}</p>
              </div>
              <p className="text-xs text-stone-500">
                {rows.length} event{rows.length === 1 ? '' : 's'}
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-stone-500 mt-4">
                No events in this phase for the current filter.
              </p>
            ) : (
              <div className="space-y-3 mt-4">
                {rows.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 border-b border-stone-800 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-stone-100">{event.occasion}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-stone-400">
                          {formatEventDate(event.eventDate)}
                        </span>
                        <span className="text-xs text-stone-500">{event.clientName}</span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full ${getEventStatusBadgeClass(event.status)}`}
                        >
                          {normalizeStatusLabel(event.status)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        {formatSnapshotHint(event.snapshotCount, event.latestSnapshotAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/events/${event.id}/documents`}>
                        <Button variant="secondary" size="sm">
                          Open Hub
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        href={`/api/documents/${event.id}?type=pack&types=${packTypesParam}&archive=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Print Pack
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        href={`/api/documents/${event.id}?type=all&archive=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Print All
                      </Button>
                      <Link href={`/events/${event.id}/financial`}>
                        <Button variant="ghost" size="sm">
                          Financial
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Blank Template Library</h2>
        <p className="text-sm text-stone-400 mb-4">
          Use blank templates to build any packet manually from scratch.
        </p>
        <div className="space-y-5">
          {TEMPLATE_GROUPS.map((group) => {
            const templates = group.slugs
              .map((slug) => templateBySlug.get(slug))
              .filter((template): template is DocumentTemplateEntry => Boolean(template))
            return (
              <div key={group.id}>
                <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">{group.label}</p>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.slug}
                      className="flex items-center justify-between gap-3 border-b border-stone-800 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-stone-100">{template.label}</p>
                        <p className="text-xs text-stone-500">{template.description}</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        href={`/api/documents/templates/${template.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download Blank
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Archive Finder</h2>
        <p className="text-sm text-stone-400 mb-4">
          Find any archived PDF across all events by type, date range, and search terms.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {SNAPSHOT_TYPE_FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={buildSnapshotFilterHref(documentsPageState, {
                doc: filter.value,
                page: 1,
              })}
            >
              <Button
                variant={snapshotDocFilter === filter.value ? 'primary' : 'secondary'}
                size="sm"
              >
                {filter.label}
              </Button>
            </Link>
          ))}
        </div>

        <form
          method="get"
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 border border-stone-800 rounded p-3"
        >
          {phaseFilter !== 'all' && <input type="hidden" name="phase" value={phaseFilter} />}
          {rawQuery && <input type="hidden" name="q" value={rawQuery} />}
          {vaultQueryState.type !== 'all' && <input type="hidden" name="v_type" value={vaultQueryState.type} />}
          {vaultQueryState.q && <input type="hidden" name="v_q" value={vaultQueryState.q} />}
          {snapshotDocFilter !== 'any' && (
            <input type="hidden" name="s_doc" value={snapshotDocFilter} />
          )}
          {snapshotOrder !== 'newest' && (
            <input type="hidden" name="s_order" value={snapshotOrder} />
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <p className="text-[11px] text-stone-500 mb-1">Search</p>
              <input
                type="text"
                name="s_q"
                defaultValue={snapshotSearch}
                placeholder="Filename, event, client..."
                className="h-9 rounded border border-stone-700 bg-stone-900 px-3 text-xs text-stone-200 placeholder:text-stone-500 w-60 max-w-[65vw]"
              />
            </div>
            <div>
              <p className="text-[11px] text-stone-500 mb-1">From</p>
              <input
                type="date"
                name="s_from"
                defaultValue={snapshotFromDate}
                className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
              />
            </div>
            <div>
              <p className="text-[11px] text-stone-500 mb-1">To</p>
              <input
                type="date"
                name="s_to"
                defaultValue={snapshotToDate}
                className="h-9 rounded border border-stone-700 bg-stone-900 px-2 text-xs text-stone-200"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
            {(snapshotSearch || snapshotFromDate || snapshotToDate) && (
              <Link
                href={buildSnapshotFilterHref(documentsPageState, {
                  q: '',
                  from: '',
                  to: '',
                  page: 1,
                })}
              >
                <Button variant="ghost" size="sm">
                  Clear
                </Button>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-stone-500">Order</p>
            <Link
              href={buildSnapshotFilterHref(documentsPageState, {
                order: 'newest',
                page: 1,
              })}
            >
              <Button variant={snapshotOrder === 'newest' ? 'primary' : 'secondary'} size="sm">
                Newest
              </Button>
            </Link>
            <Link
              href={buildSnapshotFilterHref(documentsPageState, {
                order: 'oldest',
                page: 1,
              })}
            >
              <Button variant={snapshotOrder === 'oldest' ? 'primary' : 'secondary'} size="sm">
                Oldest
              </Button>
            </Link>
            <Button variant="ghost" size="sm" href={buildSnapshotExportHref(snapshotQueryState)}>
              Export CSV
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {archiveDrilldown.typeStats
            .filter((entry) => entry.count > 0)
            .map((entry) => (
              <span
                key={entry.documentType}
                className="text-xs rounded border border-stone-700 px-2 py-1 text-stone-400"
              >
                {SNAPSHOT_DOCUMENT_LABELS[entry.documentType]}: {entry.count}
              </span>
            ))}
        </div>

        <p className="text-xs text-stone-500 mt-4">
          Showing {archiveDrilldown.items.length} snapshot
          {archiveDrilldown.items.length === 1 ? '' : 's'} on this page from{' '}
          {archiveDrilldown.total} match
          {archiveDrilldown.total === 1 ? '' : 'es'}.
        </p>

        {archiveDrilldown.items.length === 0 ? (
          <p className="text-sm text-stone-500 mt-3">
            No archived documents match this filter. Use any event hub to archive new versions.
          </p>
        ) : (
          <div className="space-y-2 mt-3">
            {archiveDrilldown.items.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-800 pb-2 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {SNAPSHOT_DOCUMENT_LABELS[snapshot.documentType]} - v{snapshot.versionNumber}
                  </p>
                  <p className="text-xs text-stone-500">
                    {snapshot.eventOccasion || 'Untitled Event'}
                    {snapshot.clientName ? ` - ${snapshot.clientName}` : ''}
                    {snapshot.eventDate
                      ? ` - ${format(new Date(snapshot.eventDate), 'EEE, MMM d, yyyy')}`
                      : ''}{' '}
                    ({formatBytes(snapshot.sizeBytes)})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    href={`/api/documents/snapshots/${snapshot.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </Button>
                  <Link href={`/events/${snapshot.eventId}/documents`}>
                    <Button variant="secondary" size="sm">
                      Event Hub
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {archiveDrilldown.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-stone-800 flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Page {archiveDrilldown.page} of {archiveDrilldown.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildSnapshotFilterHref(documentsPageState, {
                  page: Math.max(1, archiveDrilldown.page - 1),
                })}
              >
                <Button variant="secondary" size="sm" disabled={!archiveDrilldown.hasPreviousPage}>
                  Previous
                </Button>
              </Link>
              <Link
                href={buildSnapshotFilterHref(documentsPageState, {
                  page: Math.min(archiveDrilldown.totalPages, archiveDrilldown.page + 1),
                })}
              >
                <Button variant="secondary" size="sm" disabled={!archiveDrilldown.hasNextPage}>
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
