import {
  emptyDiscoveryFilterState,
  normalizeDiscoveryFilterState,
  type DiscoveryFilterState,
  type DiscoveryResultTypeFilter,
} from '@/lib/discovery/filter-state-contract'
import type { ConsumerIntent, FulfillmentMode } from '@/lib/public-consumer/discovery-actions'
import {
  createRemyDiscoveryProposal,
  type RemyDiscoveryFilterOperation,
  type RemyDiscoveryProposal,
  type RemyDiscoveryProposalType,
  type RemyDiscoveryTargetMode,
  type RemyDiscoveryTargetSurface,
} from '@/lib/remy/discovery-proposal-contracts'

export type RemyDiningIntentTranslation = {
  message: string
  operations: RemyDiscoveryFilterOperation[]
  filterState: DiscoveryFilterState
  confidence: number
  clarification: RemyClarificationDecision
  backingSignals: string[]
  proposal: RemyDiscoveryProposal | null
}

export type RemyClarificationDecision = {
  needed: boolean
  question: string | null
  missing: Array<'taste' | 'occasion' | 'location' | 'timing' | 'partySize'>
}

export type RemyDiningIntentOptions = {
  currentFilters?: Partial<DiscoveryFilterState>
  surface?: RemyDiscoveryTargetSurface
  mode?: RemyDiscoveryTargetMode
  sessionId?: string | null
  circleId?: string | null
  now?: Date
}

const CUISINES: Array<[RegExp, string]> = [
  [/\bsichuan\b|\bszechuan\b/i, 'sichuan'],
  [/\bthai\b/i, 'thai'],
  [/\bitalian\b|\broman\b/i, 'italian'],
  [/\bmexican\b|\btaco(s)?\b/i, 'mexican'],
  [/\bjapanese\b|\bsushi\b|\bramen\b/i, 'japanese'],
  [/\bindian\b/i, 'indian'],
  [/\bmediterranean\b|\bgreek\b/i, 'mediterranean'],
  [/\bvietnamese\b|\bpho\b/i, 'vietnamese'],
  [/\bromanian\b/i, 'romanian'],
]

const DIETARY: Array<[RegExp, string]> = [
  [/\bvegetarian(s)?\b|\bveggie\b/i, 'vegetarian'],
  [/\bvegan\b/i, 'vegan'],
  [/\bgluten[-\s]?free\b/i, 'gluten_free'],
  [/\bnut[-\s]?free\b|\bnut allergy\b/i, 'nut_free'],
  [/\bdairy[-\s]?free\b/i, 'dairy_free'],
  [/\bhalal\b/i, 'halal'],
  [/\bkosher\b/i, 'kosher'],
]

const CRAVINGS: Array<[RegExp, string]> = [
  [/\bsushi\b/i, 'sushi'],
  [/\bramen\b/i, 'ramen'],
  [/\bpizza\b/i, 'pizza'],
  [/\btaco(s)?\b/i, 'tacos'],
  [/\bnoodle(s)?\b/i, 'noodles'],
  [/\bseafood\b/i, 'seafood'],
  [/\bspicy\b/i, 'spicy'],
]

export function translateCasualDiningIntent(
  message: string,
  options: RemyDiningIntentOptions = {}
): RemyDiningIntentTranslation {
  const currentFilters = normalizeDiscoveryFilterState(options.currentFilters)
  const normalizedMessage = message.trim()
  const lower = normalizedMessage.toLowerCase()
  const operations: RemyDiscoveryFilterOperation[] = []
  const backingSignals: string[] = []

  if (!normalizedMessage) {
    return emptyTranslation(message, currentFilters, 'What should I tune the rail around?')
  }

  if (/\b(start over|reset|clear all|clear search)\b/i.test(lower)) {
    operations.push({ field: 'selectedRailItems', op: 'clear', label: 'Reset selected rail items' })
    backingSignals.push('reset-request')
  }

  collectPatternMatches(CUISINES, lower, 'cuisines', 'cuisine', operations, backingSignals)
  collectPatternMatches(DIETARY, lower, 'dietary', 'dietary', operations, backingSignals)
  collectPatternMatches(CRAVINGS, lower, 'cravings', 'craving', operations, backingSignals)
  collectBudget(lower, operations, backingSignals)
  collectTiming(lower, operations, backingSignals)
  collectPartySize(lower, operations, backingSignals)
  collectDistance(lower, operations, backingSignals)
  collectFulfillment(lower, operations, backingSignals)
  collectMoodAndOccasion(lower, operations, backingSignals)
  collectLessSpicyFollowUp(lower, currentFilters, operations, backingSignals)

  const filterState = applyRemyFilterOperations(currentFilters, operations)
  const confidence = scoreTranslation(operations, backingSignals, currentFilters)
  const clarification = decideClarification(operations, filterState, confidence)
  const proposal =
    operations.length > 0
      ? buildRemyDiscoveryFilterProposal({
          message: normalizedMessage,
          operations,
          filterState,
          confidence,
          clarification,
          backingSignals,
          options,
        })
      : null

  return {
    message: normalizedMessage,
    operations,
    filterState,
    confidence,
    clarification,
    backingSignals: unique(backingSignals),
    proposal,
  }
}

