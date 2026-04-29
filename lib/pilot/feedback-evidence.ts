export type PilotProofStatus =
  | 'usage_incomplete'
  | 'feedback_missing'
  | 'pay_intent_missing'
  | 'pay_intent_not_validated'
  | 'pilot_proof_ready'

export type PilotMissingEvidenceKey =
  | 'real_chef_two_weeks'
  | 'workflow_activity'
  | 'booking_loop'
  | 'event_money_loop'
  | 'feedback'
  | 'pay_intent'

export type PilotPayIntentSignal = 'none' | 'pricing_objection' | 'negative' | 'positive' | 'paid'

export type PilotMissingEvidence = {
  key: PilotMissingEvidenceKey
  label: string
}

export type PilotUsageEvidenceInput = {
  activeSpanDays?: number
  inquiries?: number
  publicBookingTests?: number
  sentQuotes?: number
  events?: number
  prepSignals?: number
  invoiceArtifacts?: number
}

export type PilotFeedbackSourceInput = {
  completedSurveys?: number
  loggedChefFeedback?: number
  operatorInterviews?: number
  clientTestimonials?: number
  otherFeedback?: number
}

export type PilotPayIntentInput = {
  willingToPay?: number
  paidPilots?: number
  declinedToPay?: number
  pricingObjections?: number
}

export type PilotFeedbackEvidenceInput = {
  usage?: PilotUsageEvidenceInput
  feedback?: PilotFeedbackSourceInput
  payIntent?: PilotPayIntentInput
}

export type PilotFeedbackSourceCounts = Required<PilotFeedbackSourceInput> & {
  total: number
}

export type PilotFeedbackEvidenceProof = {
  status: PilotProofStatus
  missingEvidence: PilotMissingEvidence[]
  feedbackSourceCounts: PilotFeedbackSourceCounts
  payIntentSignal: PilotPayIntentSignal
  nextAction: string
}

const missingEvidenceLabels: Record<PilotMissingEvidenceKey, string> = {
  real_chef_two_weeks: 'Real chef has 14 calendar days of usage',
  workflow_activity: 'Real workflow activity exists',
  booking_loop: 'Inquiry, public booking test, and sent quote exist',
  event_money_loop: 'Event and invoice artifact exist',
  feedback: 'Feedback evidence exists',
  pay_intent: 'Pay intent evidence exists',
}

function count(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

function missing(key: PilotMissingEvidenceKey): PilotMissingEvidence {
  return {
    key,
    label: missingEvidenceLabels[key],
  }
}

function getFeedbackSourceCounts(input: PilotFeedbackSourceInput = {}): PilotFeedbackSourceCounts {
  const completedSurveys = count(input.completedSurveys)
  const loggedChefFeedback = count(input.loggedChefFeedback)
  const operatorInterviews = count(input.operatorInterviews)
  const clientTestimonials = count(input.clientTestimonials)
  const otherFeedback = count(input.otherFeedback)

  return {
    completedSurveys,
    loggedChefFeedback,
    operatorInterviews,
    clientTestimonials,
    otherFeedback,
    total:
      completedSurveys +
      loggedChefFeedback +
      operatorInterviews +
      clientTestimonials +
      otherFeedback,
  }
}

function getPayIntentSignal(input: PilotPayIntentInput = {}): PilotPayIntentSignal {
  if (count(input.paidPilots) > 0) return 'paid'
  if (count(input.willingToPay) > 0) return 'positive'
  if (count(input.pricingObjections) > 0) return 'pricing_objection'
  if (count(input.declinedToPay) > 0) return 'negative'
  return 'none'
}

function getNextAction(input: {
  status: PilotProofStatus
  missingEvidence: PilotMissingEvidence[]
  payIntentSignal: PilotPayIntentSignal
}): string {
  const firstMissing = input.missingEvidence[0]?.key

  if (firstMissing === 'real_chef_two_weeks') {
    return 'Run one real chef through 14 calendar days of ChefFlow usage.'
  }
  if (firstMissing === 'workflow_activity') {
    return 'Capture at least one real workflow activity from the pilot chef.'
  }
  if (firstMissing === 'booking_loop') {
    return 'Capture inquiry, public booking test, and sent quote evidence.'
  }
  if (firstMissing === 'event_money_loop') {
    return 'Complete one event with an invoice artifact.'
  }
  if (firstMissing === 'feedback') {
    return 'Collect a completed survey, logged feedback item, interview note, or testimonial.'
  }
  if (firstMissing === 'pay_intent') {
    return 'Record whether the pilot would pay or has paid for ChefFlow.'
  }
  if (input.payIntentSignal === 'pricing_objection') {
    return 'Follow up on the pricing objection before treating the pilot as validated.'
  }
  if (input.payIntentSignal === 'negative') {
    return 'Do not count this pilot as pay validated. Interview for failure reasons.'
  }
  return 'Review the proof packet and decide whether this pilot can support launch.'
}

export function buildPilotFeedbackEvidenceProof(
  input: PilotFeedbackEvidenceInput
): PilotFeedbackEvidenceProof {
  const usage = input.usage ?? {}
  const feedbackSourceCounts = getFeedbackSourceCounts(input.feedback)
  const payIntentSignal = getPayIntentSignal(input.payIntent)
  const missingEvidence: PilotMissingEvidence[] = []

  const activeSpanDays = count(usage.activeSpanDays)
  const inquiries = count(usage.inquiries)
  const publicBookingTests = count(usage.publicBookingTests)
  const sentQuotes = count(usage.sentQuotes)
  const events = count(usage.events)
  const prepSignals = count(usage.prepSignals)
  const invoiceArtifacts = count(usage.invoiceArtifacts)
  const workflowActivity =
    inquiries + publicBookingTests + sentQuotes + events + prepSignals + invoiceArtifacts

  if (activeSpanDays < 14) {
    missingEvidence.push(missing('real_chef_two_weeks'))
  }
  if (workflowActivity === 0) {
    missingEvidence.push(missing('workflow_activity'))
  }
  if (inquiries === 0 || publicBookingTests === 0 || sentQuotes === 0) {
    missingEvidence.push(missing('booking_loop'))
  }
  if (events === 0 || invoiceArtifacts === 0) {
    missingEvidence.push(missing('event_money_loop'))
  }
  if (feedbackSourceCounts.total === 0) {
    missingEvidence.push(missing('feedback'))
  }
  if (payIntentSignal === 'none') {
    missingEvidence.push(missing('pay_intent'))
  }

  const usageMissing = missingEvidence.some((item) =>
    ['real_chef_two_weeks', 'workflow_activity', 'booking_loop', 'event_money_loop'].includes(
      item.key
    )
  )
  let status: PilotProofStatus

  if (usageMissing) {
    status = 'usage_incomplete'
  } else if (feedbackSourceCounts.total === 0) {
    status = 'feedback_missing'
  } else if (payIntentSignal === 'none') {
    status = 'pay_intent_missing'
  } else if (payIntentSignal === 'pricing_objection' || payIntentSignal === 'negative') {
    status = 'pay_intent_not_validated'
  } else {
    status = 'pilot_proof_ready'
  }

  return {
    status,
    missingEvidence,
    feedbackSourceCounts,
    payIntentSignal,
    nextAction: getNextAction({ status, missingEvidence, payIntentSignal }),
  }
}
