// Event Journey Steps
// Pure helpers for the client-facing event lifecycle.
// These step definitions are the source of truth for both the timeline UI
// and any "what should the client do next?" surfaces.

import {
  isContractClientSignable,
  isMenuClientReviewPending,
} from '@/lib/action-graph/bookings'

export type JourneyStep = {
  key: string
  label: string
  description: string
  completedAt: string | null
  isCurrent: boolean
  isFuture: boolean
  isSkipped: boolean
  actionHref?: string
  actionLabel?: string
  isMilestone: boolean
  shareText?: string
}

export type JourneyAction = {
  key: string
  label: string
  description: string
  actionHref: string
  actionLabel: string
}

type EventTransition = {
  to_status: string
  transitioned_at: string
}

export type JourneyStepInput = {
  inquiryCreatedAt?: string | null
  quoteSentAt?: string | null
  quoteStatus?: string | null
  eventStatus?: string | null
  eventTransitions?: EventTransition[]
  hasPhotos?: boolean
  eventId?: string
  occasion?: string | null
  menuApprovalStatus?: string | null
  menuApprovalUpdatedAt?: string | null
  hasContract?: boolean
  contractStatus?: string | null
  contractSignedAt?: string | null
  preEventChecklistConfirmedAt?: string | null
  hasOutstandingBalance?: boolean
  hasReview?: boolean
}

type JourneyStepDefinition = Omit<JourneyStep, 'isCurrent' | 'isFuture'>

const EVENT_STATUS_ORDER = ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed']

function buildTransitionMap(eventTransitions: EventTransition[] = []): Record<string, string> {
  const transitionMap: Record<string, string> = {}

  for (const transition of eventTransitions) {
    if (!transitionMap[transition.to_status]) {
      transitionMap[transition.to_status] = transition.transitioned_at
    }
  }

  return transitionMap
}

function hasReachedEventStatus(
  eventStatus: string | null | undefined,
  targetStatus: (typeof EVENT_STATUS_ORDER)[number]
): boolean {
  if (!eventStatus || eventStatus === 'cancelled') return false
  const currentIndex = EVENT_STATUS_ORDER.indexOf(eventStatus)
  const targetIndex = EVENT_STATUS_ORDER.indexOf(targetStatus)
  if (currentIndex === -1 || targetIndex === -1) return false
  return currentIndex >= targetIndex
}

function buildStepDefinitions(input: JourneyStepInput): JourneyStepDefinition[] {
  const {
    inquiryCreatedAt,
    quoteSentAt,
    quoteStatus,
    eventStatus,
    eventTransitions = [],
    eventId = '',
    occasion,
    menuApprovalStatus,
    menuApprovalUpdatedAt,
    hasContract = false,
    contractStatus,
    contractSignedAt,
    preEventChecklistConfirmedAt,
    hasReview = false,
  } = input

  const transitionMap = buildTransitionMap(eventTransitions)
  const occasionLabel = occasion || 'your event'

  return [
    {
      key: 'inquiry_received',
      label: 'Inquiry Received',
      description: 'Your request was submitted and the chef has been notified.',
      completedAt: inquiryCreatedAt ?? null,
      isSkipped: false,
      isMilestone: false,
    },
    {
      key: 'proposal_sent',
      label: 'Proposal Sent',
      description: 'The chef reviewed your request and sent you a custom proposal.',
      completedAt:
        quoteSentAt ??
        (quoteStatus && quoteStatus !== 'draft' ? (transitionMap.proposed ?? null) : null) ??
        transitionMap.proposed ??
        null,
      isSkipped: false,
      isMilestone: false,
    },
    {
      key: 'proposal_accepted',
      label: 'Proposal Accepted',
      description: 'You reviewed and accepted the pricing and event details.',
      completedAt: transitionMap.accepted ?? null,
      isSkipped: false,
      actionHref: eventStatus === 'proposed' ? `/my-events/${eventId}/proposal` : undefined,
      actionLabel: eventStatus === 'proposed' ? 'Review Proposal' : undefined,
      isMilestone: false,
    },
    {
      key: 'contract_signing',
      label: 'Contract Signed',
      description: 'You signed the service agreement and everything is official.',
      completedAt: contractSignedAt ?? null,
      isSkipped: !hasContract,
      actionHref:
        hasContract &&
        !contractSignedAt &&
        eventStatus === 'accepted' &&
        isContractClientSignable(contractStatus)
          ? `/my-events/${eventId}/contract`
          : undefined,
      actionLabel:
        hasContract &&
        !contractSignedAt &&
        eventStatus === 'accepted' &&
        isContractClientSignable(contractStatus)
          ? 'Sign Contract'
          : undefined,
      isMilestone: false,
    },
    {
      key: 'deposit_paid',
      label: 'Deposit Paid',
      description: 'Your payment secured the date and the chef has been retained.',
      completedAt: transitionMap.paid ?? null,
      isSkipped: false,
      actionHref:
        eventStatus === 'accepted' && !transitionMap.paid ? `/my-events/${eventId}/pay` : undefined,
      actionLabel: eventStatus === 'accepted' && !transitionMap.paid ? 'Pay Now' : undefined,
      isMilestone: true,
      shareText: `My private chef dinner is officially booked. Can't wait for ${occasionLabel}.`,
    },
    {
      key: 'event_confirmed',
      label: 'Event Confirmed',
      description: 'The chef has confirmed all details and your event is locked in.',
      completedAt: transitionMap.confirmed ?? null,
      isSkipped: false,
      isMilestone: true,
      shareText: `Excited. My private chef event (${occasionLabel}) is confirmed.`,
    },
    {
      key: 'menu_review',
      label: 'Menu Approved',
      description: 'You reviewed and approved the menu and the chef is ready to cook.',
      completedAt:
        menuApprovalStatus === 'approved'
          ? (menuApprovalUpdatedAt ?? transitionMap.confirmed ?? null)
          : null,
      isSkipped: false,
      actionHref:
        isMenuClientReviewPending(menuApprovalStatus)
          ? `/my-events/${eventId}/approve-menu`
          : undefined,
      actionLabel: isMenuClientReviewPending(menuApprovalStatus) ? 'Review Menu' : undefined,
      isMilestone: true,
      shareText: `Menu approved for my private chef dinner. The lineup looks incredible.`,
    },
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
    {
      key: 'event_day',
      label: 'Event Day',
      description: 'The chef is at your location and your private dining experience has begun.',
      completedAt: transitionMap.in_progress ?? null,
      isSkipped: false,
      isMilestone: true,
      shareText: `Tonight is the night. My private chef is cooking and ${occasionLabel} is happening.`,
    },
    {
      key: 'dinner_complete',
      label: 'Dinner Complete',
      description: 'A beautiful evening and your event wrapped successfully.',
      completedAt: transitionMap.completed ?? null,
      isSkipped: false,
      isMilestone: true,
      shareText: `That private chef dinner was unforgettable. ${occasionLabel} was a hit.`,
    },
    {
      key: 'event_summary',
      label: 'Summary Ready',
      description: 'Your post-event summary is ready with the menu recap and expense details.',
      completedAt: transitionMap.completed ?? null,
      isSkipped: false,
      actionHref: eventStatus === 'completed' ? `/my-events/${eventId}/event-summary` : undefined,
      actionLabel: eventStatus === 'completed' ? 'View Summary' : undefined,
      isMilestone: false,
    },
    {
      key: 'share_review',
      label: hasReview ? 'Review Shared' : 'Leave a Review',
      description: hasReview
        ? 'Thank you. Your feedback helps the chef continue to grow.'
        : 'Share your experience and help the chef build their reputation.',
      completedAt: hasReview ? (transitionMap.completed ?? null) : null,
      isSkipped: false,
      actionHref:
        eventStatus === 'completed' && !hasReview ? `/my-events/${eventId}#review` : undefined,
      actionLabel: eventStatus === 'completed' && !hasReview ? 'Leave Review' : undefined,
      isMilestone: true,
      shareText: `I just left a review for my private chef and would absolutely recommend them.`,
    },
  ]
}