export function applyRemyFilterOperations(
  current: Partial<DiscoveryFilterState>,
  operations: readonly RemyDiscoveryFilterOperation[]
): DiscoveryFilterState {
  const next = normalizeDiscoveryFilterState(current)

  for (const operation of operations) {
    applyOperation(next, operation)
  }

  return normalizeDiscoveryFilterState(next)
}

function buildRemyDiscoveryFilterProposal(input: {
  message: string
  operations: RemyDiscoveryFilterOperation[]
  filterState: DiscoveryFilterState
  confidence: number
  clarification: RemyClarificationDecision
  backingSignals: string[]
  options: RemyDiningIntentOptions
}): RemyDiscoveryProposal {
  const proposalType = inferProposalType(input.operations)

  return createRemyDiscoveryProposal({
    type: proposalType,
    target: {
      surface: input.options.surface ?? 'eat',
      mode: input.options.mode ?? 'personal',
      sessionId: input.options.sessionId ?? null,
      circleId: input.options.circleId ?? null,
    },
    confidence: input.confidence,
    reason: input.clarification.needed
      ? 'Remy translated part of the dining intent but needs one clarification.'
      : 'Remy translated casual dining intent into visible Discovery rail state.',
    backingSignals: input.backingSignals,
    durability: 'temporary',
    payload: {
      filters: input.filterState,
      filterOperations: input.operations,
      clarificationQuestion: input.clarification.question ?? undefined,
    },
    errorFallback: 'Keep using the visible Discovery rail filters.',
    analyticsLabel: 'remy_chat_discovery_filter_translation',
    now: input.options.now,
  })
}

function collectPatternMatches(
  patterns: Array<[RegExp, string]>,
  source: string,
  field: keyof DiscoveryFilterState,
  signalPrefix: string,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  for (const [pattern, value] of patterns) {
    if (!pattern.test(source)) continue
    operations.push({ field, op: 'add', value, label: value.replace(/_/g, ' ') })
    backingSignals.push(`${signalPrefix}:${value}`)
  }
}

function collectBudget(
  source: string,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  if (/\b(hide expensive|cheap|budget|affordable|not too fancy)\b/i.test(source)) {
    operations.push({
      field: 'budget',
      op: 'set',
      value: 'budget_friendly',
      label: 'Budget friendly',
    })
    backingSignals.push('budget:budget_friendly')
    return
  }

  if (/\b(special|nice|date night|premium|fancy)\b/i.test(source)) {
    operations.push({ field: 'budget', op: 'set', value: 'moderate', label: 'Moderate' })
    backingSignals.push('budget:moderate')
  }
}

function collectTiming(
  source: string,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  const dateWindow =
    matchValue<ConsumerIntent | string>(source, [
      [/\btonight\b/i, 'tonight'],
      [/\bweekend\b/i, 'weekend'],
      [/\bfriday\b/i, 'friday'],
      [/\btomorrow\b/i, 'tomorrow'],
      [/\blunch\b/i, 'lunch'],
    ]) ?? null

  if (!dateWindow) return
  operations.push({ field: 'dateWindow', op: 'set', value: dateWindow, label: dateWindow })
  backingSignals.push(`timing:${dateWindow}`)
  if (dateWindow === 'tonight' || dateWindow === 'weekend') {
    operations.push({ field: 'occasion', op: 'set', value: dateWindow })
  }
}

function collectPartySize(
  source: string,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  const match =
    source.match(/\b(?:for|party of|group of)\s+(\d{1,3})\b/i) ??
    source.match(/\b(\d{1,3})\s+(?:people|guests|diners)\b/i)
  const size = match ? Number(match[1]) : NaN
  if (!Number.isFinite(size) || size <= 0) return

  operations.push({
    field: 'partySize',
    op: 'set',
    value: Math.floor(size),
    label: `${size} people`,
  })
  backingSignals.push('partySize')
}

