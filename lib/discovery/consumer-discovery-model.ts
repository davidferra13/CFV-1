import type { PlanningBrief } from '@/lib/hub/types'
import type {
  ConsumerDiscoveryFilters,
  ConsumerResultCard,
  FulfillmentMode,
} from '@/lib/public-consumer/discovery-actions'
import { validateDiscoveryDestination } from '@/lib/discovery/discovery-destination-contract'

export type ConsumerPlanningState =
  | 'exploring'
  | 'planning_dinner'
  | 'comparing_chefs'
  | 'need_tonight'
  | 'coordinating_group'

export type DiscoveryBriefUrgency = 'tonight' | 'this_weekend' | 'planning_ahead' | 'flexible'

export type ConsumerDiscoveryBrief = {
  occasion?: string
  dateWindow?: string
  location?: string
  partySize?: number
  budget?: string
  dietary?: string
  craving?: string
  vibe?: string
  urgency: DiscoveryBriefUrgency
  fulfillment: FulfillmentMode
}

export type TastePassport = {
  explicitCuisines: string[]
  explicitDishes: string[]
  explicitDietaryNeeds: string[]
  explicitOccasions: string[]
  explicitServiceFormats: string[]
  inferredSignals: string[]
  budgetComfort?: string
  defaultLocation?: string
}

export type OccasionPlanningTemplate = {
  slug: string
  label: string
  brief: ConsumerDiscoveryBrief
  href: string
}

export type DiscoveryRecoveryAction = {
  label: string
  href: string
  reason: string
}

export type PublicDiscoveryCollection = {
  slug: string
  title: string
  purpose: string
  audience: string
  href: string
  filters: ConsumerDiscoveryFilters
  dataSource: 'static' | 'query_backed'
  fallback: string
}

export type AvailabilityPulse = {
  label: string
  strength: 'high' | 'medium' | 'low' | 'unknown'
  source: 'accepting_inquiries' | 'intent_fit' | 'public_listing' | 'missing'
}

export type PublicProofSignal = {
  label: string
  value: string
}

export type ChefMatchReason = {
  label: string
  source: string
}

export type ConsumerCompareCandidate = {
  id: string
  title: string
  type: ConsumerResultCard['type']
  locationLabel: string | null
  priceLabel: string | null
  ratingLabel: string | null
  availability: AvailabilityPulse
  matchReasons: ChefMatchReason[]
  ctaHref: string
  ctaLabel: string
}

export type EditorialSlot = {
  id: string
  slotType: 'featured_chef' | 'seasonal_story' | 'local_spotlight' | 'campaign_pick' | 'collection'
  label: string
  href: string
  startsAt?: string | null
  endsAt?: string | null
  enabled?: boolean
}

export const OCCASION_PLANNING_TEMPLATES: readonly OccasionPlanningTemplate[] = [
  template('birthday-dinner', 'Birthday dinner', {
    occasion: 'Birthday dinner',
    dateWindow: 'planning ahead',
    partySize: 8,
    budget: 'moderate',
    vibe: 'celebratory',
    urgency: 'planning_ahead',
    fulfillment: 'private_chef',
  }),
  template('corporate-lunch', 'Corporate lunch', {
    occasion: 'Corporate lunch',
    dateWindow: 'weekday',
    partySize: 16,
    budget: 'premium',
    vibe: 'polished',
    urgency: 'planning_ahead',
    fulfillment: 'any',
  }),
  template('family-meal-prep', 'Family meal prep', {
    occasion: 'Family meal prep',
    dateWindow: 'this week',
    partySize: 4,
    budget: 'moderate',
    vibe: 'practical',
    urgency: 'flexible',
    fulfillment: 'meal_prep',
  }),
  template('anniversary-tasting-menu', 'Anniversary tasting menu', {
    occasion: 'Anniversary tasting menu',
    dateWindow: 'planning ahead',
    partySize: 2,
    budget: 'premium',
    vibe: 'intimate',
    urgency: 'planning_ahead',
    fulfillment: 'private_chef',
  }),
  template('holiday-party', 'Holiday party', {
    occasion: 'Holiday party',
    dateWindow: 'seasonal',
    partySize: 20,
    budget: 'premium',
    vibe: 'festive',
    urgency: 'planning_ahead',
    fulfillment: 'private_chef',
  }),
  template('retreat-chef', 'Retreat chef', {
    occasion: 'Retreat chef',
    dateWindow: 'multi-day',
    partySize: 12,
    budget: 'luxury',
    vibe: 'restorative',
    urgency: 'planning_ahead',
    fulfillment: 'private_chef',
  }),
]

