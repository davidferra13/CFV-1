'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  OPERATOR_EVALUATION_STATUSES,
  OPERATOR_EVALUATION_STATUS_META,
  type OperatorEvaluationStatus,
} from '@/lib/contact/operator-evaluation'
import {
  updateOperatorEvaluationStatus,
  type OperatorEvaluationSubmission,
} from '@/lib/contact/claim'

type FilterValue = 'all' | OperatorEvaluationStatus

export function OperatorEvaluationInbox({
  submissions,
}: {
  submissions: OperatorEvaluationSubmission[]
}) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all')

  const counts = useMemo(() => {
    return OPERATOR_EVALUATION_STATUSES.reduce(
      (result, status) => {
        result[status] = submissions.filter((submission) => submission.status === status).length
        return result
      },
      {} as Record<OperatorEvaluationStatus, number>
    )
  }, [submissions])

  const filteredSubmissions =
    activeFilter === 'all'
      ? submissions
      : submissions.filter((submission) => submission.status === activeFilter)

  if (submissions.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-lg font-semibold text-stone-100">No operator walkthrough requests</p>
        <p className="mt-2 text-sm text-stone-400">
          Founder review items from `/for-operators/walkthrough` will appear here.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={activeFilter === 'all'}
          count={submissions.length}
          label="All"
          onClick={() => setActiveFilter('all')}
        />
        {OPERATOR_EVALUATION_STATUSES.map((status) => (
          <FilterChip
            key={status}
            active={activeFilter === status}
            count={counts[status]}
            label={OPERATOR_EVALUATION_STATUS_META[status].label}
            onClick={() => setActiveFilter(status)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {filteredSubmissions.map((submission) => (
          <OperatorEvaluationCard key={submission.id} submission={submission} />
        ))}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean
  count: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-brand-500 bg-brand-950/60 text-brand-200'
          : 'border-stone-700 bg-stone-900/60 text-stone-300 hover:border-stone-600 hover:bg-stone-800/70'
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          active ? 'bg-brand-900/80 text-brand-100' : 'bg-stone-800 text-stone-400'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function OperatorEvaluationCard({ submission }: { submission: OperatorEvaluationSubmission }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submittedAt = new Date(submission.submittedAt)
  const statusMeta = OPERATOR_EVALUATION_STATUS_META[submission.status]

  const handleStatusChange = (status: OperatorEvaluationStatus) => {
    if (status === submission.status) return

    setError(null)

    startTransition(async () => {
      try {
        await updateOperatorEvaluationStatus(submission.id, status)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusMeta.tone}>{statusMeta.label}</Badge>
              <span className="text-xs text-stone-500">
                Submitted {formatDistanceToNow(submittedAt, { addSuffix: true })} on{' '}
                {format(submittedAt, 'MMM d, yyyy h:mm a')}
              </span>
            </div>

            <h3 className="mt-3 text-xl font-semibold text-stone-100">
              {submission.businessName || submission.name}
            </h3>
            <p className="mt-1 text-sm text-stone-400">
              {submission.name} -{' '}
              <a
                href={`mailto:${submission.email}`}
                className="text-brand-400 transition-colors hover:text-brand-300"
              >
                {submission.email}
              </a>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-[420px] lg:justify-end">
            {OPERATOR_EVALUATION_STATUSES.map((status) => {
              const meta = OPERATOR_EVALUATION_STATUS_META[status]
              const isCurrent = status === submission.status

              return (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={isCurrent ? 'primary' : 'ghost'}
                  onClick={() => handleStatusChange(status)}
                  disabled={isPending}
                  className={isCurrent ? 'bg-brand-600 hover:bg-brand-700' : ''}
                >
                  {meta.label}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FactBlock label="Business name" value={submission.businessName} />
          <FactBlock label="Operator type / service model" value={submission.operatorType} />
          <FactBlock label="Source page" value={submission.sourcePage} />
          <FactBlock label="Source CTA" value={submission.sourceCta} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <LongField label="Current workflow or tool stack" value={submission.workflowStack} />
          <LongField label="What they want help with" value={submission.helpRequest} />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </Card>
  )
}

function FactBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-stone-700/70 bg-stone-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm text-stone-200">{value || 'Not captured'}</p>
    </div>
  )
}

function LongField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-stone-700/70 bg-stone-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-300">
        {value || 'Not captured'}
      </p>
    </div>
  )
}
