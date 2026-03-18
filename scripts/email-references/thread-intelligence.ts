/**
 * Thread-level intelligence aggregation.
 *
 * Stitches per-email extractions into unified conversation records.
 * Detects lifecycle stages, outcomes, and computes response metrics.
 * All stage/outcome detection is deterministic (no Ollama).
 */

import type {
  ThreadIntelligence,
  ThreadStage,
  ThreadOutcome,
  EmailExtraction,
  DeterministicFields,
  OllamaEnrichedFields,
  FollowUpFields,
  OutboundAnalysis,
} from './extraction-types.ts'

// ─── Types ──────────────────────────────────────────────────────────────

export interface ThreadMessage {
  message_id: string
  from_email: string
  date: string
  subject: string
  body: string
  category: string // GoldmineCategory
}

interface StageEntry {
  stage: ThreadStage
  entered_at: string
  message_id: string
}

// ─── Stage Detection (deterministic) ────────────────────────────────────

const PRICING_PATTERNS = /\b(?:\$[\d,]+|cost|rate|quote|budget|pricing|per\s*person|pp|charge)\b/i
const CONFIRMATION_PATTERNS =
  /\b(?:confirmed|booked|looking\s+forward\s+to\s+(?:cooking|seeing|the)|see\s+you\s+(?:then|there|on|at|soon)|deposit|let'?s\s+(?:do\s+it|go\s+for\s+it|make\s+it\s+happen))\b/i
const LOGISTICS_PATTERNS =
  /\b(?:address|parking|arrive|arrival\s+time|directions|what\s+time|door\s+code|gate\s+code|key(?:pad)?|bring|setup|kitchen|equipment)\b/i
const DECLINE_PATTERNS =
  /\b(?:unfortunately|won'?t\s+be\s+able|have\s+to\s+cancel|cancel(?:ling|lation)|pass\s+on|not\s+(?:going\s+to|available)|change\s+(?:of|our)\s+plans|decided\s+(?:not\s+to|against))\b/i
const GRATITUDE_PATTERNS =
  /\b(?:thank\s+you\s+(?:so\s+much|again)\s+for|amazing\s+(?:meal|dinner|evening)|remarkable|outstanding|incredible|wonderful\s+(?:time|evening|meal)|every\s+single\s+bite)\b/i

function detectStageForMessage(
  msg: ThreadMessage,
  isOutbound: boolean,
  priorStages: StageEntry[],
  extraction: EmailExtraction | undefined
): ThreadStage | null {
  const body = msg.body.slice(0, 3000).toLowerCase()
  const subject = msg.subject.toLowerCase()
  const text = `${subject} ${body}`
  const lastStage = priorStages.length > 0 ? priorStages[priorStages.length - 1].stage : null

  // Post-event: gratitude after a confirmation or logistics stage
  if (
    GRATITUDE_PATTERNS.test(text) &&
    (lastStage === 'confirmation' || lastStage === 'pre_event_logistics')
  ) {
    return 'post_event'
  }

  // Decline at any point
  if (DECLINE_PATTERNS.test(text)) {
    return 'declined'
  }

  // Pre-event logistics: after confirmation, discussing address/parking/arrival
  if (
    LOGISTICS_PATTERNS.test(text) &&
    (lastStage === 'confirmation' || lastStage === 'pre_event_logistics')
  ) {
    return 'pre_event_logistics'
  }

  // Confirmation: booking language
  if (CONFIRMATION_PATTERNS.test(text)) {
    return 'confirmation'
  }

  // Negotiation: pricing discussion
  if (
    PRICING_PATTERNS.test(text) &&
    lastStage !== 'confirmation' &&
    lastStage !== 'pre_event_logistics'
  ) {
    return 'negotiation'
  }

  // First non-outbound message is initial inquiry
  if (!isOutbound && !lastStage) {
    return 'initial_inquiry'
  }

  // Follow-up with new facts = information gathering
  if (extraction?.follow_up?.new_facts && Object.keys(extraction.follow_up.new_facts).length > 0) {
    if (!lastStage || lastStage === 'initial_inquiry' || lastStage === 'information_gathering') {
      return 'information_gathering'
    }
  }

  // Default: stay in current stage (don't create a new entry)
  return null
}

// ─── Outcome Detection (deterministic) ──────────────────────────────────

function detectOutcome(
  stages: StageEntry[],
  messages: ThreadMessage[],
  chefEmail: string,
  datasetEndDate: Date
): { outcome: ThreadOutcome; confidence: 'high' | 'medium' | 'low' } {
  const stageNames = stages.map((s) => s.stage)

  // Declined at any point
  if (stageNames.includes('declined')) {
    // Who sent the decline?
    const declineStage = stages.find((s) => s.stage === 'declined')
    if (declineStage) {
      const declineMsg = messages.find((m) => m.message_id === declineStage.message_id)
      if (declineMsg) {
        const isChef = declineMsg.from_email.toLowerCase() === chefEmail
        return {
          outcome: isChef ? 'declined_by_chef' : 'declined_by_client',
          confidence: 'high',
        }
      }
    }
    return { outcome: 'declined_by_client', confidence: 'medium' }
  }

  // Post-event means it was definitely booked
  if (stageNames.includes('post_event')) {
    return { outcome: 'booked', confidence: 'high' }
  }

  // Pre-event logistics means it was booked
  if (stageNames.includes('pre_event_logistics')) {
    return { outcome: 'booked', confidence: 'high' }
  }

  // Confirmation means booked
  if (stageNames.includes('confirmation')) {
    return { outcome: 'booked', confidence: 'high' }
  }

  // Check for likely_booked: negotiation stage reached, no decline, conversation happened.
  // Many bookings are confirmed over phone/text - the email thread stops at negotiation
  // but the dinner still happens.
  const hasNegotiation = stageNames.includes('negotiation')
  const hasInfoGathering = stageNames.includes('information_gathering')
  const outboundCount = messages.filter((m) => m.from_email.toLowerCase() === chefEmail).length
  const inboundCount = messages.length - outboundCount

  const lastMsg = messages[messages.length - 1]
  const daysSinceLastMsg = lastMsg
    ? (datasetEndDate.getTime() - new Date(lastMsg.date).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity

  // Negotiation + chef quoted pricing + no decline = likely booked via phone
  if (hasNegotiation && outboundCount >= 1 && daysSinceLastMsg > 14) {
    return { outcome: 'likely_booked', confidence: 'medium' }
  }

  // Multiple back-and-forth (3+ messages from each side) without decline = likely booked
  if (inboundCount >= 2 && outboundCount >= 2 && daysSinceLastMsg > 14) {
    return { outcome: 'likely_booked', confidence: 'low' }
  }

  // Info gathering with chef responses but no negotiation yet - still engaged, likely booked
  if (hasInfoGathering && outboundCount >= 1 && daysSinceLastMsg > 14) {
    return { outcome: 'likely_booked', confidence: 'low' }
  }

  // Thread went silent with minimal engagement - truly expired
  if (daysSinceLastMsg > 14) {
    return { outcome: 'expired', confidence: 'medium' }
  }

  // Recent thread, might still be active
  if (lastMsg) {
    return { outcome: 'unknown', confidence: 'low' }
  }

  return { outcome: 'unknown', confidence: 'low' }
}

// ─── Fact Accumulation ──────────────────────────────────────────────────

interface AccumulatedFacts {
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  event_date: string | null
  guest_count: number | null
  location: string | null
  occasion: string | null
  budget_cents: number | null
  dietary_restrictions: string[]
  cannabis_preference: string | null
  referral_source: string | null
  quoted_amount_cents: number | null
  per_person_rate_cents: number | null
}

function initFacts(): AccumulatedFacts {
  return {
    client_name: null,
    client_email: null,
    client_phone: null,
    event_date: null,
    guest_count: null,
    location: null,
    occasion: null,
    budget_cents: null,
    dietary_restrictions: [],
    cannabis_preference: null,
    referral_source: null,
    quoted_amount_cents: null,
    per_person_rate_cents: null,
  }
}

function mergeFromDeterministic(facts: AccumulatedFacts, det: DeterministicFields): void {
  if (det.phones.length > 0 && !facts.client_phone) {
    facts.client_phone = det.phones[0]
  }
  if (det.dates.length > 0 && !facts.event_date) {
    // Use the first parsed date, or raw if no parse
    const bestDate = det.dates.find((d) => d.parsed) || det.dates[0]
    facts.event_date = bestDate.parsed || bestDate.raw
  }
  if (det.guest_counts.length > 0 && !facts.guest_count) {
    facts.guest_count = det.guest_counts[0].number || det.guest_counts[0].range_low
  }
  if (det.location_mentions.length > 0 && !facts.location) {
    facts.location = det.location_mentions[0]
  }
  if (det.occasion_keywords.length > 0 && !facts.occasion) {
    facts.occasion = det.occasion_keywords[0]
  }
  if (det.budget_mentions.length > 0 && !facts.budget_cents) {
    facts.budget_cents = det.budget_mentions[0].amount_cents
  }
  if (det.dietary_mentions.length > 0) {
    for (const d of det.dietary_mentions) {
      if (!facts.dietary_restrictions.includes(d)) {
        facts.dietary_restrictions.push(d)
      }
    }
  }
  if (det.cannabis_mentions.length > 0 && !facts.cannabis_preference) {
    facts.cannabis_preference = det.cannabis_mentions.join(', ')
  }
  if (det.referral_signals.length > 0 && !facts.referral_source) {
    facts.referral_source = det.referral_signals[0]
  }
}

function mergeFromEnriched(facts: AccumulatedFacts, enriched: OllamaEnrichedFields): void {
  if (enriched.client_name && !facts.client_name) {
    facts.client_name = enriched.client_name
  }
  if (enriched.occasion_normalized && !facts.occasion) {
    facts.occasion = enriched.occasion_normalized
  }
  if (enriched.referral_source && !facts.referral_source) {
    facts.referral_source = enriched.referral_source
  }
  if (enriched.cannabis_preference && !facts.cannabis_preference) {
    facts.cannabis_preference = enriched.cannabis_preference
  }
}

function mergeFromFollowUp(facts: AccumulatedFacts, followUp: FollowUpFields): void {
  for (const key of followUp.supersedes) {
    // Clear the superseded field so the new fact overwrites it
    if (key === 'date') facts.event_date = null
    if (key === 'guest_count') facts.guest_count = null
    if (key === 'location') facts.location = null
    if (key === 'budget') facts.budget_cents = null
  }

  for (const [key, value] of Object.entries(followUp.new_facts)) {
    if (key === 'date') facts.event_date = value
    if (key === 'guest_count') facts.guest_count = parseInt(value) || facts.guest_count
    if (key === 'location') facts.location = value
    if (key === 'budget') facts.budget_cents = parseInt(value) || facts.budget_cents
    if (key === 'dietary') {
      if (!facts.dietary_restrictions.includes(value)) {
        facts.dietary_restrictions.push(value)
      }
    }
    if (key === 'arrival_time' || key === 'address') {
      // These are logistics, not core facts - stored in notes at thread level
    }
  }
}

function mergeFromOutbound(facts: AccumulatedFacts, outbound: OutboundAnalysis): void {
  if (outbound.quoted_amount_cents && !facts.quoted_amount_cents) {
    facts.quoted_amount_cents = outbound.quoted_amount_cents
  }
  if (outbound.per_person_rate_cents && !facts.per_person_rate_cents) {
    facts.per_person_rate_cents = outbound.per_person_rate_cents
  }
}

// ─── Thread Metrics ─────────────────────────────────────────────────────

function computeMetrics(
  messages: ThreadMessage[],
  chefEmail: string
): {
  first_response_minutes: number | null
  total_messages: number
  inbound_count: number
  outbound_count: number
  duration_days: number | null
} {
  const inbound = messages.filter((m) => m.from_email.toLowerCase() !== chefEmail)
  const outbound = messages.filter((m) => m.from_email.toLowerCase() === chefEmail)

  // First response: time from first inbound to first outbound
  let firstResponse: number | null = null
  if (inbound.length > 0 && outbound.length > 0) {
    const firstIn = new Date(inbound[0].date).getTime()
    const firstOut = new Date(outbound[0].date).getTime()
    if (!isNaN(firstIn) && !isNaN(firstOut) && firstOut > firstIn) {
      firstResponse = Math.round((firstOut - firstIn) / (1000 * 60))
    }
  }

  // Duration: first to last message
  let duration: number | null = null
  if (messages.length >= 2) {
    const first = new Date(messages[0].date).getTime()
    const last = new Date(messages[messages.length - 1].date).getTime()
    if (!isNaN(first) && !isNaN(last)) {
      duration = Math.round((last - first) / (1000 * 60 * 60 * 24))
    }
  }

  return {
    first_response_minutes: firstResponse,
    total_messages: messages.length,
    inbound_count: inbound.length,
    outbound_count: outbound.length,
    duration_days: duration,
  }
}

// ─── Main Builder ───────────────────────────────────────────────────────

export function buildThreadIntelligence(
  threadId: string,
  messages: ThreadMessage[],
  extractions: Map<string, EmailExtraction>,
  chefEmail: string,
  datasetEndDate: Date
): ThreadIntelligence {
  // Sort messages chronologically
  const sorted = [...messages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Accumulate facts and detect stages
  const facts = initFacts()
  const stages: StageEntry[] = []

  // Set client email from first non-chef sender
  for (const msg of sorted) {
    if (msg.from_email.toLowerCase() !== chefEmail) {
      facts.client_email = msg.from_email.toLowerCase()
      break
    }
  }

  for (const msg of sorted) {
    const extraction = extractions.get(msg.message_id)
    const isOutbound = msg.from_email.toLowerCase() === chefEmail

    // Merge deterministic fields
    if (extraction?.deterministic) {
      mergeFromDeterministic(facts, extraction.deterministic)
    }

    // Merge Ollama enriched fields
    if (extraction?.enriched) {
      mergeFromEnriched(facts, extraction.enriched)
    }

    // Merge follow-up fields
    if (extraction?.follow_up) {
      mergeFromFollowUp(facts, extraction.follow_up)
    }

    // Merge outbound pricing
    if (extraction?.outbound) {
      mergeFromOutbound(facts, extraction.outbound)
    }

    // Detect stage
    const stage = detectStageForMessage(msg, isOutbound, stages, extraction)
    if (stage) {
      stages.push({
        stage,
        entered_at: msg.date,
        message_id: msg.message_id,
      })
    }
  }

  // Detect outcome
  const { outcome, confidence: outcomeConf } = detectOutcome(
    stages,
    sorted,
    chefEmail,
    datasetEndDate
  )

  // Compute metrics
  const metrics = computeMetrics(sorted, chefEmail)

  return {
    thread_id: threadId,
    client_name: facts.client_name,
    client_email: facts.client_email,
    client_phone: facts.client_phone,
    event_date: facts.event_date,
    guest_count: facts.guest_count,
    location: facts.location,
    occasion: facts.occasion,
    budget_cents: facts.budget_cents,
    dietary_restrictions: facts.dietary_restrictions,
    cannabis_preference: facts.cannabis_preference,
    referral_source: facts.referral_source,
    stages,
    outcome,
    outcome_confidence: outcomeConf,
    first_response_minutes: metrics.first_response_minutes,
    total_messages: metrics.total_messages,
    inbound_count: metrics.inbound_count,
    outbound_count: metrics.outbound_count,
    duration_days: metrics.duration_days,
    quoted_amount_cents: facts.quoted_amount_cents,
    per_person_rate_cents: facts.per_person_rate_cents,
  }
}