export function normalizeConsumerDiscoveryBrief(input: unknown): ConsumerDiscoveryBrief {
  const raw = isRecord(input) ? input : {}
  const partySize = positiveInteger(raw.partySize ?? raw.party_size ?? raw.headcount)
  const urgency = normalizeUrgency(
    text(raw.urgency) ?? text(raw.dateWindow) ?? text(raw.date_window)
  )

  return {
    ...(text(raw.occasion) ? { occasion: text(raw.occasion) } : {}),
    ...(text(raw.dateWindow ?? raw.date_window)
      ? { dateWindow: text(raw.dateWindow ?? raw.date_window) }
      : {}),
    ...(text(raw.location) ? { location: text(raw.location) } : {}),
    ...(partySize ? { partySize } : {}),
    ...(text(raw.budget) ? { budget: text(raw.budget) } : {}),
    ...(text(raw.dietary ?? raw.dietarySummary)
      ? { dietary: text(raw.dietary ?? raw.dietarySummary) }
      : {}),
    ...(text(raw.craving ?? raw.cuisine) ? { craving: text(raw.craving ?? raw.cuisine) } : {}),
    ...(text(raw.vibe ?? raw.eventStyle) ? { vibe: text(raw.vibe ?? raw.eventStyle) } : {}),
    urgency,
    fulfillment: normalizeFulfillment(text(raw.fulfillment), text(raw.occasion), text(raw.craving)),
  }
}

export function discoveryBriefFromFilters(
  filters: ConsumerDiscoveryFilters,
  planningBrief?: PlanningBrief | null
): ConsumerDiscoveryBrief {
  return normalizeConsumerDiscoveryBrief({
    occasion: planningBrief?.occasion ?? filters.intent?.replace(/_/g, ' '),
    dateWindow: planningBrief?.dateWindow ?? filters.dateWindow,
    location: planningBrief?.locationSummary ?? filters.location,
    partySize: planningBrief?.partySize ?? filters.partySize,
    budget: planningBrief?.budget ?? filters.budget,
    dietary: planningBrief?.dietarySummary ?? filters.dietary,
    craving: filters.craving,
    vibe: planningBrief?.eventStyle ?? filters.eventStyle,
    urgency:
      filters.intent === 'tonight'
        ? 'tonight'
        : filters.intent === 'weekend'
          ? 'this_weekend'
          : undefined,
    fulfillment: filters.fulfillment,
  })
}

