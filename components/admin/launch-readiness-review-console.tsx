'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { LaunchReadinessCheck, LaunchReadinessReport } from '@/lib/validation/launch-readiness'
import type { LaunchReadinessRiskRegisterEntry } from '@/lib/validation/launch-readiness-risk-register'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck } from '@/components/ui/icons'

type LaunchReadinessReviewDecision = 'verified' | 'rejected'

type LaunchReadinessReview = {
  id: string
  checkKey: string
  decision: LaunchReadinessReviewDecision
  reviewerId?: string | null
  reviewedAt?: string | null
  note?: string | null
  evidenceUrl?: string | null
  checkLabel?: string | null
  checkStatusAtReview?: string | null
  checkNextStep?: string | null
  evidenceFingerprint?: string | null
  evidenceGeneratedAt?: string | null
  createdAt?: string | null
}

type LaunchReadinessSignoff = {
  id: string
  signedAt: string | null
  verifiedChecks: number
  totalChecks: number
  packetFilename: string
  packetSha256: string
  note: string | null
}

type LaunchReadinessActivityEvent = {
  id: string
  eventType: string
  checkKey: string | null
  occurredAt: string | null
  message: string
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

function formatReviewTime(value: string | null | undefined): string {
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
    return 'Request failed.'
  }

  return 'Request failed.'
}

function statusClasses(decision: LaunchReadinessReviewDecision): string {
  return decision === 'verified'
    ? 'border-emerald-900 bg-emerald-950/40 text-emerald-200'
    : 'border-amber-900 bg-amber-950/40 text-amber-200'
}

