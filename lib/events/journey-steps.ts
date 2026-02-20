// Event Journey Steps
// Pure function: takes event/inquiry/quote data and returns a JourneyStep[]
// representing the full client journey from inquiry submission to photos ready.
// No DB access — data is passed in from the page that fetches it.

export type JourneyStep = {
  key: string
  label: string
  description: string
  completedAt: string | null  // ISO timestamp when this step was completed; null = not yet reached
  isCurrent: boolean          // true for the last completed step that hasn't led to the next yet
  isFuture: boolean           // true for steps not yet reached
}

type EventTransition = {
  to_status: string
  transitioned_at: string
}

/**
 * Build the 8-step client journey from available data.
 *
 * Called with whatever data is available — partial objects are fine.
 * Steps before a cancelled event are shown as completed up to the last
 * known good state; remaining steps are suppressed.
 */
export function buildJourneySteps(params: {
  inquiryCreatedAt?: string | null
  quoteSentAt?: string | null
  quoteStatus?: string | null
  eventStatus?: string | null
  eventTransitions?: EventTransition[]
  hasPhotos?: boolean
}): JourneyStep[] {
  const {
    inquiryCreatedAt,
    quoteSentAt,
    quoteStatus,
    eventStatus,
    eventTransitions = [],
    hasPhotos = false,
  } = params

  // Build a lookup of to_status → timestamp from event transitions
  const transitionMap: Record<string, string> = {}
  for (const t of eventTransitions) {
    // Keep the latest timestamp for each status (idempotent)
    transitionMap[t.to_status] = t.transitioned_at
  }

  const cancelled = eventStatus === 'cancelled'

  // ── Step definitions ───────────────────────────────────────────────────────

  const steps: Array<{
    key: string
    label: string
    description: string
    completedAt: string | null
  }> = [
    {
      key: 'inquiry_received',
      label: 'Inquiry Received',
      description: 'Your request was submitted and received by the chef.',
      completedAt: inquiryCreatedAt ?? null,
    },
    {
      key: 'quote_sent',
      label: 'Quote Sent',
      description: 'The chef reviewed your request and sent you a custom quote.',
      completedAt:
        quoteSentAt ??
        (quoteStatus && quoteStatus !== 'draft' ? transitionMap['proposed'] ?? null : null) ??
        null,
    },
    {
      key: 'quote_accepted',
      label: 'Quote Accepted',
      description: 'You reviewed and accepted the chef\'s pricing proposal.',
      completedAt: transitionMap['accepted'] ?? null,
    },
    {
      key: 'payment_received',
      label: 'Payment Received',
      description: 'Your payment (or deposit) was successfully processed.',
      completedAt: transitionMap['paid'] ?? null,
    },
    {
      key: 'event_confirmed',
      label: 'Event Confirmed',
      description: 'The chef has confirmed all details and your event is locked in.',
      completedAt: transitionMap['confirmed'] ?? null,
    },
    {
      key: 'chef_on_the_way',
      label: 'Chef on the Way',
      description: 'Your chef is en route and the event is in progress.',
      completedAt: transitionMap['in_progress'] ?? null,
    },
    {
      key: 'dinner_complete',
      label: 'Dinner Complete',
      description: 'A beautiful evening — your event has wrapped up.',
      completedAt: transitionMap['completed'] ?? null,
    },
    {
      key: 'photos_ready',
      label: 'Photos Ready',
      description: 'The chef has uploaded photos from your event to the portal.',
      completedAt: hasPhotos ? (transitionMap['completed'] ?? null) : null,
    },
  ]

  // ── Mark current and future ────────────────────────────────────────────────

  // Find the index of the last completed step
  let lastCompletedIndex = -1
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].completedAt !== null) {
      lastCompletedIndex = i
    }
  }

  return steps.map((step, i) => ({
    ...step,
    isCurrent: !cancelled && i === lastCompletedIndex,
    isFuture: i > lastCompletedIndex,
  }))
}
