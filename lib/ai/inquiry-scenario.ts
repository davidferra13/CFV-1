// Inquiry Scenario Classifier
// Determines which of the 9 canonical response scenarios applies to an inquiry.
// Used by the correspondence engine to select the right response skeleton.

// ─── Types ───────────────────────────────────────────────��──────────────────────

export type ClientHistoryLevel =
  | 'new' // No record, never worked together
  | 'referred' // Someone vouched, but never cooked for them
  | 'one_time' // Cooked together once
  | 'occasional' // 2-5 events together
  | 'regular' // 6+ events or monthly+

export type InquirySourceType =
  | 'direct' // Personal text/email/DM
  | 'platform' // Booking site (Thumbtack, Cozymeal, etc.)
  | 'referral' // "My friend recommended you"
  | 'rebook' // Repeat client reaching out again
  | 'middleman' // Event planner, assistant, corporate

export type InquiryScenario =
  | 'new_direct' // Brand new, reached out directly
  | 'new_platform' // Brand new, from booking platform
  | 'fresh_referral' // New client via referral
  | 'friend_referral' // New client, referrer is a known client
  | 'one_time_rebook' // Cooked once before, rebooking
  | 'occasional_rebook' // Occasional client, same context
  | 'regular_rebook' // Regular client
  | 'context_switch' // Known client, new situation
  | 'middleman' // Corporate/planner/assistant

export interface ScenarioClassification {
  scenario: InquiryScenario
  historyLevel: ClientHistoryLevel
  sourceType: InquirySourceType
  contextSwitch: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
  knownData: string[] // What we already have from history
  missingData: string[] // What we still need to ask
  skipTopics: string[] // What NOT to explain (they already know)
}

// ─── Platform Channels ──────────────────────────────────────────────────────────

const PLATFORM_CHANNELS = new Set([
  'thumbtack',
  'cozymeal',
  'bark',
  'take_a_chef',
  'yhangry',
  'theknot',
  'gigsalad',
  'privatechefmanager',
  'hireachef',
  'cuisineistchef',
  'google_business',
])

const MIDDLEMAN_CHANNELS = new Set(['campaign_response', 'outbound_prospecting'])

// ─── Context Switch Signals ────────────────���────────────────────────────────────

const CONTEXT_SWITCH_PHRASES = [
  'different group',
  'work event',
  'office',
  'corporate',
  'my mom',
  'my dad',
  'my parents',
  'for my boss',
  'different location',
  'new house',
  'moved',
  'at a venue',
  'bigger group',
  'smaller this time',
  'something different',
  'not at my place',
  'my friend',
  'their house',
]

function detectContextSwitch(
  message: string | null,
  typicalGuestCount: number | null,
  requestedGuestCount: number | null
): boolean {
  if (!message) return false

  const lower = message.toLowerCase()

  // Phrase-based detection
  if (CONTEXT_SWITCH_PHRASES.some((phrase) => lower.includes(phrase))) {
    return true
  }

  // Guest count outlier (2x+ their typical)
  if (typicalGuestCount && requestedGuestCount) {
    if (requestedGuestCount >= typicalGuestCount * 2) return true
    if (requestedGuestCount <= typicalGuestCount * 0.3) return true
  }

  return false
}

// ─── Source Type Detection ──────────────────────────────────────────────────────

function detectSourceType(
  channel: string | null,
  referralSource: string | null,
  eventCount: number,
  message: string | null
): InquirySourceType {
  // Middleman detection
  if (channel && MIDDLEMAN_CHANNELS.has(channel)) return 'middleman'
  if (message) {
    const lower = message.toLowerCase()
    if (
      lower.includes('event planner') ||
      lower.includes('assistant to') ||
      lower.includes('on behalf of') ||
      lower.includes('planning an event for')
    ) {
      return 'middleman'
    }
  }

  // Platform detection
  if (channel && PLATFORM_CHANNELS.has(channel)) return 'platform'

  // Referral detection
  if (referralSource === 'referral' || referralSource === 'word_of_mouth') return 'referral'
  if (channel === 'referral') return 'referral'
  if (message) {
    const lower = message.toLowerCase()
    if (
      lower.includes('recommend') ||
      lower.includes('referred') ||
      lower.includes('told me about') ||
      lower.includes('suggested')
    ) {
      return 'referral'
    }
  }

  // Rebook detection (returning client reaching out)
  if (eventCount > 0) return 'rebook'

  // Default: direct
  return 'direct'
}

// ─── History Level Detection ────────────────────────────────────────────────────

function detectHistoryLevel(
  eventCount: number,
  journeyStage: string | null,
  hasReferral: boolean
): ClientHistoryLevel {
  if (eventCount === 0) {
    return hasReferral ? 'referred' : 'new'
  }
  if (eventCount === 1) return 'one_time'
  if (eventCount <= 5) return 'occasional'
  return 'regular' // 6+
}

// ─── Known/Missing Data Computation ─────────���───────────────────────────────────

export interface ClientHistoryData {
  lastEventDate?: string | null
  lastMenuSummary?: string | null
  knownDietary?: string[] | null
  knownLocation?: string | null
  typicalGuestCount?: number | null
  loyaltyTier?: string | null
  preferences?: string | null
}

