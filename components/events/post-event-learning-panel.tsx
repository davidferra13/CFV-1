import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getEventOutcomeSummary } from '@/lib/post-event/learning-actions'

type Props = {
  eventId: string
  eventStatus: string
}

function statusLabel(captureStatus: string): string {
  if (captureStatus === 'learning_complete') return 'Learning complete'
  if (captureStatus === 'captured') return 'Chef capture saved'
  return 'Capture pending'
}

export async function PostEventLearningPanel({ eventId, eventStatus }: Props) {
  if (eventStatus !== 'completed') return null

  const summary = await getEventOutcomeSummary(eventId)
  if (!summary) return null

  const statusTone =
    summary.captureStatus === 'learning_complete'
      ? 'text-emerald-300 border-emerald-800 bg-emerald-950/40'
      : summary.captureStatus === 'captured'
        ? 'text-brand-200 border-brand-800 bg-brand-950/40'
        : 'text-amber-200 border-amber-800 bg-amber-950/40'

  return (
    <Card className="p-6 border-stone-700/70 bg-stone-950/70">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusTone}`}>
            {statusLabel(summary.captureStatus)}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-stone-100">Post-Event Learning</h2>
          <p className="mt-1 text-sm text-stone-400">
            Structured reality capture, dish memory, and decision-grade insights for future menus.
          </p>
        </div>
        <Link href={`/events/${eventId}/outcome`}>
          <Button>{summary.captureStatus === 'pending' ? 'Capture Outcome' : 'Open Outcome'}</Button>
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-stone-700/60 bg-stone-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Success</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">
            {summary.successScore !== null ? summary.successScore : 'Pending'}
          </p>
        </div>
        <div className="rounded-xl border border-stone-700/60 bg-stone-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Responses</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">{summary.guestResponseCount}</p>
        </div>
        <div className="rounded-xl border border-stone-700/60 bg-stone-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Menu Drift</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">
            {summary.addedDishCount + summary.removedDishCount + summary.substitutedDishCount}
          </p>
        </div>
        <div className="rounded-xl border border-stone-700/60 bg-stone-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Issues</p>
          <p className="mt-2 text-2xl font-semibold text-stone-100">{summary.issueCount}</p>
        </div>
      </div>

      {summary.insights.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Computed Insights</p>
          {summary.insights.map((insight) => (
            <div
              key={insight}
              className="rounded-lg border border-stone-700/60 bg-stone-900/70 px-3 py-2 text-sm text-stone-300"
            >
              {insight}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
