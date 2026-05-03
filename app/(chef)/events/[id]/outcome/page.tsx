import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventOutcomeCapture } from '@/lib/events/post-event-learning-actions'
import { PostEventLearningForm } from '@/components/events/post-event-learning-form'
import { Button } from '@/components/ui/button'

export default async function EventOutcomePage({ params }: { params: { id: string } }) {
  await requireChef()

  const capture = await getEventOutcomeCapture(params.id)
  if (!capture) notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href={`/events/${params.id}`}>
            <Button variant="ghost" size="sm">
              Back to Event
            </Button>
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-stone-100">Post-Event Outcome</h1>
          <p className="mt-2 text-stone-400">
            {capture.event.occasion || 'Event'}
            {capture.event.eventDate
              ? ` · ${format(new Date(capture.event.eventDate), 'MMMM d, yyyy')}`
              : ''}
            {capture.event.guestCount ? ` · ${capture.event.guestCount} guests` : ''}
          </p>
        </div>
      </div>

      {capture.insights.length > 0 && (
        <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Chef Intelligence</p>
          <div className="mt-3 space-y-2">
            {capture.insights.map((insight) => (
              <div
                key={insight}
                className="rounded-lg border border-stone-700/60 bg-stone-900/70 px-3 py-2 text-sm text-stone-300"
              >
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      <PostEventLearningForm capture={capture} />
    </div>
  )
}
