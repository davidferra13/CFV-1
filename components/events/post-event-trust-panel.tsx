import { format } from 'date-fns'
import { markFollowUpSent } from '@/lib/events/actions'
import { sendClientSurvey } from '@/lib/surveys/actions'
import {
  getEventTrustLoopState,
  markSurveyReviewRequestSent,
} from '@/lib/events/post-event-trust-loop-actions'
import { getReviewRequestGate } from '@/lib/events/post-event-trust-loop-helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type PostEventTrustPanelProps = {
  eventId: string
  eventStatus: string
  hasClient: boolean
  followUpSent: boolean
  followUpSentAt: string | null
}

function formatTimestamp(value: string | null): string | null {
  if (!value) return null

  try {
    return format(new Date(value), "MMM d, yyyy 'at' h:mm a")
  } catch {
    return null
  }
}

function StepStatus({
  label,
  variant,
}: {
  label: string
  variant: 'default' | 'success' | 'warning' | 'error' | 'info'
}) {
  return <Badge variant={variant}>{label}</Badge>
}

export async function PostEventTrustPanel({
  eventId,
  eventStatus,
  hasClient,
  followUpSent,
  followUpSentAt,
}: PostEventTrustPanelProps) {
  if (eventStatus !== 'completed' || !hasClient) {
    return null
  }

  const trustLoop = await getEventTrustLoopState(eventId)
  const survey = trustLoop.survey
  const surveyId = survey?.id ?? null
  const surveyToken = survey?.token ?? null
  const surveySentAt = survey?.sent_at ?? null
  const surveyCompletedAt = survey?.completed_at ?? null
  const surveyOverall = survey?.overall ?? null
  const surveyWouldBookAgain = survey?.would_book_again
  const surveyHighlight = survey?.what_they_loved ?? null
  const reviewRequestSentAt = survey?.review_request_sent_at ?? null
  const publicReviewShared = survey?.public_review_shared ?? false
  const reviewGate = survey
    ? getReviewRequestGate({
        completedAt: surveyCompletedAt,
        reviewRequestEligible: survey.review_request_eligible,
        reviewRequestSentAt,
      })
    : { ok: false as const, reason: 'incomplete' as const }

  async function handleMarkFollowUpSent() {
    'use server'
    await markFollowUpSent(eventId)
  }

  async function handleSendSurvey() {
    'use server'
    await sendClientSurvey(eventId)
  }

  async function handleMarkReviewRequestSent() {
    'use server'
    if (!surveyId) return
    await markSurveyReviewRequestSent(surveyId)
  }

  return (
    <Card
      className="p-6 border-brand-200 bg-brand-950/40"
      data-testid="event-post-event-trust-loop"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Post-Event Trust Loop</h2>
          <p className="mt-1 text-sm text-stone-400">
            Track the canonical client follow-up flow: thank the client, collect satisfaction,
            request a public review only when appropriate, and keep repeat intent visible for the
            next booking.
          </p>
        </div>
        <Button href="/surveys" variant="ghost" size="sm">
          Open Survey Dashboard
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-700/60 bg-stone-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Step 1
              </p>
              <h3 className="mt-1 font-medium text-stone-100">Thank the client</h3>
              <p className="mt-1 text-sm text-stone-400">
                Keep post-event follow-up event-scoped so accountability and queue surfaces stay
                honest.
              </p>
            </div>
            <StepStatus
              label={followUpSent ? 'Complete' : 'Pending'}
              variant={followUpSent ? 'success' : 'warning'}
            />
          </div>

          <p className="mt-3 text-xs text-stone-500">
            {followUpSent
              ? `Tracked as sent ${formatTimestamp(followUpSentAt) ?? 'recently'}.`
              : 'Mark this once the thank-you or post-event follow-up has actually been sent.'}
          </p>

          {!followUpSent && (
            <form action={handleMarkFollowUpSent} className="mt-4">
              <Button type="submit" variant="secondary" size="sm">
                Mark Follow-Up Sent
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-stone-700/60 bg-stone-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Step 2
              </p>
              <h3 className="mt-1 font-medium text-stone-100">Capture satisfaction</h3>
              <p className="mt-1 text-sm text-stone-400">
                The canonical survey lives in <code>/feedback/[token]</code> and writes only to{' '}
                <code>post_event_surveys</code>.
              </p>
            </div>
            <StepStatus
              label={surveyCompletedAt ? 'Responded' : surveySentAt ? 'Awaiting Response' : 'Ready'}
              variant={surveyCompletedAt ? 'success' : surveySentAt ? 'info' : 'warning'}
            />
          </div>

          <div className="mt-3 space-y-1 text-xs text-stone-500">
            <p>
              {surveySentAt
                ? `Survey sent ${formatTimestamp(surveySentAt) ?? 'recently'}.`
                : 'No survey has been sent from the canonical trust loop yet.'}
            </p>
            {surveyCompletedAt && (
              <>
                <p>Response recorded {formatTimestamp(surveyCompletedAt) ?? 'recently'}.</p>
                {typeof surveyOverall === 'number' && (
                  <p className="text-stone-300">Overall rating: {surveyOverall}/5.</p>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!surveySentAt && (
              <form action={handleSendSurvey}>
                <Button type="submit" variant="secondary" size="sm">
                  Send Survey
                </Button>
              </form>
            )}
            {surveyToken && (
              <Button href={`/feedback/${surveyToken}`} variant="ghost" size="sm">
                View Survey Link
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-stone-700/60 bg-stone-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Step 3
              </p>
              <h3 className="mt-1 font-medium text-stone-100">Request a public review</h3>
              <p className="mt-1 text-sm text-stone-400">
                Only ask after a positive response. Consented client feedback promotes into the
                existing public review feed instead of a separate testimonial silo.
              </p>
            </div>
            <StepStatus
              label={
                publicReviewShared
                  ? 'Shared Publicly'
                  : reviewGate.ok
                    ? 'Ready'
                    : reviewRequestSentAt
                      ? 'Sent'
                      : reviewGate.reason === 'not_eligible'
                        ? 'Not Eligible'
                        : reviewGate.reason === 'incomplete'
                          ? 'Blocked'
                          : 'Sent'
              }
              variant={
                publicReviewShared
                  ? 'success'
                  : reviewGate.ok
                    ? 'warning'
                    : reviewGate.reason === 'not_eligible'
                      ? 'default'
                      : reviewGate.reason === 'incomplete'
                        ? 'default'
                        : 'info'
              }
            />
          </div>

          <div className="mt-3 space-y-1 text-xs text-stone-500">
            {publicReviewShared ? (
              <p>A consented client review is already in the public proof feed for this event.</p>
            ) : reviewRequestSentAt ? (
              <p>
                Review request tracked as sent {formatTimestamp(reviewRequestSentAt) ?? 'recently'}.
              </p>
            ) : reviewGate.ok ? (
              <p>Use the AI review-request draft below, then record the send here.</p>
            ) : reviewGate.reason === 'not_eligible' ? (
              <p>This response does not qualify for a public review request.</p>
            ) : (
              <p>Wait for the survey response before requesting a public review.</p>
            )}
          </div>

          {reviewGate.ok && !publicReviewShared && surveyId && (
            <form action={handleMarkReviewRequestSent} className="mt-4">
              <Button type="submit" variant="secondary" size="sm">
                Mark Review Request Sent
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-stone-700/60 bg-stone-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Step 4
              </p>
              <h3 className="mt-1 font-medium text-stone-100">Track repeat intent</h3>
              <p className="mt-1 text-sm text-stone-400">
                Keep rebooking signal attached to the event so future service and client
                intelligence use the same source.
              </p>
            </div>
            <StepStatus
              label={
                surveyWouldBookAgain === true
                  ? 'Would Book Again'
                  : surveyWouldBookAgain === false
                    ? 'Would Not Rebook'
                    : surveyCompletedAt
                      ? 'No Answer'
                      : 'Pending'
              }
              variant={
                surveyWouldBookAgain === true
                  ? 'success'
                  : surveyWouldBookAgain === false
                    ? 'error'
                    : surveyCompletedAt
                      ? 'default'
                      : 'warning'
              }
            />
          </div>

          <div className="mt-3 space-y-1 text-xs text-stone-500">
            {surveyWouldBookAgain === true && (
              <p className="text-stone-300">The client explicitly said they would book again.</p>
            )}
            {surveyWouldBookAgain === false && (
              <p className="text-stone-300">
                The client would probably not rebook. Treat this as a service recovery signal.
              </p>
            )}
            {surveyWouldBookAgain === null && (
              <p>
                {surveyCompletedAt
                  ? 'The client responded without giving a repeat-booking signal.'
                  : 'Repeat intent will appear here once the client responds.'}
              </p>
            )}
            {surveyHighlight && (
              <p className="rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-stone-300">
                Highlight: {surveyHighlight}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