export function discoveryBriefFromFreeform(value: string): ConsumerDiscoveryBrief {
  const source = value.toLowerCase()
  return normalizeConsumerDiscoveryBrief({
    occasion: match(source, [
      'birthday',
      'anniversary',
      'dinner party',
      'team dinner',
      'work lunch',
      'meal prep',
    ]),
    dateWindow: source.includes('tonight')
      ? 'tonight'
      : source.includes('weekend')
        ? 'this weekend'
        : undefined,
    partySize: Number(source.match(/\b(\d{1,3})\s*(people|guests|friends|team|family)?\b/)?.[1]),
    budget: match(source, ['budget', 'moderate', 'premium', 'luxury']),
    dietary: match(source, ['vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'dairy-free']),
    craving: match(source, [
      'italian',
      'sushi',
      'tacos',
      'bbq',
      'seafood',
      'thai',
      'indian',
      'pizza',
    ]),
    vibe: match(source, ['casual', 'romantic', 'festive', 'family', 'polished', 'adventurous']),
  })
}

export function inferConsumerPlanningState(input: {
  filters?: ConsumerDiscoveryFilters
  brief?: ConsumerDiscoveryBrief | PlanningBrief | null
  compareCount?: number
  shortlistCount?: number
}): ConsumerPlanningState {
  const filters = input.filters ?? {}
  const brief = input.brief ?? {}
  const partySize = 'partySize' in brief ? brief.partySize : undefined
  const occasion = 'occasion' in brief ? brief.occasion : undefined

  if (filters.intent === 'tonight' || filters.dateWindow === 'tonight') return 'need_tonight'
  if ((input.compareCount ?? 0) >= 2) return 'comparing_chefs'
  if ((partySize ?? filters.partySize ?? 0) >= 6 || filters.intent === 'team_dinner') {
    return 'coordinating_group'
  }
  if (occasion || filters.intent === 'dinner_party' || (input.shortlistCount ?? 0) > 0) {
    return 'planning_dinner'
  }
  return 'exploring'
}

export function normalizeTastePassport(input: unknown): TastePassport {
  const raw = isRecord(input) ? input : {}
  return {
    explicitCuisines: stringList(raw.explicitCuisines ?? raw.cuisines),
    explicitDishes: stringList(raw.explicitDishes ?? raw.dishes),
    explicitDietaryNeeds: stringList(raw.explicitDietaryNeeds ?? raw.dietary),
    explicitOccasions: stringList(raw.explicitOccasions ?? raw.occasions),
    explicitServiceFormats: stringList(raw.explicitServiceFormats ?? raw.serviceFormats),
    inferredSignals: stringList(raw.inferredSignals),
    ...(text(raw.budgetComfort) ? { budgetComfort: text(raw.budgetComfort) } : {}),
    ...(text(raw.defaultLocation) ? { defaultLocation: text(raw.defaultLocation) } : {}),
  }
}

export function buildPublicProofSignals(card: ConsumerResultCard): PublicProofSignal[] {
  const signals: PublicProofSignal[] = []
  if (card.locationLabel) signals.push({ label: 'Area', value: card.locationLabel })
  if (card.priceLabel) signals.push({ label: 'Price', value: card.priceLabel })
  if (card.rating !== null && card.reviewCount !== null && card.reviewCount > 0) {
    signals.push({ label: 'Reviews', value: `${card.rating.toFixed(1)} from ${card.reviewCount}` })
  }
  if (card.dietaryTags.length > 0) {
    signals.push({ label: 'Dietary', value: card.dietaryTags.slice(0, 2).join(', ') })
  }
  if (card.serviceModes.length > 0) {
    signals.push({ label: 'Service', value: card.serviceModes.slice(0, 2).join(', ') })
  }
  if (card.isAvailable) signals.push({ label: 'Status', value: 'Accepting inquiries' })
  return signals
}

export function deriveAvailabilityPulse(
  card: ConsumerResultCard,
  filters: ConsumerDiscoveryFilters = {}
): AvailabilityPulse {
  if (card.type === 'listing') {
    return { label: 'Public listing', strength: 'medium', source: 'public_listing' }
  }
  if (card.isAvailable && (filters.intent === 'tonight' || filters.dateWindow === 'tonight')) {
    return { label: 'Good urgent-fit signal', strength: 'high', source: 'intent_fit' }
  }
  if (card.isAvailable) {
    return { label: 'Accepting inquiries', strength: 'medium', source: 'accepting_inquiries' }
  }
  return { label: 'Availability not confirmed', strength: 'unknown', source: 'missing' }
}

export function buildChefMatchReasons(
  card: ConsumerResultCard,
  filters: ConsumerDiscoveryFilters = {},
  brief?: ConsumerDiscoveryBrief | PlanningBrief | null
): ChefMatchReason[] {
  const reasons: ChefMatchReason[] = []
  const craving = filters.craving?.toLowerCase()
  const dietary = filters.dietary?.toLowerCase()
  const location = filters.location?.toLowerCase()
  const occasion = 'occasion' in (brief ?? {}) ? (brief as PlanningBrief).occasion : undefined

  if (craving && matchesCardText(card, craving))
    reasons.push({ label: `Matches ${filters.craving}`, source: 'public text/tags' })
  if (dietary && card.dietaryTags.some((tag) => tag.toLowerCase().includes(dietary))) {
    reasons.push({ label: `Has ${filters.dietary} signal`, source: 'public dietary tags' })
  }
  if (location && card.locationLabel?.toLowerCase().includes(location.split(',')[0])) {
    reasons.push({ label: 'Near your searched area', source: 'public location' })
  }
  if (
    filters.intent &&
    card.serviceModes.some((mode) => mode.includes(filters.intent!.split('_')[0]))
  ) {
    reasons.push({ label: 'Service format fit', source: 'public service modes' })
  }
  if (occasion && matchesCardText(card, occasion.toLowerCase())) {
    reasons.push({ label: 'Occasion fit', source: 'brief and public card text' })
  }
  if (card.rating !== null && card.reviewCount !== null && card.reviewCount > 0) {
    reasons.push({ label: 'Review-backed profile', source: 'public reviews' })
  }
  if (card.isAvailable)
    reasons.push({ label: 'Accepting inquiries', source: 'public discovery profile' })

  return reasons.slice(0, 3)
}

export function normalizeCompareCandidates(
  cards: ConsumerResultCard[],
  selectedIds: string[],
  filters: ConsumerDiscoveryFilters = {},
  brief?: ConsumerDiscoveryBrief | PlanningBrief | null
): ConsumerCompareCandidate[] {
  const boundedSelectedIds = selectedIds.slice(0, 4)
  const selected = new Set(boundedSelectedIds)
  const cardsById = new Map(cards.map((card) => [card.id, card]))
  const selectedType = boundedSelectedIds
    .map((id) => cardsById.get(id)?.type)
    .find((type): type is ConsumerResultCard['type'] => Boolean(type))

  return cards
    .filter((card) => selected.has(card.id) && (!selectedType || card.type === selectedType))
    .slice(0, 4)
    .map((card) => ({
      id: card.id,
      title: card.title,
      type: card.type,
      locationLabel: card.locationLabel,
      priceLabel: card.priceLabel,
      ratingLabel:
        card.rating !== null && card.reviewCount !== null && card.reviewCount > 0
          ? `${card.rating.toFixed(1)} (${card.reviewCount})`
          : null,
      availability: deriveAvailabilityPulse(card, filters),
      matchReasons: buildChefMatchReasons(card, filters, brief),
      ctaHref: card.ctaHref,
      ctaLabel: card.ctaLabel,
    }))
}

export function buildDiscoveryRecoveryActions(
  filters: ConsumerDiscoveryFilters,
  total: number,
  route = '/eat'
): DiscoveryRecoveryAction[] {
  if (total >= 8) return []
  const actions: DiscoveryRecoveryAction[] = []
  const base = new URLSearchParams()
  if (filters.location) base.set('location', filters.location)
  if (filters.intent) base.set('intent', filters.intent)

  if (filters.dietary) {
    const next = new URLSearchParams(base)
    actions.push({
      label: 'Remove dietary filter',
      href: `${route}?${next}`,
      reason: 'Broadens sparse dietary results.',
    })
  }
  if (filters.fulfillment === 'private_chef') {
    const next = new URLSearchParams(base)
    next.set('fulfillment', 'any')
    actions.push({
      label: 'Include nearby food options',
      href: `${route}?${next}`,
      reason: 'Adds public food operators alongside chefs.',
    })
  }
  if (filters.location) {
    const next = new URLSearchParams(base)
    next.delete('location')
    actions.push({
      label: 'Search without location',
      href: `${route}?${next}`,
      reason: 'Useful when the local market is sparse.',
    })
  }
  actions.push({
    label: 'Send open request',
    href: '/book',
    reason: 'Lets chefs respond through the existing inquiry flow.',
  })
  actions.push({
    label: 'Try a planning template',
    href: '/eat?intent=dinner_party',
    reason: 'Starts from editable defaults.',
  })

  return dedupeByHref(actions).slice(0, 4)
}

export function buildPublicDiscoveryCollections(
  location?: string | null
): PublicDiscoveryCollection[] {
  const place = location?.trim()
  const suffix = place ? ` near ${place}` : ''
  return [
    collection(
      'birthday-dinners',
      `Birthday dinners${suffix}`,
      'Find private dinner and celebration-friendly chefs.',
      'hosts planning a celebration',
      { intent: 'dinner_party', eventStyle: 'celebratory', location: place || undefined }
    ),
    collection(
      'meal-prep',
      `Meal prep${suffix}`,
      'Compare meal prep options and chefs.',
      'households planning repeat meals',
      { intent: 'meal_prep', location: place || undefined }
    ),
    collection(
      'date-nights',
      `Chef-led date nights${suffix}`,
      'Surface intimate dinner and tasting menu options.',
      'couples planning a special meal',
      { intent: 'dinner_party', partySize: 2, eventStyle: 'intimate', location: place || undefined }
    ),
    collection(
      'vegetarian-private-dinners',
      `Vegetarian-friendly private dinners${suffix}`,
      'Start with dietary-aware public signals.',
      'diners with vegetarian preferences',
      { intent: 'private_chef', dietary: 'vegetarian', location: place || undefined }
    ),
  ]
}

export function buildLocalFoodIntelligence(location?: string | null): PublicProofSignal[] {
  const label = location?.trim()
  if (!label) {
    return [
      { label: 'Local context', value: 'Add a location to prioritize nearby chefs and operators.' },
    ]
  }
  return [
    {
      label: 'Local context',
      value: `Using ${label} for chef, nearby, and collection suggestions.`,
    },
    {
      label: 'Confidence',
      value: 'Location labels are shown only when supplied by the user or saved profile.',
    },
  ]
}

export function validateEditorialSlot(slot: EditorialSlot, now = new Date()): boolean {
  if (slot.enabled === false) return false
  if (
    !validateDiscoveryDestination(
      slot.slotType === 'featured_chef' ? 'featured_chef' : 'chef_pick',
      slot.href
    ).valid
  ) {
    return false
  }
  if (slot.startsAt && new Date(slot.startsAt) > now) return false
  if (slot.endsAt && new Date(slot.endsAt) < now) return false
  return true
}

export function selectEditorialSlots(
  slots: EditorialSlot[],
  fallback: EditorialSlot[],
  now = new Date()
): EditorialSlot[] {
  const valid = slots.filter((slot) => validateEditorialSlot(slot, now))
  return (
    valid.length > 0 ? valid : fallback.filter((slot) => validateEditorialSlot(slot, now))
  ).slice(0, 6)
}

export function getEmptyStateRule(category: string, hasData: boolean): string {
  if (hasData) return 'Render backed public data.'
  if (category === 'location') return 'Suppress local claims until a location exists.'
  if (category === 'saved')
    return 'Show recents or safe editorial picks instead of fake saved items.'
  if (category === 'seasonal')
    return 'Use generic ingredient discovery unless freshness is modeled.'
  return 'Use broad discovery fallback without unsupported proof claims.'
}

function template(
  slug: string,
  label: string,
  brief: ConsumerDiscoveryBrief
): OccasionPlanningTemplate {
  const params = new URLSearchParams()
  if (brief.occasion) params.set('intent', brief.occasion.toLowerCase().replace(/\s+/g, '_'))
  if (brief.partySize) params.set('partySize', String(brief.partySize))
  if (brief.budget) params.set('budget', brief.budget)
  if (brief.vibe) params.set('eventStyle', brief.vibe)
  if (brief.dateWindow) params.set('dateWindow', brief.dateWindow)
  return { slug, label, brief, href: `/eat?${params.toString()}` }
}

function collection(
  slug: string,
  title: string,
  purpose: string,
  audience: string,
  filters: ConsumerDiscoveryFilters
): PublicDiscoveryCollection {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  return {
    slug,
    title,
    purpose,
    audience,
    filters,
    href: `/eat?${params.toString()}`,
    dataSource: 'query_backed',
    fallback: 'Broaden to all public discovery results when sparse.',
  }
}

function normalizeUrgency(value: string | undefined): DiscoveryBriefUrgency {
  const normalized = value?.toLowerCase() ?? ''
  if (normalized.includes('tonight')) return 'tonight'
  if (normalized.includes('weekend')) return 'this_weekend'
  if (normalized.includes('ahead') || normalized.includes('seasonal')) return 'planning_ahead'
  return 'flexible'
}

function normalizeFulfillment(
  fulfillment: string | undefined,
  occasion: string | undefined,
  craving: string | undefined
): FulfillmentMode {
  if (fulfillment === 'private_chef' || fulfillment === 'restaurant' || fulfillment === 'meal_prep')
    return fulfillment
  const joined = `${occasion ?? ''} ${craving ?? ''}`.toLowerCase()
  if (joined.includes('meal prep')) return 'meal_prep'
  if (joined.includes('restaurant') || joined.includes('going out')) return 'restaurant'
  if (joined.includes('dinner') || joined.includes('chef')) return 'private_chef'
  return 'any'
}

function matchesCardText(card: ConsumerResultCard, value: string): boolean {
  return [card.title, card.subtitle, card.eyebrow, ...card.dietaryTags, ...card.serviceModes]
    .filter(Boolean)
    .some((entry) => entry!.toLowerCase().includes(value))
}

function match(source: string, options: string[]): string | undefined {
  return options.find((option) => source.includes(option))
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => text(entry)).filter((entry): entry is string => Boolean(entry))
}

function text(value: unknown): string | undefined {
  if (Array.isArray(value)) return text(value[0])
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function dedupeByHref<T extends { href: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.href)) return false
    seen.add(item.href)
    return true
  })
}
