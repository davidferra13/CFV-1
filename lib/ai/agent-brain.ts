// Agent Brain — Lifecycle detection and rule loading for AI correspondence.
// This module bridges the agent-brain docs to the AI engine.
// NOT a server action module — imported by correspondence.ts which IS.

import { readFileSync } from 'fs'
import { join } from 'path'
import { generateRateCardString, DEPOSIT_PERCENTAGE } from '@/lib/pricing/constants'

// ─── Chef Identity (injected at runtime, never hardcoded) ────────────────────

export interface ChefIdentity {
  fullName: string // e.g., "David Ferragamo" — from display_name or business_name
  firstName: string // e.g., "David" — derived from fullName
}

// ─── Lifecycle State Definitions ─────────────────────────────────────────────
// Maps to 02-LIFECYCLE.md's 11-state engagement arc

export type LifecycleState =
  | 'INBOUND_SIGNAL' // State 0: Raw message, no validation
  | 'QUALIFIED_INQUIRY' // State 1: Legitimate request, basic info known
  | 'DISCOVERY_COMPLETE' // State 2: All non-financial data captured
  | 'PRICING_PRESENTED' // State 3: Quote sent to client
  | 'TERMS_ACCEPTED' // State 4: Client accepted scope + pricing
  | 'BOOKED' // State 5: Deposit received
  | 'MENU_LOCKED' // State 6: Menu finalized
  | 'EXECUTION_READY' // State 7: All prep done, ready to cook
  | 'IN_PROGRESS' // State 8: Service underway
  | 'SERVICE_COMPLETE' // State 9: Post-event, closure tasks open
  | 'CLOSED' // State 10: All tasks done, archived

// Email generation stage (from 03-EMAIL_RULES.md gatekeeper)
export type EmailStage = 'discovery' | 'pricing' | 'booking' | 'post_service'

// Data completeness tracking (from 05-DISCOVERY.md)
export type DataStatus = 'known' | 'missing_blocking' | 'missing_non_blocking' | 'not_yet_requested'

export interface DataField {
  field: string
  status: DataStatus
  value?: string | number | null
}

export interface LifecycleDetectionResult {
  state: LifecycleState
  emailStage: EmailStage
  confidence: 'high' | 'medium' | 'low'
  reason: string
  dataFields: DataField[]
  missingBlocking: string[]
  pricingAllowed: boolean
}

// ─── Agent Brain Document Loader ─────────────────────────────────────────────

const BRAIN_DIR = join(process.cwd(), 'docs', 'agent-brain')

const BRAIN_FILES = {
  brandVoice: '01-BRAND_VOICE.md',
  lifecycle: '02-LIFECYCLE.md',
  emailRules: '03-EMAIL_RULES.md',
  pricing: '04-PRICING.md',
  discovery: '05-DISCOVERY.md',
  bookingPayment: '06-BOOKING_PAYMENT.md',
  edgeCases: '07-EDGE_CASES.md',
  inquiryFirstResponse: '08-INQUIRY_FIRST_RESPONSE.md',
} as const

type BrainDocument = keyof typeof BRAIN_FILES

// Cache loaded documents in memory (server process lifetime)
const documentCache = new Map<string, string>()

function loadDocument(doc: BrainDocument): string {
  const cached = documentCache.get(doc)
  if (cached) return cached

  try {
    const filePath = join(BRAIN_DIR, BRAIN_FILES[doc])
    const content = readFileSync(filePath, 'utf-8')
    documentCache.set(doc, content)
    return content
  } catch (err) {
    console.error(`[AgentBrain] Failed to load ${BRAIN_FILES[doc]}:`, err)
    return ''
  }
}

// ─── Stage-Relevant Rule Selection ───────────────────────────────────────────
// Don't send ALL rules every time — select only what's relevant

interface AgentBrainContext {
  systemRules: string // Condensed rules for the system instruction
  validationRules: string // Post-generation validation / firewall rules
  rateCard: string // Pricing data (only when pricing is allowed)
}

/**
 * Get agent-brain rules relevant to the detected lifecycle state.
 * This is the main export for the correspondence engine.
 * Chef identity is injected at runtime — never hardcoded.
 */
