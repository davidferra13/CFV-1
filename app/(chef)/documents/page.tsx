import Link from 'next/link'
import { format } from 'date-fns'
import { getEvents } from '@/lib/events/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { DOCUMENT_TEMPLATE_CATALOG } from '@/lib/documents/template-catalog'
import {
  getRecentDocumentSnapshots,
  SNAPSHOT_DOCUMENT_LABELS,
} from '@/lib/documents/snapshot-actions'
import { getArchetypeDocumentPack } from '@/lib/documents/archetype-packs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default async function DocumentsIndexPage() {
  const [events, recentSnapshots, archetype] = await Promise.all([
    ((await getEvents().catch(() => [])) || []) as any[],
    getRecentDocumentSnapshots(40),
    getChefArchetype(),
  ])
  const pack = getArchetypeDocumentPack(archetype)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Grab Anything Documents</h1>
        <p className="text-stone-400 mt-1">
          Open any dinner and generate every required sheet, or download blank templates.
        </p>
      </div>

      <Card className="p-6">
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
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Blank Template Library</h2>
        <div className="space-y-3">
          {DOCUMENT_TEMPLATE_CATALOG.map((template) => (
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
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Event Document Hubs</h2>
        {events.length === 0 ? (
          <p className="text-sm text-stone-500">No events found yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-800 pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-stone-100">{event.occasion || 'Untitled Event'}</p>
                  <p className="text-xs text-stone-500">
                    {format(new Date(event.event_date), 'EEE, MMM d, yyyy')}
                    {event.client?.full_name ? ` - ${event.client.full_name}` : ''}
                    {event.status ? ` - ${event.status}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/events/${event.id}/documents`}>
                    <Button variant="secondary" size="sm">
                      Open Hub
                    </Button>
                  </Link>
                  <a
                    href={`/api/documents/${event.id}?type=all&archive=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      Print All
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
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