function collectDistance(
  source: string,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  const mileMatch = source.match(/\bwithin\s+(\d{1,3})\s*(?:miles?|mi)\b/i)
  if (mileMatch) {
    const miles = Number(mileMatch[1])
    operations.push({ field: 'radiusMiles', op: 'set', value: miles, label: `${miles} miles` })
    backingSignals.push('distance:miles')
    return
  }

  const minuteMatch = source.match(/\bwithin\s+(\d{1,3})\s*(?:minutes?|mins?)\b/i)
  if (!minuteMatch) return
  const minutes = Number(minuteMatch[1])
  const miles = Math.max(1, Math.round(minutes / 2))
  operations.push({ field: 'radiusMiles', op: 'set', value: miles, label: `${minutes} minutes` })
  backingSignals.push('distance:minutes')
}

function collectFulfillment(
  source: string,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  const fulfillment = matchValue<FulfillmentMode>(source, [
    [/\brestaurant|eat out|going out|reserve|reservation\b/i, 'restaurant'],
    [/\bprivate chef|chef at home|at home|eat in\b/i, 'private_chef'],
    [/\bmeal prep|prep for the week\b/i, 'meal_prep'],
  ])

  if (!fulfillment) return
  operations.push({ field: 'fulfillment', op: 'set', value: fulfillment })
  backingSignals.push(`fulfillment:${fulfillment}`)
}

function collectMoodAndOccasion(
  source: string,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  const moods: Array<[RegExp, string]> = [
    [/\bfun\b/i, 'fun'],
    [/\bcozy\b/i, 'cozy'],
    [/\bcasual\b/i, 'casual'],
    [/\bspecial\b/i, 'special'],
    [/\badventurous\b|\bsurprise\b/i, 'adventurous'],
  ]
  collectPatternMatches(moods, source, 'moods', 'mood', operations, backingSignals)

  const occasion = matchValue<ConsumerIntent>(source, [
    [/\bteam dinner\b/i, 'team_dinner'],
    [/\bwork lunch\b/i, 'work_lunch'],
    [/\bdinner party\b/i, 'dinner_party'],
    [/\bquick\b/i, 'quick_eats'],
    [/\bsurprise me\b/i, 'surprise_me'],
  ])
  if (!occasion) return
  operations.push({ field: 'occasion', op: 'set', value: occasion })
  backingSignals.push(`occasion:${occasion}`)
}

function collectLessSpicyFollowUp(
  source: string,
  currentFilters: DiscoveryFilterState,
  operations: RemyDiscoveryFilterOperation[],
  backingSignals: string[]
): void {
  if (!/\b(less spicy|not spicy|milder|mild)\b/i.test(source)) return

  if (currentFilters.cravings.includes('spicy') || /\bnot spicy|less spicy\b/i.test(source)) {
    operations.push({ field: 'cravings', op: 'remove', value: 'spicy', label: 'Remove spicy' })
  }
  operations.push({ field: 'moods', op: 'add', value: 'mild', label: 'Mild' })
  backingSignals.push('followup:less_spicy')
}

function decideClarification(
  operations: readonly RemyDiscoveryFilterOperation[],
  filters: DiscoveryFilterState,
  confidence: number
): RemyClarificationDecision {
  const missing: RemyClarificationDecision['missing'] = []
  const hasTaste = filters.cuisines.length > 0 || filters.cravings.length > 0
  const hasOccasion = Boolean(filters.occasion || filters.moods.length > 0)

  if (!hasTaste) missing.push('taste')
  if (!hasOccasion) missing.push('occasion')
  if (!filters.location && !filters.radiusMiles) missing.push('location')
  if (!filters.dateWindow) missing.push('timing')
  if (!filters.partySize) missing.push('partySize')

  if (operations.length === 0) {
    return {
      needed: true,
      question: 'What cuisine, craving, or occasion should I tune the rail around?',
      missing,
    }
  }

  if (confidence < 0.45 || (operations.length === 1 && missing.includes('taste'))) {
    return {
      needed: true,
      question: 'What kind of food or vibe should I use for this search?',
      missing,
    }
  }

  return { needed: false, question: null, missing }
}

function scoreTranslation(
  operations: readonly RemyDiscoveryFilterOperation[],
  backingSignals: readonly string[],
  currentFilters: DiscoveryFilterState
): number {
  if (operations.length === 0) return 0.2
  const hasFollowUp = backingSignals.some((signal) => signal.startsWith('followup:'))
  const currentContext =
    currentFilters.cuisines.length +
    currentFilters.cravings.length +
    currentFilters.moods.length +
    (currentFilters.occasion ? 1 : 0)
  const score = 0.28 + operations.length * 0.09 + backingSignals.length * 0.05
  return clamp01(score + (hasFollowUp && currentContext > 0 ? 0.18 : 0))
}