export function getAgentBrainForState(
  detection: LifecycleDetectionResult,
  chef: ChefIdentity
): AgentBrainContext {
  const { emailStage, pricingAllowed } = detection

  // Always-included: brand voice (condensed), email firewall, edge cases
  const brandVoice = extractBrandVoiceRules(chef)
  const emailFirewall = extractEmailFirewallRules(emailStage, chef)
  const edgeCases = extractEdgeCaseRules()
  const forbiddenPhrases = extractForbiddenPhrases()

  // Stage-specific rules
  let stageRules = ''
  let rateCard = ''

  // First-response rules (injected for first contact only)
  const isFirstResponse =
    detection.state === 'INBOUND_SIGNAL' || detection.state === 'QUALIFIED_INQUIRY'
  const firstResponseRules = isFirstResponse ? extractFirstResponseRules() : ''

  switch (emailStage) {
    case 'discovery':
      stageRules = extractDiscoveryRules()
      rateCard = extractRateCard() // Chef quotes their own prices in first response
      break
    case 'pricing':
      stageRules = extractPricingRules()
      if (pricingAllowed) {
        rateCard = extractRateCard()
      }
      break
    case 'booking':
      stageRules = extractBookingRules()
      rateCard = extractRateCard()
      break
    case 'post_service':
      stageRules = '' // Post-service uses simple templates, minimal rules
      break
  }

  const systemRuleParts = [
    '=== BRAND VOICE ===',
    brandVoice,
    '',
    `=== STAGE: ${emailStage.toUpperCase()} ===`,
    stageRules,
  ]

  if (firstResponseRules) {
    systemRuleParts.push('', '=== FIRST RESPONSE RULES (HIGHEST PRIORITY) ===', firstResponseRules)
  }

  systemRuleParts.push(
    '',
    '=== EDGE CASE HANDLING ===',
    edgeCases,
    '',
    '=== FORBIDDEN PHRASES (HARD STRIP) ===',
    forbiddenPhrases
  )

  const systemRules = systemRuleParts.join('\n')

  const validationRules = emailFirewall

  return { systemRules, validationRules, rateCard }
}

// ─── Lifecycle State Detection ───────────────────────────────────────────────
// Deterministic — maps codebase FSM states to lifecycle states

interface DetectionInput {
  inquiry: {
    status: string
    confirmed_date?: string | null
    confirmed_guest_count?: number | null
    confirmed_location?: string | null
    confirmed_dietary_restrictions?: string[] | null
    confirmed_occasion?: string | null
    confirmed_budget_cents?: number | null
    source_message?: string | null
    client_id?: string | null
    converted_to_event_id?: string | null
  }
  quote?: {
    status: string
    total_quoted_cents: number
    sent_at?: string | null
    accepted_at?: string | null
  } | null
  event?: {
    status: string
    menu_id?: string | null
    grocery_list_ready?: boolean
    execution_sheet_ready?: boolean
    equipment_list_ready?: boolean
    follow_up_sent?: boolean
    financially_closed?: boolean
    aar_filed?: boolean
  } | null
  messageCount?: number
  clientHasPriorEvents?: boolean
}

