'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { LaunchReadinessCheck } from '@/lib/validation/launch-readiness'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, ExternalLink } from '@/components/ui/icons'

type LaunchReadinessReviewDecision = 'verified' | 'rejected'

type LaunchReadinessReview = {
  id: string
  checkKey: string
  decision: LaunchReadinessReviewDecision
  reviewerId?: string | null
  reviewedAt?: string | null
  note?: string | null
  evidenceUrl?: string | null
  createdAt?: string | null
}

type DraftState = {
  decision: LaunchReadinessReviewDecision
  note: string
  evidenceUrl: string
}

type StatusMessage = {
  type: 'success' | 'error'
  text: string
} | null

const DEFAULT_DRAFT: DraftState = {
  decision: 'verified',
  note: '',
  evidenceUrl: '',
}

function createDraft(): DraftState {
  return { ...DEFAULT_DRAFT }
}

function formatReviewTime(value: string | null): string {
  if (!value) return 'Time not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

async function readResponseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown }
    if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
      return payload.error
    }
  } catch {
    return 'Failed to save launch readiness review.'
  }

  return 'Failed to save launch readiness review.'
}

function ReviewHistory({ reviews }: { reviews: LaunchReadinessReview[] }) {
  if (reviews.length === 0) {
    return <p className="text-xs text-stone-500">No operator decisions recorded yet.</p>
  }

  return (
    <div className="space-y-2">
      {reviews.slice(0, 3).map((review) => (
        <div key={review.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${
                review.decision === 'verified'
                  ? 'border-emerald-900 bg-emerald-950/40 text-emerald-200'
                  : 'border-amber-900 bg-amber-950/40 text-amber-200'
              }`}
            >
              {review.decision === 'verified' ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {review.decision}
            </span>
            <span className="text-[11px] text-stone-500">
              {formatReviewTime(review.reviewedAt ?? review.createdAt ?? null)}
            </span>
          </div>
          {review.note ? (
            <p className="mt-2 text-xs leading-5 text-stone-300">{review.note}</p>
          ) : null}
          {review.evidenceUrl ? (
            <a
              href={review.evidenceUrl}
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-400"
            >
              Evidence
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function LaunchReadinessReviewConsole({
  checks,
  initialReviews,
}: {
  checks: LaunchReadinessCheck[]
  initialReviews: LaunchReadinessReview[]
}) {
  const router = useRouter()
  const [reviews, setReviews] = useState<LaunchReadinessReview[]>(initialReviews)
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()

  const reviewableChecks = useMemo(
    () => checks.filter((check) => check.status === 'operator_review'),
    [checks]
  )
  const reviewsByCheck = useMemo(() => {
    const grouped = new Map<string, LaunchReadinessReview[]>()
    for (const review of reviews) {
      const existing = grouped.get(review.checkKey) ?? []
      existing.push(review)
      grouped.set(review.checkKey, existing)
    }
    return grouped
  }, [reviews])

  function updateDraft(checkKey: string, patch: Partial<DraftState>) {
    setDrafts((current) => ({
      ...current,
      [checkKey]: {
        ...(current[checkKey] ?? createDraft()),
        ...patch,
      },
    }))
  }

  async function submitReview(check: LaunchReadinessCheck, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const draft = drafts[check.key] ?? createDraft()
    const note = draft.note.trim()
    const evidenceUrl = draft.evidenceUrl.trim()

    if (draft.decision === 'verified' && !note && !evidenceUrl) {
      setMessage({
        type: 'error',
        text: 'Verified launch readiness reviews require a note or evidence link.',
      })
      return
    }

    setSavingKey(check.key)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/launch-readiness/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkKey: check.key,
          decision: draft.decision,
          note: note.length > 0 ? note : null,
          evidenceUrl: evidenceUrl.length > 0 ? evidenceUrl : null,
        }),
      })

      if (!response.ok) {
        throw new Error(await readResponseError(response))
      }

      const payload = (await response.json()) as {
        success?: boolean
        review?: LaunchReadinessReview
        error?: string
      }
      if (!payload.success || !payload.review) {
        throw new Error(payload.error ?? 'Failed to save launch readiness review.')
      }

      setReviews((current) => [payload.review as LaunchReadinessReview, ...current])
      setDrafts((current) => ({
        ...current,
        [check.key]: createDraft(),
      }))
      setMessage({
        type: 'success',
        text: `${check.label} review saved. Refreshing launch readiness state.`,
      })
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save launch readiness review.',
      })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-stone-100">Operator review console</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Save launch decisions only after inspecting the evidence for each reviewable check.
          </p>
        </div>
        {isPending ? (
          <span className="rounded-full border border-brand-900 bg-brand-950/40 px-2 py-0.5 text-[11px] font-semibold uppercase text-brand-200">
            Refreshing
          </span>
        ) : null}
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-900 bg-emerald-950/30 text-emerald-200'
              : 'border-red-900 bg-red-950/30 text-red-200'
          }`}
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {reviewableChecks.map((check) => {
          const draft = drafts[check.key] ?? createDraft()
          const checkReviews = reviewsByCheck.get(check.key) ?? []
          const saving = savingKey === check.key

          return (
            <form
              key={check.key}
              onSubmit={(event) => void submitReview(check, event)}
              className="rounded-lg border border-stone-800 bg-stone-950 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-100">{check.label}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{check.nextStep}</p>
                </div>
                {check.href ? (
                  <a
                    href={check.href}
                    className="inline-flex items-center gap-1 text-xs text-brand-400"
                  >
                    Open evidence
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateDraft(check.key, { decision: 'verified' })}
                  className={`min-h-[40px] rounded-lg border px-3 text-sm font-medium transition-colors ${
                    draft.decision === 'verified'
                      ? 'border-emerald-800 bg-emerald-950/50 text-emerald-100'
                      : 'border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => updateDraft(check.key, { decision: 'rejected' })}
                  className={`min-h-[40px] rounded-lg border px-3 text-sm font-medium transition-colors ${
                    draft.decision === 'rejected'
                      ? 'border-amber-800 bg-amber-950/50 text-amber-100'
                      : 'border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  Reject
                </button>
              </div>

              <label
                className="mt-4 block text-xs font-semibold uppercase text-stone-500"
                htmlFor={`${check.key}-note`}
              >
                Review note
              </label>
              <textarea
                id={`${check.key}-note`}
                value={draft.note}
                onChange={(event) => updateDraft(check.key, { note: event.target.value })}
                maxLength={2000}
                rows={3}
                className="mt-2 w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-brand-700"
                placeholder="What evidence did you review?"
              />

              <label
                className="mt-3 block text-xs font-semibold uppercase text-stone-500"
                htmlFor={`${check.key}-evidence`}
              >
                Evidence link
              </label>
              <input
                id={`${check.key}-evidence`}
                value={draft.evidenceUrl}
                onChange={(event) => updateDraft(check.key, { evidenceUrl: event.target.value })}
                maxLength={1000}
                className="mt-2 w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-brand-700"
                placeholder="/admin/launch-readiness or external proof URL"
              />

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  Save decision
                </Button>
              </div>

              <div className="mt-4 border-t border-stone-800 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-stone-500">
                  Recent decisions
                </p>
                <ReviewHistory reviews={checkReviews} />
              </div>
            </form>
          )
        })}

        {reviewableChecks.length === 0 ? (
          <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
            <p className="text-sm text-stone-300">No checks are waiting for operator review.</p>
            <div className="mt-3">
              <ReviewHistory reviews={reviews.slice(0, 5)} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
