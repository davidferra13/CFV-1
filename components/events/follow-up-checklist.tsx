'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  markThankYouSentFromFollowUp,
  sendSurveyFromFollowUp,
  markReviewRequestedFromFollowUp,
} from '@/lib/events/follow-up-actions'
import type { FollowUpState, FollowUpStep } from '@/lib/events/follow-up-actions'

// ---------------------------------------------------------------------------
// Status indicator for each step
// ---------------------------------------------------------------------------

function StepStatusBadge({ status }: { status: FollowUpStep['status'] }) {
  const config = {
    done: { label: 'Complete', variant: 'success' as const },
    ready: { label: 'Ready', variant: 'warning' as const },
    blocked: { label: 'Blocked', variant: 'default' as const },
    skipped: { label: 'Skipped', variant: 'default' as const },
  }
  const c = config[status]
  return <Badge variant={c.variant}>{c.label}</Badge>
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-400">
          {completed} of {total} steps complete
        </span>
        <span className="font-medium text-stone-200">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-stone-800">
        <div
          className="h-2 rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual step card
// ---------------------------------------------------------------------------

function StepCard({
  step,
  index,
  eventId,
}: {
  step: FollowUpStep
  index: number
  eventId: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isDone = step.status === 'done'
  const borderColor = isDone
    ? 'border-green-800/60'
    : step.status === 'ready'
      ? 'border-brand-700/60'
      : 'border-stone-700/60'

  function handleInlineAction() {
    startTransition(async () => {
      try {
        if (step.id === 'thank-you') {
          await markThankYouSentFromFollowUp(eventId)
        } else if (step.id === 'review') {
          const meta = step.meta ?? {}
          if (!meta.surveySent && !meta.surveyCompleted) {
            await sendSurveyFromFollowUp(eventId)
          } else if (meta.surveyCompleted && meta.reviewEligible && meta.surveyId) {
            await markReviewRequestedFromFollowUp(meta.surveyId as string, eventId)
          }
        }
        router.refresh()
      } catch (err) {
        console.error('[follow-up] Action failed:', err)
      }
    })
  }

  const hasInlineAction =
    step.actionLabel && !step.actionUrl && (step.id === 'thank-you' || step.id === 'review')

  const hasLinkAction = step.actionLabel && step.actionUrl

  return (
    <Card className={`p-5 ${borderColor} bg-stone-950/60`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Step number circle */}
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              isDone
                ? 'bg-green-900 text-green-300'
                : step.status === 'ready'
                  ? 'bg-brand-900 text-brand-300'
                  : 'bg-stone-800 text-stone-500'
            }`}
          >
            {isDone ? '\u2713' : index + 1}
          </div>

          <div>
            <h3
              className={`font-medium ${isDone ? 'text-stone-400 line-through' : 'text-stone-100'}`}
            >
              {step.label}
            </h3>
            <p className="mt-1 text-sm text-stone-400">{step.description}</p>
            {step.completedAt && (
              <p className="mt-1 text-xs text-stone-500">
                Completed{' '}
                {new Date(step.completedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        <StepStatusBadge status={step.status} />
      </div>

      {/* Action buttons */}
      {(hasInlineAction || hasLinkAction) && step.status !== 'done' && (
        <div className="mt-4 flex gap-2 pl-11">
          {hasInlineAction && (
            <Button size="sm" variant="secondary" onClick={handleInlineAction} disabled={isPending}>
              {isPending ? 'Saving...' : step.actionLabel}
            </Button>
          )}
          {hasLinkAction && (
            <Link href={step.actionUrl!}>
              <Button size="sm" variant="secondary">
                {step.actionLabel}
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* View link for completed steps with URLs */}
      {isDone && step.actionUrl && (
        <div className="mt-3 pl-11">
          <Link href={step.actionUrl}>
            <Button size="sm" variant="ghost">
              View
            </Button>
          </Link>
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Follow-Up Checklist
// ---------------------------------------------------------------------------

export function FollowUpChecklist({ state }: { state: FollowUpState }) {
  const allDone = state.completedCount === state.totalCount

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card className="p-5 border-stone-700 bg-stone-900/60">
        <ProgressBar completed={state.completedCount} total={state.totalCount} />
        {allDone && (
          <p className="mt-3 text-sm font-medium text-green-400">
            All follow-up steps complete. Great job closing the loop.
          </p>
        )}
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {state.steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} eventId={state.eventId} />
        ))}
      </div>

      {/* Debrief prompt if AAR not done but debrief is */}
      {!!state.steps[0]?.meta?.debriefDone && state.steps[0]?.status !== 'done' && (
        <Card className="p-4 border-amber-800/60 bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-200">Debrief already captured</p>
              <p className="mt-0.5 text-xs text-amber-400">
                You can still file a full event review for deeper analysis.
              </p>
            </div>
            <Link href={`/events/${state.eventId}/debrief`}>
              <Button size="sm" variant="ghost">
                View Debrief
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