export function detectLifecycleState(input: DetectionInput): LifecycleDetectionResult {
  const { inquiry, quote, event } = input

  // --- Terminal / late states from event FSM ---

  if (event) {
    // State 10: CLOSED
    if (
      event.status === 'completed' &&
      event.financially_closed &&
      event.follow_up_sent &&
      event.aar_filed
    ) {
      return buildDetection(
        'CLOSED',
        'post_service',
        'high',
        'Event completed with all closure tasks done',
        input
      )
    }

    // State 9: SERVICE_COMPLETE
    if (event.status === 'completed') {
      return buildDetection(
        'SERVICE_COMPLETE',
        'post_service',
        'high',
        'Event completed, closure tasks still open',
        input
      )
    }

    // State 8: IN_PROGRESS
    if (event.status === 'in_progress') {
      return buildDetection('IN_PROGRESS', 'booking', 'high', 'Service currently underway', input)
    }

    // State 7: EXECUTION_READY
    if (
      event.status === 'confirmed' &&
      event.grocery_list_ready &&
      event.execution_sheet_ready &&
      event.equipment_list_ready
    ) {
      return buildDetection(
        'EXECUTION_READY',
        'booking',
        'high',
        'All prep complete, ready for execution',
        input
      )
    }

    // State 6: MENU_LOCKED
    if (event.status === 'confirmed' && event.menu_id) {
      return buildDetection(
        'MENU_LOCKED',
        'booking',
        'high',
        'Menu attached and event confirmed',
        input
      )
    }

    // State 5: BOOKED
    if (event.status === 'paid' || event.status === 'confirmed') {
      return buildDetection(
        'BOOKED',
        'booking',
        'high',
        `Event status: ${event.status}, deposit received`,
        input
      )
    }

    // Event exists but still in early states — fall through to quote/inquiry logic
    if (event.status === 'accepted') {
      // Quote accepted, but not yet paid = TERMS_ACCEPTED
      return buildDetection(
        'TERMS_ACCEPTED',
        'booking',
        'high',
        'Event accepted, awaiting deposit',
        input
      )
    }
  }

  // --- Quote-based states ---

  if (quote) {
    // State 4: TERMS_ACCEPTED
    if (quote.status === 'accepted') {
      return buildDetection('TERMS_ACCEPTED', 'booking', 'high', 'Quote accepted by client', input)
    }

    // State 3: PRICING_PRESENTED
    if (quote.status === 'sent') {
      return buildDetection(
        'PRICING_PRESENTED',
        'pricing',
        'high',
        'Quote sent, awaiting client response',
        input
      )
    }

    // Quote exists in draft = pricing is being prepared internally
    if (quote.status === 'draft') {
      return buildDetection(
        'DISCOVERY_COMPLETE',
        'pricing',
        'medium',
        'Quote in draft, discovery likely complete',
        input
      )
    }
  }

  // --- Inquiry-based states ---

  // State 3: PRICING_PRESENTED (via inquiry status)
  if (inquiry.status === 'quoted') {
    return buildDetection('PRICING_PRESENTED', 'pricing', 'high', 'Inquiry marked as quoted', input)
  }

  // State 2: DISCOVERY_COMPLETE
  if (inquiry.status === 'awaiting_chef') {
    return buildDetection(
      'DISCOVERY_COMPLETE',
      'pricing',
      'high',
      'All data collected, awaiting chef action',
      input
    )
  }

  // State 1 vs State 0: Determine from data completeness
  if (inquiry.status === 'new' || inquiry.status === 'awaiting_client') {
    const hasDate = !!inquiry.confirmed_date
    const hasGuestCount = inquiry.confirmed_guest_count != null
    const hasLocation = !!inquiry.confirmed_location

    // If we have the three blocking discovery fields, it's a qualified inquiry
    // heading toward discovery complete
    if (hasDate && hasGuestCount && hasLocation) {
      return buildDetection(
        'DISCOVERY_COMPLETE',
        'pricing',
        'medium',
        'Core discovery data present but inquiry still in early status',
        input
      )
    }

    // Qualified inquiry: at least some structured data
    if (hasDate || hasGuestCount || hasLocation || inquiry.client_id) {
      return buildDetection(
        'QUALIFIED_INQUIRY',
        'discovery',
        'high',
        'Partial discovery data available',
        input
      )
    }

    // Inbound signal: raw message, no structured data
    if (inquiry.status === 'new' && !hasDate && !hasGuestCount && !hasLocation) {
      return buildDetection(
        'INBOUND_SIGNAL',
        'discovery',
        'medium',
        'New inquiry with no structured data yet',
        input
      )
    }

    // Default for early states
    return buildDetection('QUALIFIED_INQUIRY', 'discovery', 'medium', 'Early inquiry state', input)
  }

  // Confirmed inquiry = converted to event, but if event wasn't passed, default
  if (inquiry.status === 'confirmed') {
    return buildDetection(
      'BOOKED',
      'booking',
      'medium',
      'Inquiry confirmed (event data not provided)',
      input
    )
  }

  // Fallback: default to earliest applicable state (Global Rule #3)
  return buildDetection(
    'QUALIFIED_INQUIRY',
    'discovery',
    'low',
    'Could not determine state with confidence, defaulting to discovery',
    input
  )
}

// ─── Build Detection Result ──────────────────────────────────────────────────

function buildDetection(
  state: LifecycleState,
  emailStage: EmailStage,
  confidence: 'high' | 'medium' | 'low',
  reason: string,
  input: DetectionInput
): LifecycleDetectionResult {
  const dataFields = assessDataCompleteness(input, emailStage)
  const missingBlocking = dataFields
    .filter((f) => f.status === 'missing_blocking')
    .map((f) => f.field)

  const pricingAllowed = determinePricingEligibility(input, emailStage)

  return { state, emailStage, confidence, reason, dataFields, missingBlocking, pricingAllowed }
}

