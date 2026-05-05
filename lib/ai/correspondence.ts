'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { generateACEDraft, draftChefResponse } from './ace-ollama'
import {
  detectLifecycleState,
  getAgentBrainForState,
  detectConversationDepth,
  getDepthInstruction,
  type LifecycleDetectionResult,
  type ChefIdentity,
} from './agent-brain'
import { getPricingConfig } from '@/lib/pricing/config-actions'
import { dateToDateString } from '@/lib/utils/format'
import { classifyInquiryScenario, type ClientHistoryData } from './inquiry-scenario'
import { buildScenarioContext } from './scenario-prompt'

// ─── ACE Draft for Inquiry ──────────────────────────────────────────────────

export async function draftResponseForInquiry(inquiryId: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  // ── 1. Fetch inquiry ──────────────────────────────────────────────────────

  const { data: inquiry, error: iqErr } = await db
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (iqErr || !inquiry) throw new Error('Inquiry not found')

  // ── 1b. Fetch chef identity for AI personalization ────────────────────────

  const { data: chefRecord } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', chef.entityId)
    .single()

  const chefFullName = (chefRecord as any)?.display_name || chefRecord?.business_name || 'Chef'
  const chefFirstName = chefFullName.split(' ')[0]
  const chefIdentity: ChefIdentity = { fullName: chefFullName, firstName: chefFirstName }

  // ── 2. Fetch related quote (if any) ───────────────────────────────────────

  const { data: quote } = await db
    .from('quotes')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ── 3. Fetch related event (if any) ───────────────────────────────────────

  let event = null
  if (inquiry.converted_to_event_id) {
    const { data: eventData } = await db
      .from('events')
      .select('*')
      .eq('id', inquiry.converted_to_event_id)
      .eq('tenant_id', chef.tenantId!)
      .single()
    event = eventData
  }

  // ── 4. Fetch client context ───────────────────────────────────────────────

  let clientContext = 'New client - no prior history.'
  let clientHasPriorEvents = false

  if (inquiry.client_id) {
    const { data: client } = await db
      .from('clients')
      .select(
        'id, full_name, email, phone, dietary_restrictions, allergies, notes, status, loyalty_tier, loyalty_points'
      )
      .eq('id', inquiry.client_id)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (client) {
      clientContext = `Client: ${client.full_name}\nEmail: ${client.email || 'N/A'}\nPhone: ${client.phone || 'N/A'}`

      // Check for prior events to detect repeat clients
      const { count } = await db
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', inquiry.client_id)
        .eq('tenant_id', chef.tenantId!)
        .in('status', ['completed', 'confirmed', 'in_progress'])

      if (count && count > 0) {
        clientHasPriorEvents = true
        clientContext += `\nRepeat client: ${count} prior event(s).`
      }
    }
  }

  // ── 4b. Fetch rich client history for scenario classification ──────────────

  let clientHistoryData: ClientHistoryData = {}
  let journeyStage: string | null = null
  let referrerIsKnownClient = false

  if (inquiry.client_id && clientHasPriorEvents) {
    // Get last completed event with menu info
    const { data: lastEvent } = await db
      .from('events')
      .select('id, event_date, title, status, confirmed_guest_count, location_address')
      .eq('client_id', inquiry.client_id)
      .eq('tenant_id', chef.tenantId!)
      .in('status', ['completed', 'confirmed'])
      .order('event_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastEvent) {
      clientHistoryData.lastEventDate = lastEvent.event_date
      clientHistoryData.knownLocation = lastEvent.location_address || null
      clientHistoryData.typicalGuestCount = lastEvent.confirmed_guest_count || null
    }

    // Get last menu summary (dish names from the most recent event's menu)
    if (lastEvent?.id) {
      const { data: menuItems } = await db
        .from('menu_items')
        .select('name, course_type')
        .eq('event_id', lastEvent.id)
        .eq('tenant_id', chef.tenantId!)
        .order('sort_order', { ascending: true })
        .limit(8)

      if (menuItems && menuItems.length > 0) {
        clientHistoryData.lastMenuSummary = menuItems.map((m: any) => m.name).join(', ')
      }
    }

    // Get client record for dietary and preferences
    const { data: clientRecord } = await db
      .from('clients')
      .select('dietary_restrictions, allergies, notes, loyalty_tier')
      .eq('id', inquiry.client_id)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (clientRecord) {
      clientHistoryData.knownDietary =
        clientRecord.dietary_restrictions || clientRecord.allergies
          ? [
              ...(clientRecord.dietary_restrictions || []),
              ...(clientRecord.allergies ? [clientRecord.allergies] : []),
            ]
          : null
      clientHistoryData.loyaltyTier = clientRecord.loyalty_tier || null
      clientHistoryData.preferences = clientRecord.notes || null
    }

    // Determine journey stage from event count
    const { count: totalEvents } = await db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', inquiry.client_id)
      .eq('tenant_id', chef.tenantId!)
      .in('status', ['completed', 'confirmed', 'in_progress'])

    const eventCountNum = totalEvents || 0
    if (eventCountNum === 0) journeyStage = 'prospect'
    else if (eventCountNum === 1) journeyStage = 'first_timer'
    else if (eventCountNum <= 5) journeyStage = 'returning'
    else journeyStage = 'loyal'
  }

  // Check if referral source is a known client
  if (inquiry.referral_source && !clientHasPriorEvents) {
    // Simple heuristic: check if referral_source matches any client name
    const { data: referrerMatch } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', chef.tenantId!)
      .ilike('full_name', `%${inquiry.referral_source}%`)
      .limit(1)
      .maybeSingle()

    if (referrerMatch) referrerIsKnownClient = true
  }

  // ── 5. Fetch conversation thread (message count + recent messages) ────────

  let threadMessages: string[] = []
  let messageCount = 0

  const { data: conversation } = await db
    .from('conversations')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', chef.tenantId!)
    .maybeSingle()

  if (conversation) {
    const { data: messages, count } = await db
      .from('chat_messages')
      .select('body, sender_id, created_at', { count: 'exact' })
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(10)

    messageCount = count || 0

    if (messages && messages.length > 0) {
      // Reverse to chronological order for context
      threadMessages = messages
        .reverse()
        .map(
          (m: any) =>
            `[${dateToDateString(m.created_at as Date | string)}] ${m.sender_id === chef.entityId ? 'Chef' : 'Client'}: ${m.body || '(no text)'}`
        )
    }
  }

  // ── 6. Calendar context ───────────────────────────────────────────────────

  let calendarContext = 'No date specified yet.'
  if (inquiry.confirmed_date) {
    const { data: conflicts } = await db
      .from('events')
      .select('id, status')
      .eq('tenant_id', chef.tenantId!)
      .eq('event_date', inquiry.confirmed_date)
      .neq('status', 'cancelled')

    calendarContext =
      conflicts && conflicts.length > 0
        ? `Date ${inquiry.confirmed_date} has ${conflicts.length} existing event(s) - may be UNAVAILABLE.`
        : `Date ${inquiry.confirmed_date} appears to be OPEN.`
  }

  // ── 7. Detect lifecycle state ─────────────────────────────────────────────

  const detection = detectLifecycleState({
    inquiry: {
      status: inquiry.status,
      confirmed_date: inquiry.confirmed_date,
      confirmed_guest_count: inquiry.confirmed_guest_count,
      confirmed_location: inquiry.confirmed_location,
      confirmed_dietary_restrictions: inquiry.confirmed_dietary_restrictions,
      confirmed_occasion: inquiry.confirmed_occasion,
      confirmed_budget_cents: inquiry.confirmed_budget_cents,
      source_message: inquiry.source_message,
      client_id: inquiry.client_id,
      converted_to_event_id: inquiry.converted_to_event_id,
    },
    quote: quote
      ? {
          status: quote.status,
          total_quoted_cents: quote.total_quoted_cents,
          sent_at: quote.sent_at,
          accepted_at: quote.accepted_at,
        }
      : null,
    event: event
      ? {
          status: event.status,
          menu_id: event.menu_id,
          grocery_list_ready: event.grocery_list_ready,
          execution_sheet_ready: event.execution_sheet_ready,
          equipment_list_ready: event.equipment_list_ready,
          follow_up_sent: event.follow_up_sent,
          financially_closed: event.financially_closed,
          aar_filed: event.aar_filed,
        }
      : null,
    messageCount,
    clientHasPriorEvents,
  })

  // ── 8. Load agent-brain rules for this state ──────────────────────────────

  const chefPricingConfig = await getPricingConfig()
  const brainContext = getAgentBrainForState(detection, chefIdentity, chefPricingConfig)

  // ── 9. Determine conversation depth ───────────────────────────────────────

  const depth = detectConversationDepth(messageCount, !!event, event?.status === 'completed')
  const depthInstruction = getDepthInstruction(depth, chefIdentity)

  // ── 10. Build inquiry summary for the AI ──────────────────────────────────

  let inquirySummary = buildInquirySummary(inquiry, detection)

  // ── 10.5. Payment link context for booking stage ────────────────────────

  if (detection.emailStage === 'booking' && inquiry.converted_to_event_id) {
    const { data: eventForPayment } = await db
      .from('events')
      .select('status')
      .eq('id', inquiry.converted_to_event_id)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (eventForPayment?.status === 'accepted') {
      inquirySummary +=
        '\n\nPAYMENT LINK AVAILABLE: The event is ready for client payment. ' +
        'Include the text [PAYMENT_LINK] exactly as written (with brackets) ' +
        'where the payment URL should appear in the email. It will be automatically ' +
        'replaced with the actual Stripe checkout link when the chef approves and sends.'
    }
  }

  // ── 10b. Classify inquiry scenario ──────────────────────────────────────────

  const { count: eventCountForScenario } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', inquiry.client_id || '00000000-0000-0000-0000-000000000000')
    .eq('tenant_id', chef.tenantId!)
    .in('status', ['completed', 'confirmed', 'in_progress'])

  const scenarioClassification = classifyInquiryScenario({
    channel: inquiry.channel || null,
    referralSource: inquiry.referral_source || null,
    sourceMessage: inquiry.source_message || null,
    confirmedDate: inquiry.confirmed_date || null,
    confirmedGuestCount: inquiry.confirmed_guest_count || null,
    confirmedDietary: inquiry.confirmed_dietary_restrictions || null,
    confirmedLocation: inquiry.confirmed_location || null,
    confirmedOccasion: inquiry.confirmed_occasion || null,
    clientId: inquiry.client_id || null,
    eventCount: eventCountForScenario || 0,
    journeyStage,
    referrerIsKnownClient,
    clientHistory: clientHistoryData,
  })

  const scenarioContext = buildScenarioContext(scenarioClassification)

  // Enrich client context with history for repeat clients
  if (clientHasPriorEvents && clientHistoryData.lastMenuSummary) {
    clientContext += `\nLast menu: ${clientHistoryData.lastMenuSummary}`
  }
  if (clientHasPriorEvents && clientHistoryData.lastEventDate) {
    clientContext += `\nLast event: ${clientHistoryData.lastEventDate}`
  }
  if (clientHistoryData.knownLocation) {
    clientContext += `\nKnown location: ${clientHistoryData.knownLocation}`
  }
  if (clientHistoryData.loyaltyTier) {
    clientContext += `\nLoyalty tier: ${clientHistoryData.loyaltyTier}`
  }

  // ── 11. Generate draft ────────────────────────────────────────────────────

  const draft = await generateACEDraft({
    inquiryData: inquiry as unknown as Record<string, unknown>,
    systemRules: brainContext.systemRules,
    validationRules: brainContext.validationRules,
    rateCard: brainContext.rateCard,
    calendarContext,
    depthInstruction,
    inquirySummary,
    threadMessages,
    clientContext,
    lifecycleState: detection.state,
    emailStage: detection.emailStage,
    missingBlocking: detection.missingBlocking,
    pricingAllowed: detection.pricingAllowed,
    isRepeatClient: clientHasPriorEvents,
    chefName: chefIdentity,
    scenarioContext,
  })

  // ── 12. Post-generation validation ────────────────────────────────────────

  const flags: string[] = []

  // Escalation detection
  if (draft.includes('[STATUS: ESCALATED]')) {
    flags.push('REVIEW_REQUIRED')
  }

  // Low-confidence lifecycle detection
  if (detection.confidence === 'low') {
    flags.push('LOW_CONFIDENCE_STATE')
  }

  // Missing blocking data flag
  if (detection.missingBlocking.length > 0) {
    flags.push('MISSING_DATA')
  }

  // Pricing appeared when it shouldn't have
  if (!detection.pricingAllowed && containsPricing(draft)) {
    flags.push('PRICING_VIOLATION')
  }

  // Forbidden phrase detection
  const forbiddenPhrase = detectForbiddenPhrase(draft)
  if (forbiddenPhrase) {
    flags.push(`FORBIDDEN_PHRASE: ${forbiddenPhrase}`)
  }

  // Clean internal markers from the draft
  const cleanDraft = draft
    .replace('[STATUS: ESCALATED]', '')
    .replace('[FLAG: CHEF_REVIEW_REQUIRED]', '')
    .trim()

  return {
    draft: cleanDraft,
    flags,
    lifecycleState: detection.state,
    emailStage: detection.emailStage,
    missingBlocking: detection.missingBlocking,
    pricingAllowed: detection.pricingAllowed,
    conversationDepth: depth,
    confidence: detection.confidence,
    scenario: scenarioClassification.scenario,
    scenarioReason: scenarioClassification.reason,
  }
}

