// Event Journey Steps
// Pure function: takes event/inquiry/quote/contract data and returns JourneyStep[]
// representing the full 12-stage client journey from inquiry to review.
// No DB access - data is passed in from the page that fetches it.

export type JourneyStep = {
  key: string
  label: string
  description: string
  completedAt: string | null // ISO timestamp when completed; null = not yet reached
  isCurrent: boolean // true for the active step awaiting client action or in-flight
  isFuture: boolean // true for steps not yet reached
  isSkipped: boolean // true for optional steps not applicable to this event
  actionHref?: string // URL for the CTA button (only when isCurrent + action needed)
  actionLabel?: string // CTA button text
  isMilestone: boolean // true for steps worth celebrating/sharing
  shareText?: string // Pre-filled text for native share (milestone steps)
}

type EventTransition = {
  to_status: string
  transitioned_at: string
}

/**
 * Build the full 12-step client journey.
 *
 * Steps before a cancelled event are shown as completed up to the last
 * known good state; remaining steps are suppressed via isFuture.
 */
export function buildJourneySteps(params: {
  // Existing params (backward-compatible)
  inquiryCreatedAt?: string | null
  quoteSentAt?: string | null
  quoteStatus?: string | null
  eventStatus?: string | null
  eventTransitions?: EventTransition[]
  hasPhotos?: boolean

  // New params
  eventId?: string
  occasion?: string | null
  menuApprovalStatus?: string | null
  menuApprovalUpdatedAt?: string | null
  hasContract?: boolean
  contractSignedAt?: string | null
  preEventChecklistConfirmedAt?: string | null
  hasOutstandingBalance?: boolean
  hasReview?: boolean
}): JourneyStep[] {
  const {
    inquiryCreatedAt,
    quoteSentAt,
    quoteStatus,
    eventStatus,
    eventTransitions = [],
    hasPhotos = false,
    eventId = '',
    occasion,
    menuApprovalStatus,
    menuApprovalUpdatedAt,
    hasContract = false,
    contractSignedAt,
    preEventChecklistConfirmedAt,
    hasOutstandingBalance = false,
    hasReview = false,
  } = params

  // Build a lookup of to_status → earliest timestamp
  const transitionMap: Record<string, string> = {}
  for (const t of eventTransitions) {
    if (!transitionMap[t.to_status]) {
      transitionMap[t.to_status] = t.transitioned_at
    }
  }

  const cancelled = eventStatus === 'cancelled'
  const occasionLabel = occasion || 'your event'

  // ── Step definitions ───────────────────────────────────────────────────────

  const rawSteps: Array<{
    key: string
    label: string
    description: string
    completedAt: string | null
    isSkipped: boolean
    actionHref?: string
    actionLabel?: string
    isMilestone: boolean
    shareText?: string
  }> = [
    // 1. Inquiry received
    {
      key: 'inquiry_received',
      label: 'Inquiry Received',
      description: 'Your request was submitted and the chef has been notified.',
      completedAt: inquiryCreatedAt ?? null,
      isSkipped: false,
      isMilestone: false,
    },

    // 2. Proposal sent by chef
    {
      key: 'proposal_sent',
      label: 'Proposal Sent',
      description: 'The chef reviewed your request and sent you a custom proposal.',
      completedAt:
        quoteSentAt ??
        (quoteStatus && quoteStatus !== 'draft' ? (transitionMap['proposed'] ?? null) : null) ??
        transitionMap['proposed'] ??
        null,
      isSkipped: false,
      isMilestone: false,
    },

    // 3. Proposal accepted by client
    {
      key: 'proposal_accepted',
      label: 'Proposal Accepted',
      description: 'You reviewed and accepted the pricing and event details.',
      completedAt: transitionMap['accepted'] ?? null,
      isSkipped: false,
      actionHref: eventStatus === 'proposed' ? `/my-events/${eventId}` : undefined,
      actionLabel: eventStatus === 'proposed' ? 'Review & Accept' : undefined,
      isMilestone: false,
    },

    // 4. Contract signing (optional - skipped if no contract)
    {
      key: 'contract_signing',
      label: 'Contract Signed',
      description: 'You signed the service agreement - everything is official.',
      completedAt: contractSignedAt ?? null,
      isSkipped: !hasContract,
      actionHref:
        hasContract && !contractSignedAt && eventStatus === 'accepted'
          ? `/my-events/${eventId}/contract`
          : undefined,
      actionLabel:
        hasContract && !contractSignedAt && eventStatus === 'accepted'
          ? 'Sign Contract'
          : undefined,
      isMilestone: false,
    },

    // 5. Deposit paid
    {
      key: 'deposit_paid',
      label: 'Deposit Paid',
      description: 'Your payment secured the date and the chef has been retained.',
      completedAt: transitionMap['paid'] ?? null,
      isSkipped: false,
      actionHref:
        eventStatus === 'accepted' && !transitionMap['paid']
          ? `/my-events/${eventId}/pay`
          : undefined,
      actionLabel: eventStatus === 'accepted' && !transitionMap['paid'] ? 'Pay Deposit' : undefined,
      isMilestone: true,
      shareText: `My private chef dinner is officially booked! Can't wait for ${occasionLabel}. 🍽️`,
    },

    // 6. Event confirmed
    {
      key: 'event_confirmed',
      label: 'Event Confirmed',
      description: 'The chef has confirmed all details - your event is locked in.',
      completedAt: transitionMap['confirmed'] ?? null,
      isSkipped: false,
      isMilestone: true,
      shareText: `Excited! My private chef event (${occasionLabel}) is confirmed. 🎉`,
    },

    // 7. Menu review
    {
      key: 'menu_review',
      label: 'Menu Approved',
      description: 'You reviewed and approved the menu - the chef is ready to cook.',
      completedAt:
        menuApprovalStatus === 'approved'
          ? (menuApprovalUpdatedAt ?? transitionMap['confirmed'] ?? null)
          : null,
      isSkipped: false,
      actionHref:
        menuApprovalStatus === 'pending' ? `/my-events/${eventId}/approve-menu` : undefined,
      actionLabel: menuApprovalStatus === 'pending' ? 'Review Menu' : undefined,
      isMilestone: true,
      shareText: `Menu approved for my private chef dinner! The menu looks incredible. 🍷`,
    },

    // 8. Pre-event checklist
    {
      key: 'pre_event_checklist',
      label: 'Details Confirmed',
      description: 'You confirmed your dietary preferences and kitchen details.',
      completedAt: preEventChecklistConfirmedAt ?? null,
      isSkipped: false,
      actionHref:
        !preEventChecklistConfirmedAt &&
        ['confirmed', 'paid', 'in_progress'].includes(eventStatus ?? '')
          ? `/my-events/${eventId}/pre-event-checklist`
          : undefined,
      actionLabel:
        !preEventChecklistConfirmedAt &&
        ['confirmed', 'paid', 'in_progress'].includes(eventStatus ?? '')
          ? 'Confirm Details'
          : undefined,
      isMilestone: false,
    },

    // 9. Event day (in progress)
    {
      key: 'event_day',
      label: 'Event Day',
      description: 'The chef is at your location - your private dining experience has begun.',
      completedAt: transitionMap['in_progress'] ?? null,
      isSkipped: false,
      isMilestone: true,
      shareText: `Tonight is the night! My private chef is cooking - ${occasionLabel} is happening! 🥂`,
    },

    // 10. Dinner complete
    {
      key: 'dinner_complete',
      label: 'Dinner Complete',
      description: 'A beautiful evening - your event has wrapped up successfully.',
      completedAt: transitionMap['completed'] ?? null,
      isSkipped: false,
      isMilestone: true,
      shareText: `That was an incredible private chef dinner - ${occasionLabel} was unforgettable! 🌟`,
    },

    // 11. Post-event summary available
    {
      key: 'event_summary',
      label: 'Summary Ready',
      description: 'Your post-event summary is ready - view the menu recap and expense details.',
      completedAt: transitionMap['completed'] ?? null,
      isSkipped: false,
      actionHref: eventStatus === 'completed' ? `/my-events/${eventId}/event-summary` : undefined,
      actionLabel: eventStatus === 'completed' ? 'View Summary' : undefined,
      isMilestone: false,
    },

    // 12. Final balance + review
    {
      key: 'share_review',
      label: hasReview ? 'Review Shared' : 'Leave a Review',
      description: hasReview
        ? 'Thank you - your feedback helps the chef continue to grow.'
        : 'Share your experience and help the chef build their reputation.',
      completedAt: hasReview
        ? (transitionMap['completed'] ?? null)
        : hasPhotos
          ? (transitionMap['completed'] ?? null)
          : null,
      isSkipped: false,
      actionHref:
        eventStatus === 'completed' && !hasReview ? `/my-events/${eventId}#review` : undefined,
      actionLabel: eventStatus === 'completed' && !hasReview ? 'Leave a Review' : undefined,
      isMilestone: true,
      shareText: `I just left a review for my private chef - highly recommend! 🌟`,
    },
  ]

  // ── Filter skipped steps ───────────────────────────────────────────────────
  const visibleSteps = rawSteps.filter((s) => !s.isSkipped)

  // ── Mark current and future ────────────────────────────────────────────────
  let lastCompletedIndex = -1
  for (let i = 0; i < visibleSteps.length; i++) {
    if (visibleSteps[i].completedAt !== null) {
      lastCompletedIndex = i
    }
  }

  return visibleSteps.map((step, i) => ({
    ...step,
    // isCurrent: the first step with no completedAt - this is the "next action" step
    isCurrent: !cancelled && step.completedAt === null && i === lastCompletedIndex + 1,
    // isFuture: steps beyond the current one with no completedAt
    isFuture: step.completedAt === null && i > lastCompletedIndex + 1,
  }))
}
