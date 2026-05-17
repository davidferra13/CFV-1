// Service Lifecycle Stage Detector
// Pure deterministic detection logic. No DB calls, no side effects.
// Feeds the CIL with stage awareness for each client relationship.

export type LifecycleStage =
  | 'inquiry'
  | 'discovery'
  | 'proposal'
  | 'booking'
  | 'planning'
  | 'pre_service'
  | 'service_day'
  | 'post_service'
  | 'retention'
  | 'dormant'

export interface LifecycleContext {
  tenantId: string
  clientId: string
  latestEventStatus?: string | null
  latestEventDate?: string | null
  lastInboundMessageDate?: string | null
  lastOutboundMessageDate?: string | null
  hasUnrespondedInquiry?: boolean
  hasUnpaidInvoice?: boolean
  hasPendingQuote?: boolean
  depositPaid?: boolean
  daysSinceLastEvent?: number | null
  daysSinceLastContact?: number | null
  daysUntilNextEvent?: number | null
}

export interface LifecycleDetection {
  stage: LifecycleStage
  confidence: number
  evidence: string[]
  suggestedActions: string[]
  transitionLikelihood?: {
    nextStage: LifecycleStage
    probability: number
    trigger: string
  }
}

// ── Detection Logic ────────────────────────────────────────────────────────

