import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getBusinessDocInfo, getDocumentReadiness } from '@/lib/documents/actions'
import { DocumentSection } from '@/components/documents/document-section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default async function EventDocumentsPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [event, readiness, businessDocs] = await Promise.all([
    getEventById(params.id),
    getDocumentReadiness(params.id),
    getBusinessDocInfo(params.id).catch(() => null),
  ])

  if (!event) notFound()

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
          <a href={`/api/documents/${event.id}?type=all`} target="_blank" rel="noopener noreferrer">
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
    </div>
  )
}