// ─── Simple Response Draft ──────────────────────────────────────────────────

export async function draftSimpleResponse(
  context: string,
  tone: string,
  latestClientMessage: string
) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: chefRecord } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', chef.entityId)
    .single()

  const fullName = (chefRecord as any)?.display_name || chefRecord?.business_name || 'Chef'
  const firstName = fullName.split(' ')[0]

  return draftChefResponse(context, tone, latestClientMessage, { fullName, firstName })
}

// ─── Post-Event Follow Up ───────────────────────────────────────────────────

export async function draftPostEventFollowUp(clientName: string, eventDate: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: chefRecord } = await db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', chef.entityId)
    .single()

  const chefFullName = (chefRecord as any)?.display_name || chefRecord?.business_name || 'Chef'
  const chefFirstName = chefFullName.split(' ')[0]

  const dayName = new Date(eventDate).toLocaleDateString(undefined, { weekday: 'long' })
  const clientFirstName = clientName.split(' ')[0]
  return `Hi ${clientFirstName},

Just wanted to say thank you again for having me on ${dayName}. It was a pleasure cooking for you and your guests.

Hope everyone enjoyed the evening as much as I enjoyed preparing it.

Best,
${chefFirstName}`
}

// ─── Helper: Build Inquiry Summary ──────────────────────────────────────────