function inferProposalType(
  operations: readonly RemyDiscoveryFilterOperation[]
): RemyDiscoveryProposalType {
  if (operations.some((operation) => operation.field === 'radiusMiles')) return 'change_radius'
  if (operations.every((operation) => operation.op === 'remove' || operation.op === 'clear')) {
    return 'remove_filter'
  }
  return 'add_filter'
}

function applyOperation(
  state: DiscoveryFilterState,
  operation: RemyDiscoveryFilterOperation
): void {
  const value = operation.value

  if (operation.field === 'selectedRailItems') {
    if (operation.op === 'clear') state.selectedRailItems = []
    return
  }

  if (isArrayField(operation.field)) {
    const list = state[operation.field]
    const normalized = typeof value === 'string' ? slugify(value) : null
    if (operation.op === 'clear') {
      state[operation.field] = []
    } else if (operation.field === 'resultTypes') {
      applyResultTypeOperation(state, operation.op, normalized)
    } else if (operation.op === 'remove' && normalized) {
      state[operation.field] = list.filter((entry) => entry !== normalized)
    } else if ((operation.op === 'add' || operation.op === 'set') && normalized) {
      state[operation.field] = operation.op === 'set' ? [normalized] : unique([...list, normalized])
    }
    return
  }

  if (operation.op === 'clear') {
    deleteScalar(state, operation.field)
    return
  }

  if (value === undefined || value === null) return
  setScalar(state, operation.field, value)
}

function isArrayField(
  field: keyof DiscoveryFilterState
): field is 'cuisines' | 'cravings' | 'dietary' | 'resultTypes' | 'moods' | 'ingredients' {
  return ['cuisines', 'cravings', 'dietary', 'resultTypes', 'moods', 'ingredients'].includes(field)
}

function applyResultTypeOperation(
  state: DiscoveryFilterState,
  op: RemyDiscoveryFilterOperation['op'],
  normalized: string | null
): void {
  if (!normalized || !isResultTypeFilter(normalized)) return
  if (op === 'remove') {
    state.resultTypes = state.resultTypes.filter((entry) => entry !== normalized)
    return
  }
  if (op === 'add' || op === 'set') {
    state.resultTypes = op === 'set' ? [normalized] : unique([...state.resultTypes, normalized])
  }
}

function isResultTypeFilter(value: string): value is DiscoveryResultTypeFilter {
  return ['chef', 'listing', 'menu', 'package', 'meal_prep_item'].includes(value)
}

function setScalar(
  state: DiscoveryFilterState,
  field: keyof DiscoveryFilterState,
  value: string | number | boolean
): void {
  if (field === 'partySize' && typeof value === 'number') state.partySize = Math.floor(value)
  if (field === 'radiusMiles' && typeof value === 'number') state.radiusMiles = value
  if (field === 'budget' && typeof value === 'string') state.budget = slugify(value)
  if (field === 'dateWindow' && typeof value === 'string') state.dateWindow = value.trim()
  if (field === 'location' && typeof value === 'string') state.location = value.trim()
  if (field === 'occasion' && typeof value === 'string') state.occasion = value as ConsumerIntent
  if (field === 'fulfillment' && typeof value === 'string') {
    state.fulfillment = value as FulfillmentMode
  }
  if (field === 'remyTuning' && typeof value === 'string') {
    state.remyTuning = value as DiscoveryFilterState['remyTuning']
  }
}

function deleteScalar(state: DiscoveryFilterState, field: keyof DiscoveryFilterState): void {
  if (field === 'partySize') delete state.partySize
  if (field === 'radiusMiles') delete state.radiusMiles
  if (field === 'budget') delete state.budget
  if (field === 'dateWindow') delete state.dateWindow
  if (field === 'location') delete state.location
  if (field === 'occasion') delete state.occasion
  if (field === 'fulfillment') delete state.fulfillment
  if (field === 'remyTuning') delete state.remyTuning
}

function emptyTranslation(
  message: string,
  currentFilters: DiscoveryFilterState,
  question: string
): RemyDiningIntentTranslation {
  return {
    message,
    operations: [],
    filterState: currentFilters,
    confidence: 0.2,
    clarification: {
      needed: true,
      question,
      missing: ['taste', 'occasion', 'location', 'timing', 'partySize'],
    },
    backingSignals: [],
    proposal: null,
  }
}

function matchValue<T>(source: string, entries: Array<[RegExp, T]>): T | undefined {
  return entries.find(([pattern]) => pattern.test(source))?.[1]
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values))
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export const EMPTY_REMY_DISCOVERY_FILTER_STATE = emptyDiscoveryFilterState()