function assessDataCompleteness(input: DetectionInput, stage: EmailStage): DataField[] {
  const { inquiry } = input
  const fields: DataField[] = []

  // Date
  if (inquiry.confirmed_date) {
    fields.push({ field: 'event_date', status: 'known', value: inquiry.confirmed_date })
  } else if (stage === 'discovery') {
    fields.push({ field: 'event_date', status: 'missing_blocking' })
  } else {
    fields.push({ field: 'event_date', status: 'missing_blocking' })
  }

  // Guest count
  if (inquiry.confirmed_guest_count != null) {
    fields.push({ field: 'guest_count', status: 'known', value: inquiry.confirmed_guest_count })
  } else if (stage === 'discovery') {
    fields.push({ field: 'guest_count', status: 'missing_blocking' })
  } else {
    fields.push({ field: 'guest_count', status: 'missing_blocking' })
  }

  // Location
  if (inquiry.confirmed_location) {
    fields.push({ field: 'location', status: 'known', value: inquiry.confirmed_location })
  } else if (stage === 'discovery') {
    // At discovery, we only need city/town — not full address
    fields.push({ field: 'location', status: 'missing_blocking' })
  } else if (stage === 'booking') {
    fields.push({ field: 'full_address', status: 'missing_blocking' })
  } else {
    fields.push({ field: 'location', status: 'missing_non_blocking' })
  }

  // Dietary restrictions
  if (inquiry.confirmed_dietary_restrictions && inquiry.confirmed_dietary_restrictions.length > 0) {
    fields.push({
      field: 'dietary_restrictions',
      status: 'known',
      value: inquiry.confirmed_dietary_restrictions.join(', '),
    })
  } else {
    fields.push({ field: 'dietary_restrictions', status: 'missing_non_blocking' })
  }

  // Occasion
  if (inquiry.confirmed_occasion) {
    fields.push({ field: 'occasion', status: 'known', value: inquiry.confirmed_occasion })
  } else {
    fields.push({ field: 'occasion', status: 'missing_non_blocking' })
  }

  return fields
}

function determinePricingEligibility(input: DetectionInput, stage: EmailStage): boolean {
  // Discovery: chef quotes their own per-person rate from their rate card.
  // This is not "presenting a quote" - it's showing what they charge.
  // Full quote generation still requires all data at pricing stage.
  if (stage === 'discovery') return true

  // Pricing requires: guest count known/bounded, date known, location known
  const hasDate = !!input.inquiry.confirmed_date
  const hasGuests = input.inquiry.confirmed_guest_count != null
  const hasLocation = !!input.inquiry.confirmed_location

  // All three must be present for formal pricing to be allowed
  if (!hasDate || !hasGuests || !hasLocation) return false

  // At pricing or booking stage with required data = pricing allowed
  return stage === 'pricing' || stage === 'booking'
}

// ─── Rule Extraction Helpers ─────────────────────────────────────────────────
// These extract and condense specific sections from the markdown files.
// We don't send raw markdown — we extract structured, concise rules.

function extractBrandVoiceRules(chef: ChefIdentity): string {
  const doc = loadDocument('brandVoice')
  if (!doc)
    return `Voice: calm, direct, grounded, human. First person (I, me, my). Never: we, our, the team. Sign off as ${chef.firstName}.`

  // Condense the key rules into a structured format
  // Chef identity is injected at runtime — never hardcoded
  return `IDENTITY: You are ${chef.fullName} — one person, one voice, one business.
PRONOUNS: Always "I, me, my". NEVER "we, our, the team" or third-person references.
TONE: Calm, direct, grounded, human. Not salesy, corporate, overly enthusiastic, or sloppy casual.
PRINCIPLE: If there's a choice between sounding impressive and sounding comfortable — comfortable wins.
STRUCTURE: 2-4 short paragraphs, 1-2 sentences each. Initial replies under 10 sentences.
If an email starts to feel like a proposal or policy explanation — it has gone too far. Shorten it.
ORDER: Move one step at a time. Never ask for everything at once. Never jump ahead.
WHAT EMAILS DO: Acknowledge what client shared, confirm understanding, ask clear questions, end with one clear next step.
WHAT EMAILS NEVER DO: Itemized pricing (unless explicitly asked), legal language early, full scope description, marketing copy, internal system references, bullets/lists/headers in early emails, em dashes.
PERSONAL DETAILS: Acknowledge one or two naturally. Do not stack enthusiasm. Brief, then move on.
DIETARY: Acknowledge calmly and confidently. Not alarmed. Not overpromising. If unclear, one direct question.
SIGN-OFF: Plain text. Standard: "Best, ${chef.firstName}" or "Thanks, ${chef.firstName}". Ongoing threads: "-- ${chef.firstName}" or none.
HARD BOUNDARIES: No beverage sourcing. No implied staffing/rentals/team. No internal system references.`
}