function computeKnownAndMissing(
  historyLevel: ClientHistoryLevel,
  contextSwitch: boolean,
  inquiryData: {
    confirmedDate?: string | null
    confirmedGuestCount?: number | null
    confirmedDietary?: string[] | null
    confirmedLocation?: string | null
    confirmedOccasion?: string | null
  },
  clientHistory: ClientHistoryData
): { knownData: string[]; missingData: string[]; skipTopics: string[] } {
  const knownData: string[] = []
  const missingData: string[] = []
  const skipTopics: string[] = []

  // What the inquiry itself already has
  if (inquiryData.confirmedDate) knownData.push('date')
  else missingData.push('date')

  if (inquiryData.confirmedGuestCount) knownData.push('guest_count')
  else missingData.push('guest_count')

  if (inquiryData.confirmedDietary && inquiryData.confirmedDietary.length > 0)
    knownData.push('dietary')
  else if (clientHistory.knownDietary && clientHistory.knownDietary.length > 0 && !contextSwitch)
    knownData.push('dietary_from_history')
  else missingData.push('dietary')

  if (inquiryData.confirmedLocation) knownData.push('location')
  else if (clientHistory.knownLocation && !contextSwitch) knownData.push('location_from_history')
  else missingData.push('location')

  if (inquiryData.confirmedOccasion) knownData.push('occasion')

  // What we know from history
  if (clientHistory.lastMenuSummary) knownData.push('last_menu')
  if (clientHistory.typicalGuestCount) knownData.push('typical_count')
  if (clientHistory.preferences) knownData.push('preferences')

  // What to skip explaining based on history
  if (historyLevel !== 'new' && historyLevel !== 'referred') {
    skipTopics.push('what_chef_brings')
    skipTopics.push('how_pricing_works')
    skipTopics.push('chef_process')
  }
  if (historyLevel === 'regular' || historyLevel === 'occasional') {
    skipTopics.push('logistics_overview')
  }

  // Menu direction is always needed (taste changes)
  if (!inquiryData.confirmedOccasion) {
    missingData.push('menu_direction')
  }

  return { knownData, missingData, skipTopics }
}

// ─── Main Classifier ─────────────────��─────────────────────────��────────────────

export interface ClassifyInput {
  // From inquiry record
  channel: string | null
  referralSource: string | null
  sourceMessage: string | null
  confirmedDate: string | null
  confirmedGuestCount: number | null
  confirmedDietary: string[] | null
  confirmedLocation: string | null
  confirmedOccasion: string | null

  // From client history queries
  clientId: string | null
  eventCount: number
  journeyStage: string | null // from client-lifetime-journey
  referrerIsKnownClient: boolean // did the referrer cook with this chef before?

  // From event history (for repeat clients)
  clientHistory: ClientHistoryData
}

export function classifyInquiryScenario(input: ClassifyInput): ScenarioClassification {
  const {
    channel,
    referralSource,
    sourceMessage,
    confirmedDate,
    confirmedGuestCount,
    confirmedDietary,
    confirmedLocation,
    confirmedOccasion,
    clientId,
    eventCount,
    journeyStage,
    referrerIsKnownClient,
    clientHistory,
  } = input

  // Step 1: Detect source type
  const sourceType = detectSourceType(channel, referralSource, eventCount, sourceMessage)

  // Step 2: Detect history level
  const hasReferral = sourceType === 'referral'
  const historyLevel = detectHistoryLevel(eventCount, journeyStage, hasReferral)

  // Step 3: Detect context switch (only relevant for returning clients)
  const contextSwitch =
    eventCount > 0
      ? detectContextSwitch(
          sourceMessage,
          clientHistory.typicalGuestCount ?? null,
          confirmedGuestCount ?? null
        )
      : false

  // Step 4: Classify scenario
  let scenario: InquiryScenario
  let confidence: 'high' | 'medium' | 'low' = 'high'
  let reason: string

  if (sourceType === 'middleman') {
    scenario = 'middleman'
    reason = 'Inquiry source indicates event planner, assistant, or corporate booker'
  } else if (historyLevel === 'new') {
    if (sourceType === 'platform') {
      scenario = 'new_platform'
      reason = `New client via platform channel: ${channel}`
    } else if (sourceType === 'referral') {
      scenario = 'fresh_referral'
      reason = 'New client with referral source indicated'
    } else {
      scenario = 'new_direct'
      reason = 'New client, direct outreach, no prior history'
    }
  } else if (historyLevel === 'referred') {
    if (referrerIsKnownClient) {
      scenario = 'friend_referral'
      reason = 'Referred by an existing client with event history'
    } else {
      scenario = 'fresh_referral'
      reason = 'Referral from non-client source'
    }
  } else if (contextSwitch) {
    scenario = 'context_switch'
    confidence = 'medium' // context switch detection is heuristic
    reason = 'Returning client but signals indicate new venue, group, or occasion type'
  } else if (historyLevel === 'one_time') {
    scenario = 'one_time_rebook'
    reason = `Client has 1 prior event, rebooking`
  } else if (historyLevel === 'occasional') {
    scenario = 'occasional_rebook'
    reason = `Client has ${eventCount} prior events, regular rebooking pattern`
  } else {
    scenario = 'regular_rebook'
    reason = `Loyal/champion client with ${eventCount}+ events`
  }

  // Step 5: Compute known/missing data
  const { knownData, missingData, skipTopics } = computeKnownAndMissing(
    historyLevel,
    contextSwitch,
    { confirmedDate, confirmedGuestCount, confirmedDietary, confirmedLocation, confirmedOccasion },
    clientHistory
  )

  return {
    scenario,
    historyLevel,
    sourceType,
    contextSwitch,
    confidence,
    reason,
    knownData,
    missingData,
    skipTopics,
  }
}
