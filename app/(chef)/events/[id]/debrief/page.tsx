// Post-Event Debrief Page
// Guided fill-in-the-blanks flow after a dinner is completed.
// Only available for events with status === 'completed'.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventDebriefBlanks } from '@/lib/events/debrief-actions'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { EventDebriefClient } from '@/components/events/event-debrief-client'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default async function EventDebriefPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [blanks, existingPhotos] = await Promise.all([
    getEventDebriefBlanks(params.id),
    getEventPhotosForChef(params.id),
  ])

  if (!blanks) notFound()

  const eventTitle = blanks.event.occasion || 'Event'
  const eventDateFormatted = format(new Date(blanks.event.eventDate), 'MMMM d, yyyy')

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/events/${params.id}`}>
              <Button variant="ghost" size="sm">
                &larr; Back to Event
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Post-Dinner Debrief</h1>
          <p className="text-stone-500 mt-1">
            {eventTitle} &middot; {eventDateFormatted}
            {blanks.client && <> &middot; {blanks.client.name}</>}
          </p>
        </div>

        {blanks.event.debriefCompletedAt && (
          <div className="flex-shrink-0 flex items-center gap-1.5 text-sm text-green-200 bg-green-950 border border-green-200 rounded-full px-3 py-1">
            <span>&#10003;</span>
            <span>Complete</span>
          </div>
        )}
      </div>

      {/* Intro blurb — shown only before debrief is complete */}
      {!blanks.event.debriefCompletedAt && (
        <div className="text-sm text-stone-400 bg-stone-800 border border-stone-700 rounded-lg px-4 py-3">
          You just finished a dinner. Capture what you learned while it&#39;s fresh &#8212; client
          details, recipe notes, dish photos. Skip anything that doesn&#39;t apply.
        </div>
      )}

      {/* Main debrief form — client component handles all interactivity */}
      <EventDebriefClient eventId={params.id} blanks={blanks} initialPhotos={existingPhotos} />
    </div>
  )
}