function extractDiscoveryRules(): string {
  const doc = loadDocument('discovery')
  if (!doc) return 'Menu-first approach. Chef leads, client adjusts.'

  return `CORE PRINCIPLE: When enough information exists to make a reasonable decision, the chef must make it.
ASKING VS CONFIRMING: Avoid "Could you tell me..." / "Let me know what you'd like..." — Use "I'll plan for..." / "I've got you down for..." / "Unless you'd like something different..."
FIRST CONTACT — COLLECT (blocking): Event date or range, guest count or range, city or town.
FIRST CONTACT — CONFIRM IF PROVIDED: Allergies, dietary restrictions, preferences, occasion context. Acknowledge what the client gave you. Do not re-ask.
FIRST CONTACT — INCLUDE: Per-person pricing from chef's rate card, what's included (shopping, cooking, plating, serving, cleanup), menu direction.
FIRST CONTACT — FORBIDDEN TO REQUEST: Budget (chef quotes THEIR prices), kitchen setup/equipment (insulting, redundant), full street address, start time, detailed logistics, deposits.
MENU COMMITMENT: Begin menu thinking immediately. Say "I'll plan a chef-driven seasonal menu" or similar. Do not wait for logistics.
OPTIONAL FOLLOW-UP: At most ONE, only if it materially improves direction. No parenthetical examples.
WHIMSICAL: If birthday/anniversary mentioned, slightly warmer language, ask ONE joy-forward question max. Never block progress.
PARALLEL: Menu planning and logistics happen in parallel, not sequentially. Menu is never blocked by missing logistics.
NORMALIZING FIRST-TIMERS: One sentence acknowledgment, lower the stakes, move on. Example: "That's totally fine. A lot of people I cook for are doing this for the first time."
REPEAT CLIENTS: Do not reset to formal. Reference past context. Treat it as routine. Skip known discovery data.
FRICTION RULE: Every question adds friction and delays. Only ask what you genuinely cannot proceed without. One email should move the ball forward, not create homework.`
}

function extractPricingRules(): string {
  const pricingDoc = loadDocument('pricing')
  if (!pricingDoc) return 'Present pricing only when all prerequisites are met.'

  return `WHEN ALLOWED: Only if client asked for pricing AND guest count is known AND date is known AND location is known.
WHEN FORBIDDEN: Client hasn't asked, inquiry is exploratory, date unknown, message could be answered without pricing.
DEFAULT: If pricing eligibility is unclear — do not include pricing. Ask one clarifying question instead.
REQUIRED COMPONENTS: Service fee (per-person or flat), grocery model ("billed at actual cost from real receipts"), deposit requirement ("50% non-refundable deposit locks the date").
FORMAT: Paragraph form — human, conversational, not tabular. Conditional language preferred: "If you'd like to move forward..."
RANGE PRICING: When guest count is a range, present both ends: "For 2 people it looks like X, and for 6 it looks like Y."
FORBIDDEN: Payment links (until booking), deposit demands (may describe not demand), confirmation language, itemized math, "lock in your date"/"secure your spot"/"limited availability", bullet pricing, full contracts.
COMPUTE: All arithmetic is deterministic. The AI formats but NEVER calculates totals or applies percentages.
HOLIDAY PREMIUMS: Tier 1 (+40-50%): Thanksgiving, Christmas Eve/Day, NYE, Valentine's Day. Tier 2 (+25-35%): Mother's/Father's Day, Easter, July 4th. Tier 3 (+15-25%): Memorial/Labor Day, Halloween, Graduation.`
}

