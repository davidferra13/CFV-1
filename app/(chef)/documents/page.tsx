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
  SNAPSHOT_DOCUMENT_LABELS,
} from '@/lib/documents/snapshot-actions'
import { getArchetypeDocumentPack } from '@/lib/documents/archetype-packs'
import {
  EVENT_WORKSPACE_PHASES,
  getEventStatusBadgeClass,
  getEventWorkspacePhase,
  isEventWorkspacePhaseKey,
  type EventWorkspacePhaseKey,
} from '@/lib/documents/event-workspace'
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

function buildDocumentsFilterHref(phase: EventWorkspacePhaseKey | 'all', query: string): string {
  const params = new URLSearchParams()
  if (phase !== 'all') params.set('phase', phase)
  if (query) params.set('q', query)
  const queryString = params.toString()
  return queryString ? `/documents?${queryString}` : '/documents'
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

export default async function DocumentsIndexPage({
  searchParams,
}: {
  searchParams?: { phase?: string; q?: string }
}) {
  const [events, recentSnapshots, archetype] = await Promise.all([
    ((await getEvents().catch(() => [])) || []) as EventListItem[],
    getRecentDocumentSnapshots(400),
    getChefArchetype(),
  ])
  const pack = getArchetypeDocumentPack(archetype)
  const rawQuery = (searchParams?.q ?? '').trim()
  const query = rawQuery.toLowerCase()
  const requestedPhase = searchParams?.phase ?? 'all'
  const phaseFilter: EventWorkspacePhaseKey | 'all' =
    requestedPhase === 'all' || !requestedPhase
      ? 'all'
      : isEventWorkspacePhaseKey(requestedPhase)
        ? requestedPhase
        : 'all'

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
            {phaseFilter !== 'all' && <input type="hidden" name="phase" value={phaseFilter} />}
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            {(rawQuery || phaseFilter !== 'all') && (
              <Link href="/documents">
                <Button variant="ghost" size="sm">
                  Reset
                </Button>
              </Link>
            )}
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={buildDocumentsFilterHref('all', rawQuery)}>
            <Button variant={phaseFilter === 'all' ? 'primary' : 'secondary'} size="sm">
              All ({workspaceRows.length})
            </Button>
          </Link>
          {EVENT_WORKSPACE_PHASES.map((phase) => {
            const count = rowsByPhase.get(phase.id)?.length ?? 0
            return (
              <Link key={phase.id} href={buildDocumentsFilterHref(phase.id, rawQuery)}>
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
                      <a
                        href={`/api/documents/${event.id}?type=pack&types=${packTypesParam}&archive=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="secondary" size="sm">
                          Print Pack
                        </Button>
                      </a>
                      <a
                        href={`/api/documents/${event.id}?type=all&archive=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          Print All
                        </Button>
                      </a>
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
                      <a
                        href={`/api/documents/templates/${template.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="secondary" size="sm">
                          Download Blank
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Recent Archived Documents</h2>
        {recentSnapshots.length === 0 ? (
          <p className="text-sm text-stone-500">
            No archived documents yet. Open any event hub and use `Archive` or `Print All`.
          </p>
        ) : (
          <div className="space-y-2">
            {recentSnapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-800 pb-2 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {SNAPSHOT_DOCUMENT_LABELS[snapshot.documentType]} - v{snapshot.versionNumber}
                  </p>
                  <p className="text-xs text-stone-500">
                    {(snapshot.eventOccasion || 'Untitled Event') +
                      (snapshot.clientName ? ` - ${snapshot.clientName}` : '')}
                    {snapshot.eventDate
                      ? ` - ${format(new Date(snapshot.eventDate), 'EEE, MMM d, yyyy')}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/documents/snapshots/${snapshot.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </a>
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
      </Card>
    </div>
  )
}