export function detectLifecycleStage(context: LifecycleContext): LifecycleDetection {
  const daysUntilNext = context.daysUntilNextEvent ?? null
  const daysSinceEvent = context.daysSinceLastEvent ?? null
  const daysSinceContact = context.daysSinceLastContact ?? null

  // SERVICE_DAY: event is today
  if (daysUntilNext === 0) {
    return {
      stage: 'service_day',
      confidence: 0.98,
      evidence: ['Event scheduled for today'],
      suggestedActions: [
        'Confirm all prep is complete',
        'Check equipment and transport',
        'Send arrival time to client',
      ],
      transitionLikelihood: {
        nextStage: 'post_service',
        probability: 0.95,
        trigger: 'Event completion',
      },
    }
  }

  // PRE_SERVICE: event 1-2 days away
  if (daysUntilNext !== null && daysUntilNext >= 1 && daysUntilNext <= 2) {
    return {
      stage: 'pre_service',
      confidence: 0.95,
      evidence: [`Event in ${daysUntilNext} day(s)`],
      suggestedActions: [
        'Final shopping run',
        'Pack equipment',
        'Confirm logistics with client',
        'Review prep timeline',
      ],
      transitionLikelihood: {
        nextStage: 'service_day',
        probability: 0.9,
        trigger: 'Day of event arrives',
      },
    }
  }

  // POST_SERVICE: event completed within last 7 days
  if (
    context.latestEventStatus === 'completed' &&
    daysSinceEvent !== null &&
    daysSinceEvent >= 0 &&
    daysSinceEvent <= 7
  ) {
    return {
      stage: 'post_service',
      confidence: 0.9,
      evidence: [
        `Event completed ${daysSinceEvent} day(s) ago`,
        'Within post-service follow-up window',
      ],
      suggestedActions: [
        'Send thank-you note',
        'Request feedback or review',
        'Log debrief notes',
        'Send leftover care instructions if applicable',
      ],
      transitionLikelihood: {
        nextStage: 'retention',
        probability: 0.75,
        trigger: 'Follow-up completed, 7+ days pass',
      },
    }
  }

  // PLANNING: deposit paid, event > 2 days away
  if (context.depositPaid && daysUntilNext !== null && daysUntilNext > 2) {
    return {
      stage: 'planning',
      confidence: 0.88,
      evidence: ['Deposit paid', `Event in ${daysUntilNext} days`],
      suggestedActions: [
        'Finalize menu selections',
        'Build prep timeline',
        'Confirm guest count and dietary needs',
        'Source specialty ingredients',
      ],
      transitionLikelihood: {
        nextStage: 'pre_service',
        probability: 0.85,
        trigger: 'Event date approaches (2 days out)',
      },
    }
  }

  // BOOKING: event confirmed but no deposit yet
  if (
    context.latestEventStatus &&
    ['confirmed', 'accepted', 'paid'].includes(context.latestEventStatus) &&
    !context.depositPaid &&
    daysUntilNext !== null &&
    daysUntilNext > 2
  ) {
    return {
      stage: 'booking',
      confidence: 0.82,
      evidence: [`Event status: ${context.latestEventStatus}`, 'No deposit recorded yet'],
      suggestedActions: [
        'Send deposit invoice',
        'Confirm payment method',
        'Lock in the date on calendar',
      ],
      transitionLikelihood: {
        nextStage: 'planning',
        probability: 0.8,
        trigger: 'Deposit payment received',
      },
    }
  }

  // PROPOSAL: pending quote, no deposit
  if (context.hasPendingQuote && !context.depositPaid) {
    const evidence = ['Pending quote awaiting client response']
    let confidence = 0.85
    if (context.latestEventStatus === 'proposed') {
      evidence.push('Event in proposed status')
      confidence = 0.92
    }
    return {
      stage: 'proposal',
      confidence,
      evidence,
      suggestedActions: [
        'Follow up if no response in 3-5 days',
        'Prepare alternative options if needed',
        'Check if client has questions',
      ],
      transitionLikelihood: {
        nextStage: 'booking',
        probability: 0.6,
        trigger: 'Client accepts proposal',
      },
    }
  }

  // INQUIRY: unresponded inquiry, no event yet
  if (context.hasUnrespondedInquiry) {
    const evidence = ['Unresponded inquiry from client']
    let confidence = 0.88
    if (!context.latestEventStatus) {
      evidence.push('No prior events with this client')
      confidence = 0.93
    }
    return {
      stage: 'inquiry',
      confidence,
      evidence,
      suggestedActions: [
        'Respond within 24 hours',
        'Ask about occasion, date, guest count',
        'Share availability',
      ],
      transitionLikelihood: {
        nextStage: 'discovery',
        probability: 0.7,
        trigger: 'Chef responds and conversation begins',
      },
    }
  }

  // DISCOVERY: recent contact, no quote yet, event in draft
  if (
    context.latestEventStatus === 'draft' &&
    daysSinceContact !== null &&
    daysSinceContact <= 14 &&
    !context.hasPendingQuote
  ) {
    return {
      stage: 'discovery',
      confidence: 0.78,
      evidence: [
        'Event in draft status',
        `Last contact ${daysSinceContact} days ago`,
        'No quote sent yet',
      ],
      suggestedActions: [
        'Gather dietary restrictions and preferences',
        'Discuss budget range',
        'Prepare menu options to propose',
      ],
      transitionLikelihood: {
        nextStage: 'proposal',
        probability: 0.7,
        trigger: 'Quote/menu proposal sent',
      },
    }
  }

  // DORMANT: no event, no contact > 90 days
  if (
    daysSinceContact !== null &&
    daysSinceContact > 90 &&
    (daysSinceEvent === null || daysSinceEvent > 90)
  ) {
    return {
      stage: 'dormant',
      confidence: 0.8,
      evidence: [
        `No contact in ${daysSinceContact} days`,
        daysSinceEvent !== null ? `Last event ${daysSinceEvent} days ago` : 'No prior events',
      ],
      suggestedActions: [
        'Send seasonal menu update',
        'Share a personal check-in',
        'Offer a returning-client incentive',
      ],
      transitionLikelihood: {
        nextStage: 'inquiry',
        probability: 0.2,
        trigger: 'Client reaches out or responds to outreach',
      },
    }
  }

  // RETENTION: event completed 7-90 days ago with some communication
  if (daysSinceEvent !== null && daysSinceEvent > 7 && daysSinceEvent <= 90) {
    const hasRecentContact = daysSinceContact !== null && daysSinceContact <= 30
    const confidence = hasRecentContact ? 0.82 : 0.65
    const evidence = [`Last event ${daysSinceEvent} days ago`]
    if (hasRecentContact) {
      evidence.push('Active communication within 30 days')
    }
    return {
      stage: 'retention',
      confidence,
      evidence,
      suggestedActions: [
        'Share upcoming availability or seasonal menus',
        'Ask about upcoming occasions',
        'Maintain relationship with periodic touchpoints',
      ],
      transitionLikelihood: {
        nextStage: daysSinceEvent > 60 ? 'dormant' : 'inquiry',
        probability: daysSinceEvent > 60 ? 0.4 : 0.5,
        trigger: daysSinceEvent > 60 ? 'No contact for 90+ days total' : 'Client books new event',
      },
    }
  }

  // FALLBACK: insufficient data to determine stage
  return {
    stage: 'inquiry',
    confidence: 0.3,
    evidence: ['Insufficient signals to determine lifecycle stage'],
    suggestedActions: ['Review client history', 'Check for pending communications'],
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function getStageLabel(stage: LifecycleStage): string {
  const labels: Record<LifecycleStage, string> = {
    inquiry: 'Inquiry',
    discovery: 'Discovery',
    proposal: 'Proposal',
    booking: 'Booking',
    planning: 'Planning',
    pre_service: 'Pre-Service',
    service_day: 'Service Day',
    post_service: 'Post-Service',
    retention: 'Retention',
    dormant: 'Dormant',
  }
  return labels[stage]
}

export function getStageIndex(stage: LifecycleStage): number {
  const order: LifecycleStage[] = [
    'inquiry',
    'discovery',
    'proposal',
    'booking',
    'planning',
    'pre_service',
    'service_day',
    'post_service',
    'retention',
    'dormant',
  ]
  return order.indexOf(stage)
}

export function isForwardTransition(prev: LifecycleStage, current: LifecycleStage): boolean {
  if (prev === 'dormant') return true
  if (prev === 'retention' && current === 'inquiry') return true
  return getStageIndex(current) > getStageIndex(prev)
}