function extractBookingRules(): string {
  const doc = loadDocument('bookingPayment')
  if (!doc) return 'Deposit required to lock date. Payment in same email.'

  const depositPct = `${DEPOSIT_PERCENTAGE * 100}%`
  return `TRIGGER: Client confirmed interest, confirmed menu/course count, said "ready to pay", or asked for "next steps"/"payment"/"how to lock the date".
DEPOSIT: ${depositPct} non-refundable. No date held without deposit. Balance due 24 hours before service.
CRITICAL RULE: If client is ready to pay — payment instruction MUST be in the SAME email. NEVER defer to a future message.
STRUCTURE: 1) Acknowledge confirmation, 2) State deposit requirement, 3) Provide payment action, 4) State what happens after payment.
APPROVED LANGUAGE: "To lock the date, a ${depositPct} non-refundable deposit is required. You can take care of that here: [PAYMENT LINK]. Once the deposit is received, your date is confirmed and I'll continue refining the menu."
FORBIDDEN: "I'll send the invoice shortly", "I'll follow up with payment details", "I'll send the deposit information next", anything deferring payment.
AFTER PAYMENT: Date confirmed, menu refinement continues, no additional confirmation needed.
CANCELLATION: Within 7 days — no refunds. More than 7 days — retainer non-refundable, additional payments may be refunded at chef's discretion.
GUEST COUNT CHANGES: Final count 5 days before event. Late changes may adjust fees. Reductions after confirmation do not reduce pricing.`
}

function extractEdgeCaseRules(): string {
  const doc = loadDocument('edgeCases')
  if (!doc) return 'When in doubt, ask less. Default to discovery.'

  return `GUEST COUNT AMBIGUITY: Never force a number. Allow range-based pricing. If fully unknown, soft clarify: "Do you have a rough sense of whether this will be just the two of you or closer to a small group?"
DATE PRECISION: Vague ("sometime in August") = general availability only, no pricing. Range ("weekend of Aug 16") = pricing OK if other reqs met, ask which night. Exact ("Saturday Aug 16") = full booking flow.
REFERRALS: Acknowledge lightly, one sentence max. No special promises. Does not change pricing or boundaries.
FIRST-TIMERS: Acknowledge briefly, lower stakes, move on. "That's totally fine. A lot of people I cook for are doing this for the first time."
REPEAT CLIENTS: Don't reset to formal. Reference past context. Skip known discovery data.
CANNABIS: Acknowledge without judgment. Custom quoting required. Don't make it the focus.
BUDGET MENTIONED: Note internally. Present standard pricing. Never negotiate down or frame as a deal.
PLATFORM INQUIRIES: Treat same as email. Don't adopt platform's tone.
AMBIGUOUS/INVALID: Politely redirect. "My work is focused on private in-home dining — I wouldn't be the best fit for what you're describing."
WHEN UNSURE: State → default to Discovery. Service type → default to Private Dinner. Pricing → do not include. Data → treat as unconfirmed. Err on shorter, simpler response.`
}

function extractFirstResponseRules(): string {
  const doc = loadDocument('inquiryFirstResponse')
  if (!doc) return ''

  return `THIS IS THE FIRST RESPONSE TO A NEW INQUIRY. These rules override all other stage rules.

STRUCTURE (in order):
1. Warm acknowledgment (one sentence)
2. Confirm what you know (date, guests, dietary - stated as facts, not questions)
3. Show what's included (shopping, cooking, plating, serving, cleanup)
4. Give your per-person pricing (from your rate card)
5. Suggest menu direction (based on occasion, guest count, or season)
6. One simple question max (usually occasion if unknown - no parenthetical examples)
7. Next step (tell them what happens next - "I'll send 2-3 menu options")
8. Sign-off (warm, first name)

ANTI-PATTERNS (NEVER DO):
- Ask their budget (quote YOUR prices)
- Ask about kitchen setup (insulting, redundant)
- Re-ask info they already provided (confirm it instead)
- Overload with questions (every question adds friction)
- Give parenthetical examples for obvious words
- Create homework for the client

THE TEST: After reading, the client knows: what you charge, that you heard them, what's included, and what happens next.`
}

function extractForbiddenPhrases(): string {
  return `HARD BLOCKLIST — if any appear, the draft is INVALID and must be rewritten:
- "Thanks for your inquiry"
- "To move forward"
- "I've noted for my review"
- "Take the next step"
- "Please provide the following"
- "I just need a few more details"
- "Based on your request"
- "What's your budget?" (or any budget question)
- "How's your kitchen setup?" (or any kitchen/equipment question)
- "Any other dietary needs beyond [X]?" (re-asking what client provided)
- Administrative, corporate, platform, checklist, CRM, or form language
- "AI:", "Assistant:", "System:", "Note:"
- "SERVICE BLUEPRINT", schema names, template names, "ChefFlow", "queue", "FSM"
- Packing lists, ingredient lists, equipment lists, execution timelines
- Pricing tables, itemized breakdowns, formulas
- "[Insert ___]", "TBD", "I don't know"
- Terms of service or legal clauses (unless at Booking stage)

If the email sounds like software wrote it — it fails.`
}