function hasReachedJourneyStep(
  step: JourneyStepDefinition,
  input: JourneyStepInput
): boolean {
  if (step.completedAt) return true

  switch (step.key) {
    case 'inquiry_received':
      return Boolean(input.inquiryCreatedAt || input.quoteSentAt || input.quoteStatus || input.eventStatus)
    case 'proposal_sent':
      return Boolean(
        input.quoteSentAt ||
          (input.quoteStatus && input.quoteStatus !== 'draft') ||
          (input.eventStatus && input.eventStatus !== 'draft')
      )
    case 'proposal_accepted':
      return hasReachedEventStatus(input.eventStatus, 'accepted')
    case 'contract_signing':
      if (!input.hasContract) return true
      return Boolean(input.contractSignedAt || hasReachedEventStatus(input.eventStatus, 'paid'))
    case 'deposit_paid':
      return hasReachedEventStatus(input.eventStatus, 'paid')
    case 'event_confirmed':
      return hasReachedEventStatus(input.eventStatus, 'confirmed')
    case 'menu_review':
      return Boolean(
        input.menuApprovalStatus === 'approved' ||
          ['in_progress', 'completed'].includes(input.eventStatus ?? '')
      )
    case 'pre_event_checklist':
      return Boolean(
        input.preEventChecklistConfirmedAt ||
          ['in_progress', 'completed'].includes(input.eventStatus ?? '')
      )
    case 'event_day':
      return hasReachedEventStatus(input.eventStatus, 'in_progress')
    case 'dinner_complete':
    case 'event_summary':
      return hasReachedEventStatus(input.eventStatus, 'completed')
    case 'share_review':
      return Boolean(input.hasReview)
    default:
      return false
  }
}

export function buildJourneySteps(input: JourneyStepInput): JourneyStep[] {
  const visibleSteps = buildStepDefinitions(input).filter((step) => !step.isSkipped)
  const cancelled = input.eventStatus === 'cancelled'

  let lastCompletedIndex = -1
  for (let index = 0; index < visibleSteps.length; index += 1) {
    if (visibleSteps[index].completedAt !== null) {
      lastCompletedIndex = index
    }
  }

  return visibleSteps.map((step, index) => ({
    ...step,
    isCurrent: !cancelled && step.completedAt === null && index === lastCompletedIndex + 1,
    isFuture: step.completedAt === null && index > lastCompletedIndex + 1,
  }))
}

export function getCurrentJourneyAction(input: JourneyStepInput): JourneyAction | null {
  if (input.eventStatus === 'cancelled') return null

  const steps = buildStepDefinitions(input)

  for (const step of steps) {
    if (step.isSkipped) continue
    if (hasReachedJourneyStep(step, input)) continue

    if (step.actionHref && step.actionLabel) {
      return {
        key: step.key,
        label: step.label,
        description: step.description,
        actionHref: step.actionHref,
        actionLabel: step.actionLabel,
      }
    }

    return null
  }

  return null
}