function ReviewHistory({
  reviews,
  currentFingerprint,
}: {
  reviews: LaunchReadinessReview[]
  currentFingerprint: string | null
}) {
  if (reviews.length === 0) {
    return <p className="text-xs text-stone-500">No operator decisions recorded yet.</p>
  }

  return (
    <details className="rounded-lg border border-stone-800 bg-stone-950">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase text-stone-400">
        Review history ({reviews.length})
      </summary>
      <div className="space-y-2 border-t border-stone-800 p-3">
        {reviews.map((review) => {
          const evidenceChanged =
            Boolean(review.evidenceFingerprint) &&
            Boolean(currentFingerprint) &&
            review.evidenceFingerprint !== currentFingerprint

          return (
            <div key={review.id} className="rounded-lg border border-stone-800 bg-stone-900 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${statusClasses(
                    review.decision
                  )}`}
                >
                  {review.decision === 'verified' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {review.decision}
                </span>
                <span className="text-[11px] text-stone-500">
                  {formatReviewTime(review.reviewedAt ?? review.createdAt)}
                </span>
              </div>
              {evidenceChanged ? (
                <p className="mt-2 rounded-md border border-amber-900 bg-amber-950/30 px-2 py-1 text-xs text-amber-200">
                  Evidence changed since this decision.
                </p>
              ) : null}
              {review.note ? (
                <p className="mt-2 text-xs leading-5 text-stone-300">{review.note}</p>
              ) : null}
              {review.checkNextStep ? (
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  Snapshot next step: {review.checkNextStep}
                </p>
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
          )
        })}
      </div>
    </details>
  )
}

export function LaunchReadinessReviewConsole({
  checks,
  riskRegister,
  currentEvidenceFingerprints,
  initialReviews,
  initialSignoffs,
  initialActivityEvents,
  reportStatus,
  verifiedChecks,
  totalChecks,
}: {
  checks: LaunchReadinessCheck[]
  riskRegister: LaunchReadinessRiskRegisterEntry[]
  currentEvidenceFingerprints: Record<string, string>
  initialReviews: LaunchReadinessReview[]
  initialSignoffs: LaunchReadinessSignoff[]
  initialActivityEvents: LaunchReadinessActivityEvent[]
  reportStatus: LaunchReadinessReport['status']
  verifiedChecks: number
  totalChecks: number
}) {
  const router = useRouter()
  const [reviews, setReviews] = useState<LaunchReadinessReview[]>(initialReviews)
  const [signoffs, setSignoffs] = useState<LaunchReadinessSignoff[]>(initialSignoffs)
  const [activityEvents, setActivityEvents] =
    useState<LaunchReadinessActivityEvent[]>(initialActivityEvents)
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [signoffNote, setSignoffNote] = useState('')
  const [savingSignoff, setSavingSignoff] = useState(false)
  const [message, setMessage] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setReviews(initialReviews)
  }, [initialReviews])

  useEffect(() => {
    setSignoffs(initialSignoffs)
  }, [initialSignoffs])

  useEffect(() => {
    setActivityEvents(initialActivityEvents)
  }, [initialActivityEvents])

  const riskByCheck = useMemo(() => {
    const grouped = new Map<string, LaunchReadinessRiskRegisterEntry>()
    for (const risk of riskRegister) grouped.set(risk.checkKey, risk)
    return grouped
  }, [riskRegister])

  const reviewableChecks = useMemo(() => {
    const priority = new Map(riskRegister.map((risk, index) => [risk.checkKey, index]))
    return checks
      .filter((check) => check.status === 'operator_review')
      .sort((a, b) => (priority.get(a.key) ?? 999) - (priority.get(b.key) ?? 999))
  }, [checks, riskRegister])

  const reviewsByCheck = useMemo(() => {
    const grouped = new Map<string, LaunchReadinessReview[]>()
    for (const review of reviews) {
      const existing = grouped.get(review.checkKey) ?? []
      existing.push(review)
      grouped.set(review.checkKey, existing)
    }
    return grouped
  }, [reviews])

  const readyForSignoff = reportStatus === 'ready' && verifiedChecks === totalChecks

  function updateDraft(checkKey: string, patch: Partial<DraftState>) {
    setDrafts((current) => ({
      ...current,
      [checkKey]: {
        ...(current[checkKey] ?? createDraft()),
        ...patch,
      },
    }))
  }

  function refreshAfterMutation() {
    startTransition(() => {
      router.refresh()
    })
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
      refreshAfterMutation()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save launch readiness review.',
      })
    } finally {
      setSavingKey(null)
    }
  }

  async function submitSignoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!readyForSignoff) {
      setMessage({
        type: 'error',
        text: 'Final sign-off requires every launch readiness check to be verified.',
      })
      return
    }

    setSavingSignoff(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/launch-readiness/signoffs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: signoffNote.trim().length > 0 ? signoffNote.trim() : null,
        }),
      })

      if (!response.ok) {
        throw new Error(await readResponseError(response))
      }

      const payload = (await response.json()) as {
        success?: boolean
        signoff?: LaunchReadinessSignoff
        error?: string
      }
      if (!payload.success || !payload.signoff) {
        throw new Error(payload.error ?? 'Failed to save launch readiness sign-off.')
      }

      setSignoffs((current) => [payload.signoff as LaunchReadinessSignoff, ...current])
      setSignoffNote('')
      setMessage({ type: 'success', text: 'Final launch sign-off saved.' })
      refreshAfterMutation()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save launch readiness sign-off.',
      })
    } finally {
      setSavingSignoff(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-stone-100">Operator review console</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Highest-risk checks appear first. Decisions save evidence snapshots before the report
              refreshes.
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
            const risk = riskByCheck.get(check.key)
            const currentFingerprint = currentEvidenceFingerprints[check.key] ?? null
            const latestReview = checkReviews[0]
            const latestEvidenceChanged =
              Boolean(latestReview?.evidenceFingerprint) &&
              Boolean(currentFingerprint) &&
              latestReview?.evidenceFingerprint !== currentFingerprint

            return (
              <form
                key={check.key}
                onSubmit={(event) => void submitReview(check, event)}
                className="rounded-lg border border-stone-800 bg-stone-950 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-stone-100">{check.label}</p>
                      {risk ? (
                        <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-400">
                          {risk.severity}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      {risk?.nextAction ?? check.nextStep}
                    </p>
                    {latestEvidenceChanged ? (
                      <p className="mt-2 rounded-md border border-amber-900 bg-amber-950/30 px-2 py-1 text-xs text-amber-200">
                        Current evidence changed since the latest saved decision.
                      </p>
                    ) : null}
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

                <div className="mt-4">
                  <ReviewHistory reviews={checkReviews} currentFingerprint={currentFingerprint} />
                </div>
              </form>
            )
          })}

          {reviewableChecks.length === 0 ? (
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
              <p className="text-sm text-stone-300">No checks are waiting for operator review.</p>
              <div className="mt-3">
                <ReviewHistory reviews={reviews.slice(0, 5)} currentFingerprint={null} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex items-center gap-2 text-stone-100">
          <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          <h2 className="text-base font-semibold">Final launch sign-off</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Records an immutable launch packet only when every check is verified.
        </p>
        <form onSubmit={(event) => void submitSignoff(event)} className="mt-4 space-y-3">
          <textarea
            value={signoffNote}
            onChange={(event) => setSignoffNote(event.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-brand-700"
            placeholder="Optional final launch note"
          />
          <Button type="submit" variant="primary" size="sm" loading={savingSignoff} disabled={!readyForSignoff}>
            Record final sign-off
          </Button>
          {!readyForSignoff ? (
            <p className="text-xs text-stone-500">
              Waiting on {totalChecks - verifiedChecks} unverified launch checks.
            </p>
          ) : null}
        </form>
        <div className="mt-4 space-y-2">
          {signoffs.slice(0, 3).map((signoff) => (
            <div key={signoff.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <p className="text-sm font-medium text-stone-100">{signoff.packetFilename}</p>
              <p className="mt-1 text-xs text-stone-500">
                {signoff.verifiedChecks}/{signoff.totalChecks} checks, signed{' '}
                {formatReviewTime(signoff.signedAt)}
              </p>
              <p className="mt-1 break-all text-[11px] text-stone-600">{signoff.packetSha256}</p>
              {signoff.note ? (
                <p className="mt-2 text-xs leading-5 text-stone-300">{signoff.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <h2 className="text-base font-semibold text-stone-100">Launch readiness activity</h2>
        <div className="mt-4 space-y-2">
          {activityEvents.slice(0, 8).map((event) => (
            <div key={event.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-400">
                  {event.eventType.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-stone-500">
                  {formatReviewTime(event.occurredAt)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-300">{event.message}</p>
            </div>
          ))}
          {activityEvents.length === 0 ? (
            <p className="text-sm text-stone-500">No launch readiness activity recorded yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
