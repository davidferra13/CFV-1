import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { EventClosureActions } from '@/components/events/event-closure-actions'
import { InteractiveDocClient } from '@/components/events/interactive-doc-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { fetchResetChecklistData } from '@/lib/documents/generate-reset-checklist'
import { resetChecklistToSpec } from '@/lib/documents/interactive-specs'
import { getEventById } from '@/lib/events/actions'

export default async function ResetPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [event, data] = await Promise.all([
    getEventById(params.id),
    fetchResetChecklistData(params.id),
  ])

  if (!event || !data) {
    notFound()
  }

  const spec = resetChecklistToSpec(data)
  const canCompleteReset = event.status === 'completed'
  const pdfUrl = `/api/documents/${params.id}?type=reset`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/events/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-300 mb-1 block"
          >
            ← Back to event
          </Link>
          <h1 className="text-2xl font-bold text-stone-100">{spec.title}</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Work the operational reset here, then mark it complete on the event record.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 mt-6"
        >
          Open PDF
        </Button>
      </div>

      {spec.headerPills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {spec.headerPills.map((pill) => (
            <div key={pill.label} className="bg-stone-800 rounded-lg px-3 py-1.5">
              <p className="text-xs text-stone-500">{pill.label}</p>
              <p className="text-sm font-medium text-stone-100">{pill.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <Card className="p-4 bg-stone-900 border-stone-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-100">Reset Completion</h2>
            <p className="text-sm text-stone-400 mt-1">
              {event.reset_complete
                ? 'Reset is already marked complete for this event.'
                : canCompleteReset
                  ? 'Finish the checklist, then mark reset complete here.'
                  : 'Reset completion unlocks once the event itself is marked completed.'}
            </p>
          </div>

          {event.reset_complete ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-emerald-600">
              Reset Complete
            </span>
          ) : canCompleteReset ? (
            <EventClosureActions
              eventId={params.id}
              resetComplete={Boolean(event.reset_complete)}
              followUpSent
            />
          ) : null}
        </div>
      </Card>

      <InteractiveDocClient eventId={params.id} docType="reset" spec={spec} />
    </div>
  )
}
