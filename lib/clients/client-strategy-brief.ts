import type { ClientRelationshipSnapshot } from './relationship-snapshot'

export type ClientStrategySectionId =
  | 'immediate_actions'
  | 'data_to_collect'
  | 'automation_opportunities'
  | 'revenue_opportunities'
  | 'retention_opportunities'
  | 'risk_flags'

export type ClientStrategyPriority = 'critical' | 'high' | 'medium' | 'low'
export type ClientStrategyConfidence = 'high' | 'medium' | 'low'

export interface ClientStrategyRecommendation {
  id: string
  title: string
  priority: ClientStrategyPriority
  confidence: ClientStrategyConfidence
  dataUsed: string[]
  whyItMatters: string
  nextStep: string
  sourceLabels: string[]
  href?: string
}

export interface ClientStrategySection {
  id: ClientStrategySectionId
  title: string
  description: string
  recommendations: ClientStrategyRecommendation[]
}

export interface ClientStrategyBrief {
  clientId: string
  clientName: string
  generatedAt: string
  readiness: {
    score: number
    label: string
    blockers: string[]
  }
  summary: {
    immediateActionCount: number
    revenueOpportunityCount: number
    riskFlagCount: number
    missingDataCount: number
    knownPreferenceCount: number
    confidence: ClientStrategyConfidence
  }
  sections: ClientStrategySection[]
  callPrep: {
    openingContext: string
    agenda: string[]
    questions: string[]
    doNotAssume: string[]
  }
  dataQuality: {
    canonicalFacts: number
    learnedFacts: number
    operationalSignals: number
    staleSignals: string[]
    notes: string[]
  }
  outcomeLoop: string[]
}

export const CLIENT_STRATEGY_SECTION_ORDER: ClientStrategySectionId[] = [
  'immediate_actions',
  'data_to_collect',
  'automation_opportunities',
  'revenue_opportunities',
  'retention_opportunities',
  'risk_flags',
]

const SECTION_COPY: Record<
  ClientStrategySectionId,
  Omit<ClientStrategySection, 'recommendations'>
> = {
  immediate_actions: {
    id: 'immediate_actions',
    title: 'Immediate Actions',
    description:
      'The next practical moves to convert the lead, protect the booking, or improve the relationship now.',
  },
  data_to_collect: {
    id: 'data_to_collect',
    title: 'Data To Collect',
    description:
      'Missing or stale facts that should be confirmed before menu, pricing, or service decisions.',
  },
  automation_opportunities: {
    id: 'automation_opportunities',
    title: 'Automation Opportunities',
    description:
      'Repeatable workflows that reduce manual follow-up while keeping the chef in control.',
  },
  revenue_opportunities: {
    id: 'revenue_opportunities',
    title: 'Revenue Opportunities',
    description:
      'Ethical ways to improve package fit, timing, and add-on discovery from known client behavior.',
  },
  retention_opportunities: {
    id: 'retention_opportunities',
    title: 'Retention Opportunities',
    description:
      'Ways to deepen trust, improve responsiveness, and turn completed work into repeat bookings.',
  },
  risk_flags: {
    id: 'risk_flags',
    title: 'Risk Flags',
    description:
      'Operational, trust, communication, or data risks that can cause friction if ignored.',
  },
}

function hasText(value?: string | null): boolean {
  return Boolean(value && value.trim().length > 0)
}

function hasItems(value?: string[] | null): boolean {
  return Array.isArray(value) && value.some((item) => hasText(item))
}

function compact(values: Array<string | false | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value))
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function daysSince(value?: string | null): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
}

function missingProfileFacts(snapshot: ClientRelationshipSnapshot): string[] {
  const client = snapshot.client
  return compact([
    !hasText(client.email) && 'email',
    !hasText(client.phone) && 'phone',
    !hasText(client.preferred_contact_method) && 'preferred contact method',
    !hasItems(client.dietary_restrictions) && 'dietary restrictions',
    !hasItems(client.allergies) && 'allergies',
    !hasItems(client.favorite_cuisines) && 'favorite cuisines',
    !hasText(client.birthday) && 'birthday',
    !hasText(client.anniversary) && 'anniversary',
  ])
}

