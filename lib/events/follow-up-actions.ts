'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getAARByEventId } from '@/lib/aar/actions'
import { getEventTrustLoopState } from '@/lib/events/post-event-trust-loop-actions'
import { getCircleForEvent } from '@/lib/hub/circle-lookup'

// ---------------------------------------------------------------------------
// Post-Event Follow-Up State
// Aggregates all post-event step statuses into a single object for the
// guided follow-up checklist.
// ---------------------------------------------------------------------------

export type FollowUpStep = {
  id: string
  label: string
  description: string
  status: 'done' | 'ready' | 'blocked' | 'skipped'
  completedAt: string | null
  /** URL to navigate to for this step */
  actionUrl: string | null
  /** Button label */
  actionLabel: string | null
  /** Extra metadata for rendering */
  meta?: Record<string, unknown>
}

export type FollowUpState = {
  eventId: string
  eventStatus: string
  clientName: string | null
  clientId: string | null
  occasion: string | null
  eventDate: string | null
  circleId: string | null
  circleToken: string | null
  steps: FollowUpStep[]
  completedCount: number
  totalCount: number
}

export async function getEventFollowUpState(eventId: string): Promise<FollowUpState | null> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  // Fetch event
  const { data: event, error } = await db
    .from('events')
    .select(
      'id, status, occasion, event_date, client_id, follow_up_sent, follow_up_sent_at, debrief_completed_at, review_link_sent'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId ?? user.entityId)
    .maybeSingle()

  if (error || !event) return null

  // Only show follow-up for completed events
  if (event.status !== 'completed') return null

  // Fetch client info
  let clientName: string | null = null
  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .maybeSingle()
    clientName = client?.full_name ?? null
  }

  // Fetch AAR, trust loop, circle, rebook token in parallel
  const [aar, trustLoop, circle, rebookResult] = await Promise.all([
    getAARByEventId(eventId),
    getEventTrustLoopState(eventId),
    getCircleForEvent(eventId),
    db
      .from('rebook_tokens')
      .select('id, created_at')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId ?? user.entityId)
      .is('used_at', null)
      .maybeSingle(),
  ])

  const survey = trustLoop.survey
  const hasAAR = Boolean(aar)
  const debriefDone = Boolean(event.debrief_completed_at)
  const followUpSent = Boolean(event.follow_up_sent)
  const surveySent = Boolean(survey?.sent_at)
  const surveyCompleted = Boolean(survey?.completed_at)
  const reviewRequestSent = Boolean(survey?.review_request_sent_at)
  const reviewEligible = Boolean(survey?.review_request_eligible)
  const hasRebookToken = Boolean(rebookResult?.data)

  const steps: FollowUpStep[] = [
    // Step 1: Complete AAR / Debrief
    {
      id: 'aar',
      label: 'Complete your event review',
      description: hasAAR
        ? 'Event review filed. You captured what went well and what to improve.'
        : debriefDone
          ? 'Debrief captured. Consider filing a full event review for deeper insights.'
          : 'Capture what you learned while the service is still fresh.',
      status: hasAAR ? 'done' : 'ready',
      completedAt: hasAAR ? ((aar as any)?.created_at ?? null) : null,
      actionUrl: `/events/${eventId}/aar`,
      actionLabel: hasAAR ? 'View Review' : 'File Event Review',
      meta: { debriefDone },
    },

    // Step 2: Send thank-you to client
    {
      id: 'thank-you',
      label: 'Send thank-you to client',
      description: followUpSent
        ? `Follow-up tracked as sent${event.follow_up_sent_at ? '.' : '.'}`
        : event.client_id
          ? 'Send a thank-you message to keep the relationship warm.'
          : 'No client linked to this event.',
      status: followUpSent ? 'done' : event.client_id ? 'ready' : 'blocked',
      completedAt: event.follow_up_sent_at ?? null,
      actionUrl: null, // Handled inline via server action
      actionLabel: followUpSent ? null : 'Mark Thank-You Sent',
      meta: { clientId: event.client_id },
    },

    // Step 3: Request review
    {
      id: 'review',
      label: 'Request a client review',
      description: reviewRequestSent
        ? 'Review request sent.'
        : surveyCompleted && reviewEligible
          ? 'Client responded positively. Good time to request a public review.'
          : surveyCompleted && !reviewEligible
            ? 'Client response does not qualify for a review request.'
            : surveySent
              ? 'Survey sent, waiting for client response.'
              : event.client_id
                ? 'Send a satisfaction survey first, then request a review if appropriate.'
                : 'No client linked to this event.',
      status: reviewRequestSent
        ? 'done'
        : surveyCompleted && reviewEligible
          ? 'ready'
          : surveyCompleted && !reviewEligible
            ? 'skipped'
            : surveySent
              ? 'blocked'
              : event.client_id
                ? 'ready'
                : 'blocked',
      completedAt: survey?.review_request_sent_at ?? null,
      actionUrl: null,
      actionLabel:
        !surveySent && event.client_id
          ? 'Send Survey'
          : surveyCompleted && reviewEligible && !reviewRequestSent
            ? 'Mark Review Requested'
            : null,
      meta: {
        surveySent,
        surveyCompleted,
        reviewEligible,
        surveyId: survey?.id ?? null,
      },
    },

    // Step 4: Schedule rebook / follow-up
    {
      id: 'rebook',
      label: 'Plan the next booking',
      description: hasRebookToken
        ? 'Rebook link created for this client.'
        : 'Clone this event to start a new booking, or set a follow-up reminder.',
      status: hasRebookToken ? 'done' : 'ready',
      completedAt: rebookResult?.data?.created_at ?? null,
      actionUrl: `/events/${eventId}/edit?clone=true`,
      actionLabel: hasRebookToken ? 'View Rebook' : 'Clone for Rebook',
    },

    // Step 5: Update circle notes
    {
      id: 'circle',
      label: 'Update circle notes',
      description: circle
        ? 'Visit the dinner circle to add notes or update client context.'
        : 'No dinner circle linked to this event.',
      status: circle ? 'ready' : 'blocked',
      completedAt: null,
      actionUrl: circle ? `/circles?group=${circle.groupToken}` : null,
      actionLabel: circle ? 'Open Circle' : null,
      meta: { circleId: circle?.groupId ?? null },
    },
  ]

  const completedCount = steps.filter((s) => s.status === 'done').length

  return {
    eventId,
    eventStatus: event.status,
    clientName,
    clientId: event.client_id,
    occasion: event.occasion,
    eventDate: event.event_date,
    circleId: circle?.groupId ?? null,
    circleToken: circle?.groupToken ?? null,
    steps,
    completedCount,
    totalCount: steps.length,
  }
}

// ---------------------------------------------------------------------------
// Follow-Up Actions (thin wrappers that revalidate the follow-up page)
// ---------------------------------------------------------------------------

export async function markThankYouSentFromFollowUp(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      follow_up_sent: true,
      follow_up_sent_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[follow-up] Failed to mark thank-you sent:', error)
    return { ok: false, error: 'Failed to update' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/follow-up`)
  return { ok: true }
}

export async function sendSurveyFromFollowUp(eventId: string) {
  const { sendChefManagedPostEventSurvey } =
    await import('@/lib/events/post-event-trust-loop-actions')
  const result = await sendChefManagedPostEventSurvey(eventId)

  revalidatePath(`/events/${eventId}/follow-up`)
  return result
}

export async function markReviewRequestedFromFollowUp(surveyId: string, eventId: string) {
  const { markSurveyReviewRequestSent } = await import('@/lib/events/post-event-trust-loop-actions')
  const result = await markSurveyReviewRequestSent(surveyId)

  revalidatePath(`/events/${eventId}/follow-up`)
  return result
}