function extractEmailFirewallRules(stage: EmailStage, chef: ChefIdentity): string {
  return `=== EMAIL FIREWALL — POST-GENERATION VALIDATION ===

STAGE: ${stage.toUpperCase()}

HARD STRIP RULES (remove if found in output):
- Internal system artifacts (SERVICE BLUEPRINT, schema names, workflow labels, ChefFlow, queue, FSM)
- AI/meta content (AI:, Assistant:, System:, Note:, any reference to rules/policies being applied)
- Placeholders and debug (TBD, [Insert___], missing-data indicators)
- Legal content (unless Booking stage)

STAGE-SPECIFIC VALIDATION:
${
  stage === 'discovery'
    ? `DISCOVERY — ALLOWED in output:
- Chef's per-person rate from their own rate card (the chef quotes THEIR prices)
- What's included in the service (shopping, cooking, plating, serving, cleanup)
- Menu direction ("I'm thinking X based on the occasion")
DISCOVERY — FORBIDDEN in output:
- Asking the client's budget (chef quotes their OWN prices, never asks budget)
- Asking about kitchen setup or equipment
- Re-asking dietary info the client already provided
- Deposits, payment language, retainers
- Booking or confirmation language
- Availability guarantees
- Urgency, scarcity, deadline framing
- Bullets, numbered lists, headers, sections
- Parenthetical examples for obvious words`
    : ''
}
${
  stage === 'pricing'
    ? `PRICING — FORBIDDEN in output:
- Payment links or demands
- Statements implying event is booked or date secured
- Urgency or pressure to commit
- Itemized math or internal fee breakdowns`
    : ''
}
${
  stage === 'booking'
    ? `BOOKING — FORBIDDEN in output:
- New pricing options or surprise fees
- Assumptions beyond confirmed facts
- Internal artifacts`
    : ''
}

OUTPUT FORMAT (non-negotiable):
1. Subject line
2. Email body (2-4 short paragraphs)
3. Sign-off ("Best," or similar + "${chef.firstName}")

No bullets (unless mirroring client's list), no lists, no headers, no meta commentary.
Exception: Status confirmation summaries allowed after initial inquiry stage.

FAILURE BEHAVIOR: If any rule is violated, discard entire draft and rewrite shorter.

REWRITE-FROM-SCRATCH MANDATE: The email must be written fresh every time. Never copy/paste/summarize/compress from internal outputs.`
}

// ─── Rate Card Extraction ────────────────────────────────────────────────────

function extractRateCard(): string {
  return generateRateCardString()
}

// ─── Conversation Depth Detection ────────────────────────────────────────────
// From 01-BRAND_VOICE.md: tone shifts based on thread depth

export type ConversationDepth = 1 | 2 | 3 | 4

export function detectConversationDepth(
  messageCount: number,
  hasEvent: boolean,
  eventCompleted: boolean
): ConversationDepth {
  if (eventCompleted) return 4 // Post-service: warm, appreciative
  if (hasEvent) return 3 // Booking/logistics: direct, minimal pleasantries
  if (messageCount >= 3) return 2 // Back-and-forth: relaxed, shorter
  return 1 // First response: polite, professional, slightly formal
}

export function getDepthInstruction(depth: ConversationDepth, chef?: ChefIdentity): string {
  const name = chef?.firstName ?? 'Chef'
  switch (depth) {
    case 1:
      return `CONVERSATION DEPTH 1 (First Response): Polite, professional, slightly formal. Full sign-off "Best, ${name}".`
    case 2:
      return `CONVERSATION DEPTH 2 (Back-and-Forth): Relaxed, shorter sentences, fewer sign-offs. "Thanks, ${name}" or "-- ${name}".`
    case 3:
      return `CONVERSATION DEPTH 3 (Booking/Logistics): Direct, minimal pleasantries, assumes familiarity. "-- ${name}" or no sign-off.`
    case 4:
      return `CONVERSATION DEPTH 4 (Post-Service): Warm, appreciative, human. "Best, ${name}".`
  }
}