function knownPreferenceCount(snapshot: ClientRelationshipSnapshot): number {
  return [
    ...(snapshot.client.dietary_restrictions ?? []),
    ...(snapshot.client.allergies ?? []),
    ...(snapshot.client.favorite_cuisines ?? []),
    ...(snapshot.repeat?.lovedDishes ?? []),
    ...(snapshot.repeat?.dislikedDishes ?? []),
    ...snapshot.signals.canonical.map((signal) => signal.value),
  ].filter((item) => hasText(item)).length
}

function signalValues(snapshot: ClientRelationshipSnapshot, kinds: string[]): string[] {
  return snapshot.signals.canonical
    .filter((signal) => kinds.includes(signal.kind))
    .map((signal) => `${signal.label}: ${signal.value}`)
}

function profileHasDietarySafety(snapshot: ClientRelationshipSnapshot): boolean {
  return (
    hasItems(snapshot.client.dietary_restrictions) ||
    hasItems(snapshot.client.allergies) ||
    (snapshot.repeat?.allergens.some((allergen) => hasText(allergen.allergen)) ?? false) ||
    signalValues(snapshot, ['dietary_need', 'allergy']).length > 0
  )
}

function averageFeedbackOverall(snapshot: ClientRelationshipSnapshot): number | null {
  return snapshot.repeat?.averageFeedback.overall ?? null
}

function feedbackSummary(snapshot: ClientRelationshipSnapshot): string | null {
  const feedback = snapshot.repeat?.lastFeedback
  if (!feedback) return null
  return compact([
    feedback.overall !== null ? `Latest overall feedback: ${feedback.overall}` : null,
    feedback.whatTheyLoved ? `Loved: ${feedback.whatTheyLoved}` : null,
    feedback.whatCouldImprove ? `Could improve: ${feedback.whatCouldImprove}` : null,
    feedback.wouldBookAgain !== null
      ? `Would book again: ${feedback.wouldBookAgain ? 'yes' : 'no'}`
      : null,
  ]).join(' | ')
}

function confidenceFromSignals(count: number): ClientStrategyConfidence {
  if (count >= 3) return 'high'
  if (count >= 1) return 'medium'
  return 'low'
}

function dataConfidence(
  snapshot: ClientRelationshipSnapshot,
  missingFacts: string[]
): ClientStrategyConfidence {
  const preferenceCount = knownPreferenceCount(snapshot)
  const hasHistory = snapshot.history.length > 0 || (snapshot.repeat?.eventCount ?? 0) > 0
  const hasSignals = snapshot.signals.canonical.length > 0 || snapshot.signals.learned.length > 0

  if (missingFacts.length <= 2 && preferenceCount >= 3 && hasHistory) return 'high'
  if (missingFacts.length <= 5 && (hasHistory || hasSignals || preferenceCount > 0)) return 'medium'
  return 'low'
}

function readinessLabel(score: number): string {
  if (score >= 85) return 'Ready to personalize'
  if (score >= 65) return 'Useful with confirmations'
  if (score >= 40) return 'Needs client confirmation'
  return 'Too incomplete for confident strategy'
}

function priorityFromUrgency(urgency: string): ClientStrategyPriority {
  if (urgency === 'critical') return 'critical'
  if (urgency === 'high') return 'high'
  if (urgency === 'low') return 'low'
  return 'medium'
}

function pushRecommendation(
  map: Map<ClientStrategySectionId, ClientStrategyRecommendation[]>,
  sectionId: ClientStrategySectionId,
  recommendation: ClientStrategyRecommendation
): void {
  const section = map.get(sectionId)
  if (section) {
    section.push(recommendation)
  } else {
    map.set(sectionId, [recommendation])
  }
}

