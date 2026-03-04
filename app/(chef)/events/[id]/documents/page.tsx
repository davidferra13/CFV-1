import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getBusinessDocInfo, getDocumentReadiness } from '@/lib/documents/actions'
import {
  getEventDocumentSnapshots,
  SNAPSHOT_DOCUMENT_LABELS,
  type SnapshotDocumentType,
} from '@/lib/documents/snapshot-actions'
import { DocumentSection } from '@/components/documents/document-section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default async function EventDocumentsPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [event, readiness, businessDocs, snapshots] = await Promise.all([
    getEventById(params.id),
    getDocumentReadiness(params.id),
    getBusinessDocInfo(params.id).catch(() => null),
    getEventDocumentSnapshots(params.id, 120),
  ])

  if (!event) notFound()

  const latestByType = new Map<SnapshotDocumentType, (typeof snapshots)[number]>()
  for (const snapshot of snapshots) {
    if (!latestByType.has(snapshot.documentType)) {
      latestByType.set(snapshot.documentType, snapshot)
    }
  }

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

      <DocumentSection eventId={event.id} readiness={readiness} businessDocs={businessDocs} />

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Current Archived Versions</h2>
        <p className="text-stone-500 text-sm mb-4">
          Latest archived PDF per document type for this event.
        </p>
        {latestByType.size === 0 ? (
          <p className="text-sm text-stone-500">
            No archived snapshots yet. Use any `Archive` button or `Print All (8 Sheets)` to save
            versioned PDFs.
          </p>
        ) : (
          <div className="space-y-3">
            {Array.from(latestByType.values()).map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-800 pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-stone-100">
                    {SNAPSHOT_DOCUMENT_LABELS[snapshot.documentType]}
                  </p>
                  <p className="text-xs text-stone-500">
                    v{snapshot.versionNumber} -{' '}
                    {format(new Date(snapshot.generatedAt), 'MMM d, yyyy h:mm a')} -{' '}
                    {formatBytes(snapshot.sizeBytes)}
                  </p>
                </div>
                <a
                  href={`/api/documents/snapshots/${snapshot.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="sm">
                    Open Archived PDF
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Snapshot History</h2>
        <p className="text-stone-500 text-sm mb-4">
          Full archive log for this event. Every archive creates a versioned PDF.
        </p>
        {snapshots.length === 0 ? (
          <p className="text-sm text-stone-500">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snapshot) => (
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
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