function buildInquirySummary(
  inquiry: Record<string, unknown>,
  detection: LifecycleDetectionResult
): string {
  const lines: string[] = [
    `Lifecycle State: ${detection.state} (${detection.emailStage} stage)`,
    `Confidence: ${detection.confidence}`,
    `Pricing Allowed: ${detection.pricingAllowed ? 'YES' : 'NO'}`,
    '',
  ]

  // Known data
  const known = detection.dataFields.filter((f) => f.status === 'known')
  if (known.length > 0) {
    lines.push('KNOWN DATA:')
    known.forEach((f) => lines.push(`  ${f.field}: ${f.value}`))
    lines.push('')
  }

  // Missing blocking data
  if (detection.missingBlocking.length > 0) {
    lines.push('MISSING (blocking - must collect to advance):')
    detection.missingBlocking.forEach((f) => lines.push(`  - ${f}`))
    lines.push('')
  }

  // Missing non-blocking
  const nonBlocking = detection.dataFields.filter((f) => f.status === 'missing_non_blocking')
  if (nonBlocking.length > 0) {
    lines.push('MISSING (non-blocking - accept if offered):')
    nonBlocking.forEach((f) => lines.push(`  - ${f.field}`))
    lines.push('')
  }

  // Source message
  if (inquiry.source_message) {
    lines.push(`CLIENT'S ORIGINAL MESSAGE:`)
    lines.push(`"${inquiry.source_message}"`)
    lines.push('')
  }

  // Occasion
  if (inquiry.confirmed_occasion) {
    lines.push(`OCCASION: ${inquiry.confirmed_occasion}`)
  }

  return lines.join('\n')
}

// ─── Post-Generation Validation Helpers ─────────────────────────────────────

const FORBIDDEN_PHRASES = [
  'thanks for your inquiry',
  'to move forward',
  "i've noted for my review",
  'take the next step',
  'please provide the following',
  'i just need a few more details',
  'based on your request',
]

function detectForbiddenPhrase(draft: string): string | null {
  const lower = draft.toLowerCase()
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) return phrase
  }
  return null
}

function containsPricing(draft: string): boolean {
  // Simple heuristic: check for dollar amounts
  return /\$\d/.test(draft)
}