export function buildClientStrategyBrief(
  snapshot: ClientRelationshipSnapshot
): ClientStrategyBrief {
  const recommendations = new Map<ClientStrategySectionId, ClientStrategyRecommendation[]>()
  const client = snapshot.client
  const repeat = snapshot.repeat
  const health = snapshot.relationshipHealth
  const missingFacts = missingProfileFacts(snapshot)
  const confidence = dataConfidence(snapshot, missingFacts)
  const hasKnownSafety = profileHasDietarySafety(snapshot)
  const knownSignals = snapshot.signals.canonical.map(
    (signal) => `${signal.label}: ${signal.value}`
  )
  const hasMenuFeedback =
    (repeat?.lovedDishes.length ?? 0) > 0 ||
    (repeat?.dislikedDishes.length ?? 0) > 0 ||
    Boolean(feedbackSummary(snapshot))
  const lastEventDate = formatDate(repeat?.lastEventDate ?? null)
  const profileAgeDays = daysSince(client.updated_at)

  if (snapshot.nextAction) {
    const reasonMessages = snapshot.nextAction.reasons
      .map((reason) => reason.message)
      .filter((message) => hasText(message))

    pushRecommendation(recommendations, 'immediate_actions', {
      id: 'immediate-next-best-action',
      title: snapshot.nextAction.label,
      priority: priorityFromUrgency(snapshot.nextAction.urgency),
      confidence: confidenceFromSignals(reasonMessages.length),
      dataUsed: compact([
        `Action type: ${titleCase(snapshot.nextAction.actionType)}`,
        `Primary signal: ${titleCase(snapshot.nextAction.primarySignal)}`,
        snapshot.nextAction.description,
        ...reasonMessages.slice(0, 3),
      ]),
      whyItMatters: 'This is the highest-ranked current relationship move based on stored signals.',
      nextStep: snapshot.nextAction.description,
      sourceLabels: ['Next-best-action', 'Client action graph'],
      href: snapshot.nextAction.href,
    })
  }

  if (missingFacts.length > 0) {
    pushRecommendation(recommendations, 'data_to_collect', {
      id: 'complete-client-profile',
      title: 'Complete the client profile before making strategy decisions',
      priority:
        missingFacts.includes('allergies') || missingFacts.includes('dietary restrictions')
          ? 'high'
          : 'medium',
      confidence: 'high',
      dataUsed: [`Missing fields: ${missingFacts.join(', ')}`],
      whyItMatters: 'Personalization is only useful when it is anchored to confirmed client facts.',
      nextStep:
        'Ask the client to confirm the missing fields, then update the profile before proposal, menu, or follow-up work.',
      sourceLabels: ['Client profile'],
    })
  }

  if (!hasKnownSafety) {
    pushRecommendation(recommendations, 'risk_flags', {
      id: 'confirm-dietary-and-allergy-status',
      title: 'Dietary and allergy status is not confirmed',
      priority: 'critical',
      confidence: 'high',
      dataUsed: [
        'No dietary restrictions, allergies, allergen records, or safety signals are available.',
      ],
      whyItMatters:
        'Unknown restriction data creates avoidable service risk and weakens client trust.',
      nextStep: 'Confirm restrictions and allergies directly before any menu review or event prep.',
      sourceLabels: ['Client profile', 'Repeat intelligence', 'Client signal snapshot'],
    })
  }

  if (
    !hasItems(client.favorite_cuisines) &&
    (repeat?.lovedDishes.length ?? 0) === 0 &&
    knownSignals.length === 0
  ) {
    pushRecommendation(recommendations, 'data_to_collect', {
      id: 'capture-menu-preference-bounds',
      title: 'Capture preference bounds before menu personalization',
      priority: 'medium',
      confidence: 'high',
      dataUsed: [
        'No favorite cuisines, loved dishes, or relationship preference signals are available.',
      ],
      whyItMatters: 'Without confirmed preference data, menu personalization becomes guesswork.',
      nextStep:
        'Ask what styles, occasions, or prior dishes they liked or disliked, then record the answers as client facts.',
      sourceLabels: ['Client profile', 'Repeat intelligence', 'Client signal snapshot'],
    })
  }

  if (hasMenuFeedback || hasItems(client.favorite_cuisines) || knownSignals.length > 0) {
    pushRecommendation(recommendations, 'immediate_actions', {
      id: 'review-menu-fit-from-known-history',
      title: 'Review menu fit against known preferences and restrictions',
      priority: hasKnownSafety ? 'high' : 'medium',
      confidence,
      dataUsed: compact([
        hasItems(client.favorite_cuisines)
          ? `Favorite cuisines: ${client.favorite_cuisines?.join(', ')}`
          : null,
        (repeat?.lovedDishes.length ?? 0) > 0
          ? `Loved dishes: ${repeat?.lovedDishes.join(', ')}`
          : null,
        (repeat?.dislikedDishes.length ?? 0) > 0
          ? `Disliked dishes: ${repeat?.dislikedDishes.join(', ')}`
          : null,
        knownSignals.length > 0
          ? `Relationship signals: ${knownSignals.slice(0, 3).join(', ')}`
          : null,
      ]),
      whyItMatters:
        'The chef can personalize service by screening planned menus against confirmed facts instead of inventing new preferences.',
      nextStep:
        'Compare any proposed menu or existing saved options against the known likes, dislikes, restrictions, and feedback before sending.',
      sourceLabels: ['Client profile', 'Repeat intelligence', 'Client signal snapshot'],
    })
  }

  if (health?.churnRisk.level === 'high' || health?.churnRisk.level === 'critical') {
    const factors =
      health.churnRisk.factors.length > 0 ? health.churnRisk.factors : ['Churn score is elevated.']
    pushRecommendation(recommendations, 'risk_flags', {
      id: 'relationship-churn-risk',
      title: `${titleCase(health.churnRisk.level)} churn risk is present`,
      priority: health.churnRisk.level === 'critical' ? 'critical' : 'high',
      confidence: confidenceFromSignals(factors.length),
      dataUsed: compact([
        `Churn score: ${health.churnRisk.score}`,
        health.churnRisk.daysSinceLastEvent !== null
          ? `${health.churnRisk.daysSinceLastEvent} days since last event`
          : null,
        ...factors,
      ]),
      whyItMatters:
        'A high-risk relationship needs timely, specific outreach before the client goes cold.',
      nextStep:
        'Schedule a specific check-in that references known history and asks what the client needs next.',
      sourceLabels: ['Relationship health'],
    })

    pushRecommendation(recommendations, 'automation_opportunities', {
      id: 'automate-reengagement-reminder',
      title: 'Create a re-engagement reminder',
      priority: 'high',
      confidence: confidenceFromSignals(factors.length),
      dataUsed: factors,
      whyItMatters:
        'The risk signal is already known, so the manual burden is remembering to act on time.',
      nextStep:
        'Schedule a dated follow-up task with the recommended action and require chef approval before any message is sent.',
      sourceLabels: ['Relationship health'],
    })
  }

  if (health?.revenueTrajectory.trend === 'declining') {
    pushRecommendation(recommendations, 'revenue_opportunities', {
      id: 'review-declining-revenue-fit',
      title: 'Review package fit because revenue is declining',
      priority: 'high',
      confidence: confidenceFromSignals(health.insights.length),
      dataUsed: compact([
        `Revenue trend: ${health.revenueTrajectory.trend}`,
        health.revenueTrajectory.lastEventValueCents !== null
          ? 'Last event value is available.'
          : null,
        ...health.insights,
      ]),
      whyItMatters:
        'A declining spend pattern may indicate mismatch, reduced frequency, or missed package alignment.',
      nextStep:
        'Before pitching upgrades, compare the last proposal, invoice, event scope, and feedback to find the actual cause.',
      sourceLabels: ['Relationship health'],
    })
  }

  if (repeat?.isRepeat && repeat.eventCount > 1) {
    pushRecommendation(recommendations, 'retention_opportunities', {
      id: 'acknowledge-repeat-relationship',
      title: 'Use the repeat history to make outreach feel remembered',
      priority: 'medium',
      confidence: 'high',
      dataUsed: compact([
        `${repeat.eventCount} events on record`,
        lastEventDate ? `Last event: ${lastEventDate}` : null,
        averageFeedbackOverall(snapshot) !== null
          ? `Average feedback: ${averageFeedbackOverall(snapshot)?.toFixed(1)}`
          : null,
      ]),
      whyItMatters:
        'Repeat clients should not feel like first-time leads when the relationship history is already known.',
      nextStep:
        'Reference the confirmed prior booking context and ask one specific follow-up question tied to their history.',
      sourceLabels: ['Repeat intelligence', 'Relationship timeline'],
    })
  }

  if (
    (repeat?.averageSpendCents ?? 0) > 0 ||
    (health?.revenueTrajectory.lifetimeValueCents ?? 0) > 0
  ) {
    pushRecommendation(recommendations, 'revenue_opportunities', {
      id: 'right-size-package-from-spend-history',
      title: 'Right-size the next package from real spend history',
      priority: 'medium',
      confidence: (repeat?.completedEventCount ?? 0) > 0 ? 'high' : 'medium',
      dataUsed: compact([
        (repeat?.averageSpendCents ?? 0) > 0
          ? 'Average spend is stored for completed events.'
          : null,
        (health?.revenueTrajectory.lifetimeValueCents ?? 0) > 0
          ? 'Lifetime value is available in relationship intelligence.'
          : null,
        health?.revenueTrajectory.eventsPerYear
          ? `${health.revenueTrajectory.eventsPerYear} events per year in relationship intelligence.`
          : null,
      ]),
      whyItMatters:
        'Pricing conversations are cleaner when the chef anchors options to the client’s demonstrated booking pattern.',
      nextStep:
        'Offer a base option that matches prior scope, then present clearly labeled add-ons only when they fit the client’s known occasion or service pattern.',
      sourceLabels: ['Repeat intelligence', 'Relationship health'],
    })
  }

  if (health?.rebookingPrediction.likelyToRebook) {
    pushRecommendation(recommendations, 'revenue_opportunities', {
      id: 'timed-rebooking-follow-up',
      title: 'Time a rebooking follow-up while likelihood is high',
      priority: 'high',
      confidence: confidenceFromSignals(health.insights.length),
      dataUsed: compact([
        'Relationship intelligence marks this client as likely to rebook.',
        health.rebookingPrediction.predictedNextBookingDays !== null
          ? `Predicted next booking in ${health.rebookingPrediction.predictedNextBookingDays} days`
          : null,
        health.rebookingPrediction.seasonalPattern
          ? `Seasonal pattern: ${health.rebookingPrediction.seasonalPattern}`
          : null,
        health.rebookingPrediction.preferredOccasion
          ? `Preferred occasion: ${health.rebookingPrediction.preferredOccasion}`
          : null,
      ]),
      whyItMatters: 'The best revenue opportunity may be timing, not pressure.',
      nextStep:
        'Schedule a timely check-in around the predicted booking window and keep the ask specific to known patterns.',
      sourceLabels: ['Relationship health'],
    })
  }

  const latestFeedback = feedbackSummary(snapshot)
  if (latestFeedback) {
    pushRecommendation(recommendations, 'retention_opportunities', {
      id: 'close-loop-on-feedback',
      title: 'Close the loop on the latest feedback',
      priority:
        averageFeedbackOverall(snapshot) !== null && Number(averageFeedbackOverall(snapshot)) < 4
          ? 'high'
          : 'medium',
      confidence: 'high',
      dataUsed: [latestFeedback],
      whyItMatters:
        'Acknowledging known feedback builds trust and prevents repeated service misses.',
      nextStep:
        'Reference the feedback, state the operational adjustment, and confirm whether the next service should change.',
      sourceLabels: ['Repeat intelligence'],
    })
  } else if ((repeat?.completedEventCount ?? 0) > 0) {
    pushRecommendation(recommendations, 'automation_opportunities', {
      id: 'request-post-event-feedback',
      title: 'Add a post-event feedback request',
      priority: 'medium',
      confidence: 'high',
      dataUsed: [
        `${repeat?.completedEventCount ?? 0} completed events exist without latest feedback text.`,
      ],
      whyItMatters: 'Feedback is the safest source for future menu and service improvement.',
      nextStep:
        'Queue a chef-approved feedback request after completed events and store the response on the relationship timeline.',
      sourceLabels: ['Repeat intelligence'],
    })
  }

  if (snapshot.outreachHistory.length > 0) {
    pushRecommendation(recommendations, 'retention_opportunities', {
      id: 'continue-best-contact-channel',
      title: 'Use known communication history to reduce friction',
      priority: 'medium',
      confidence: hasText(client.preferred_contact_method) ? 'high' : 'medium',
      dataUsed: compact([
        `${snapshot.outreachHistory.length} outreach records are available.`,
        client.preferred_contact_method
          ? `Preferred contact: ${client.preferred_contact_method}`
          : null,
      ]),
      whyItMatters:
        'Clients are easier to retain when follow-up happens through the channel and cadence already proven in the relationship.',
      nextStep:
        'Use the preferred contact method when confirmed, otherwise review recent outreach before choosing the next channel.',
      sourceLabels: ['Outreach history', 'Client profile'],
    })
  } else {
    pushRecommendation(recommendations, 'data_to_collect', {
      id: 'start-communication-history',
      title: 'Start tracking communication history',
      priority: 'medium',
      confidence: 'high',
      dataUsed: ['No outreach history is available for this client.'],
      whyItMatters:
        'Without communication history, follow-up timing and tone are hard to improve repeatably.',
      nextStep: 'Log the next client touch with channel, purpose, outcome, and required follow-up.',
      sourceLabels: ['Outreach history'],
    })
  }

  if (client.birthday || client.anniversary || (repeat?.upcomingMilestones.length ?? 0) > 0) {
    pushRecommendation(recommendations, 'automation_opportunities', {
      id: 'milestone-reminder-workflow',
      title: 'Create milestone reminders from confirmed dates',
      priority: 'medium',
      confidence: 'high',
      dataUsed: compact([
        client.birthday ? 'Birthday is on file.' : null,
        client.anniversary ? 'Anniversary is on file.' : null,
        (repeat?.upcomingMilestones.length ?? 0) > 0
          ? `${repeat?.upcomingMilestones.length ?? 0} upcoming milestones are available.`
          : null,
      ]),
      whyItMatters:
        'Milestone outreach is useful only when the date is confirmed and the message is approved.',
      nextStep: 'Create reminders that surface a draft for chef review before sending.',
      sourceLabels: ['Client profile', 'Repeat intelligence'],
    })
  }

  if (repeat?.lastVenueNotes) {
    pushRecommendation(recommendations, 'risk_flags', {
      id: 'review-last-venue-notes',
      title: 'Review venue notes before the next booking',
      priority: 'medium',
      confidence: 'high',
      dataUsed: compact([
        repeat.lastVenueNotes.kitchen_notes ? 'Kitchen notes are available.' : null,
        repeat.lastVenueNotes.site_notes ? 'Site notes are available.' : null,
        repeat.lastVenueNotes.location ? `Location: ${repeat.lastVenueNotes.location}` : null,
      ]),
      whyItMatters:
        'Venue friction often becomes service friction if prep, access, timing, or equipment notes are missed.',
      nextStep:
        'Read the last venue notes during event prep and turn any unresolved item into an operations task.',
      sourceLabels: ['Repeat intelligence'],
    })
  }

  if (profileAgeDays !== null && profileAgeDays > 180) {
    pushRecommendation(recommendations, 'risk_flags', {
      id: 'profile-may-be-stale',
      title: 'Profile data may be stale',
      priority: 'medium',
      confidence: 'high',
      dataUsed: [`Client profile was last updated ${profileAgeDays} days ago.`],
      whyItMatters: 'Preferences, contact details, and dietary needs can change over time.',
      nextStep: 'Confirm the profile before relying on it for a new proposal or event.',
      sourceLabels: ['Client profile'],
    })
  }

  if (
    snapshot.nextAction?.actionType === 'follow_up_quote' ||
    snapshot.nextAction?.actionType === 'quote_revision'
  ) {
    pushRecommendation(recommendations, 'automation_opportunities', {
      id: 'quote-follow-up-workflow',
      title: 'Automate quote follow-up timing with chef approval',
      priority: 'high',
      confidence: confidenceFromSignals(snapshot.nextAction.reasons.length),
      dataUsed: [`Next action is ${titleCase(snapshot.nextAction.actionType)}.`],
      whyItMatters:
        'Quote momentum is time-sensitive, but the message should still reflect the actual proposal context.',
      nextStep:
        'Queue a follow-up reminder with the quote link, due date, and editable message draft.',
      sourceLabels: ['Next-best-action'],
      href: snapshot.nextAction.href,
    })
  }

  const riskCount = recommendations.get('risk_flags')?.length ?? 0
  const blockerMessages = compact([
    !hasKnownSafety && 'Confirm dietary and allergy status',
    missingFacts.length > 4 && 'Complete core profile fields',
    riskCount > 2 && 'Review active risk flags',
    confidence === 'low' && 'Collect more confirmed client facts',
  ])
  const readinessScore = Math.max(
    10,
    Math.min(
      100,
      100 -
        missingFacts.length * 6 -
        riskCount * 8 -
        (confidence === 'low' ? 20 : confidence === 'medium' ? 8 : 0) +
        Math.min(15, knownPreferenceCount(snapshot) * 2)
    )
  )

  const callPrepQuestions = compact([
    !hasKnownSafety &&
      'Can you confirm current allergies, dietary restrictions, and any guest needs?',
    !hasItems(client.favorite_cuisines) &&
      (repeat?.lovedDishes.length ?? 0) === 0 &&
      'What prior meals or service styles should I keep in mind?',
    !hasText(client.preferred_contact_method) &&
      'What is the best way to reach you for time-sensitive details?',
    health?.rebookingPrediction.likelyToRebook &&
      'Is there another occasion or date you already have in mind?',
    latestFeedback && 'Did the last feedback still reflect what you want for the next service?',
  ])

  const sections = CLIENT_STRATEGY_SECTION_ORDER.map((id) => ({
    ...SECTION_COPY[id],
    recommendations: recommendations.get(id) ?? [],
  }))

  return {
    clientId: client.id,
    clientName: client.full_name,
    generatedAt: new Date().toISOString(),
    readiness: {
      score: readinessScore,
      label: readinessLabel(readinessScore),
      blockers: blockerMessages,
    },
    summary: {
      immediateActionCount: recommendations.get('immediate_actions')?.length ?? 0,
      revenueOpportunityCount: recommendations.get('revenue_opportunities')?.length ?? 0,
      riskFlagCount: riskCount,
      missingDataCount: missingFacts.length,
      knownPreferenceCount: knownPreferenceCount(snapshot),
      confidence,
    },
    sections,
    callPrep: {
      openingContext: repeat?.isRepeat
        ? `${client.full_name} has ${repeat.eventCount} event${repeat.eventCount === 1 ? '' : 's'} in relationship history${lastEventDate ? `, most recently on ${lastEventDate}` : ''}.`
        : `${client.full_name} does not yet have enough completed history for repeat-client assumptions.`,
      agenda: compact([
        snapshot.nextAction ? snapshot.nextAction.label : 'Confirm current client goal and timing.',
        missingFacts.length > 0
          ? 'Confirm missing profile details before menu or pricing decisions.'
          : 'Confirm stored preferences are still accurate.',
        'Review known preferences, restrictions, service notes, and feedback.',
        'Agree on the next operational step and follow-up date.',
      ]),
      questions:
        callPrepQuestions.length > 0
          ? callPrepQuestions
          : ['What has changed since the last time we planned service together?'],
      doNotAssume: compact([
        !hasKnownSafety && 'Do not assume no allergies or restrictions because none are stored.',
        !hasItems(client.favorite_cuisines) &&
          'Do not infer cuisine preferences without confirmed profile or history data.',
        !repeat?.isRepeat &&
          'Do not present this client as a repeat client without completed history.',
        'Do not generate new menu items or recipes from the strategy brief.',
      ]),
    },
    dataQuality: {
      canonicalFacts: [
        client.email,
        client.phone,
        client.preferred_contact_method,
        client.birthday,
        client.anniversary,
        ...(client.dietary_restrictions ?? []),
        ...(client.allergies ?? []),
        ...(client.favorite_cuisines ?? []),
      ].filter((item) => hasText(item)).length,
      learnedFacts: snapshot.signals.learned.length + snapshot.signals.secondaryLearned.length,
      operationalSignals: snapshot.history.length + snapshot.outreachHistory.length,
      staleSignals: compact([
        profileAgeDays !== null && profileAgeDays > 180
          ? `Profile last updated ${profileAgeDays} days ago.`
          : null,
        (repeat?.daysSinceLastEvent ?? null) !== null && Number(repeat?.daysSinceLastEvent) > 365
          ? `Last event was ${repeat?.daysSinceLastEvent} days ago.`
          : null,
      ]),
      notes: compact([
        confidence === 'low' &&
          'Strategy confidence is low because confirmed client facts are sparse.',
        hasMenuFeedback && 'Menu review can use existing feedback and known likes or dislikes.',
        !hasMenuFeedback &&
          'Menu improvement should wait for confirmed preference or feedback data.',
      ]),
    },
    outcomeLoop: [
      'After each client touch, record the channel, decision, open question, next owner, and due date.',
      'After each proposal, record which package, add-ons, and pricing options were accepted, declined, or questioned.',
      'After each event, record feedback, service friction, venue notes, actual spend, and any preference changes.',
      'Use the next strategy brief to compare what changed instead of restarting from memory.',
    ],
  }
}
