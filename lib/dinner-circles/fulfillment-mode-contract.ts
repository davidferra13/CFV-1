import type { DiscoveryItemType } from '@/lib/discovery/homepage-discovery-rail'
import {
  type DiscoveryDestinationValidation,
  validateDiscoveryDestination,
} from '@/lib/discovery/discovery-destination-contract'
import type { DerivedPreferenceProfile } from '@/lib/discovery/preference-contract'

export type DinnerFulfillmentMode = 'eat_in' | 'eat_out' | 'either'

export type DinnerFulfillmentSignal =
  | 'pantry_to_use'
  | 'leftovers'
  | 'peak_ingredients'
  | 'wants_cooking'
  | 'wants_restaurant'
  | 'needs_delivery'
  | 'limited_time'
  | 'no_cooking_capacity'
  | 'occasion_hosting'
  | 'booking_ready'

export type DinnerFulfillmentInput = {
  explicitMode?: DinnerFulfillmentMode | null
  mealText?: string | null
  participantCount?: number | null
  signals?: readonly DinnerFulfillmentSignal[]
  preferenceProfile?: Pick<
    DerivedPreferenceProfile,
    'positives' | 'negatives' | 'hardConstraints'
  > | null
}

export type DinnerFulfillmentSelection = {
  mode: DinnerFulfillmentMode
  confidence: number
  eatInEnabled: boolean
  eatOutEnabled: boolean
  discoveryRoute: '/eat'
  reasonCodes: string[]
}

const EAT_IN_TEXT = [
  'eat in',
  'at home',
  'cook',
  'pantry',
  'leftover',
  'ingredient',
  'seasonal',
  'cozy',
  'pasta night',
]

const EAT_OUT_TEXT = [
  'eat out',
  'restaurant',
  'reservation',
  'delivery',
  'takeout',
  'nearby',
  'book',
]

function normalizedText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function clampConfidence(value: number): number {
  return Math.max(0.05, Math.min(0.99, Number(value.toFixed(2))))
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

export function selectDinnerFulfillmentMode(
  input: DinnerFulfillmentInput
): DinnerFulfillmentSelection {
  const reasonCodes: string[] = []

  if (input.explicitMode) {
    reasonCodes.push(`explicit_${input.explicitMode}`)
    return {
      mode: input.explicitMode,
      confidence: 0.98,
      eatInEnabled: input.explicitMode !== 'eat_out',
      eatOutEnabled: input.explicitMode !== 'eat_in',
      discoveryRoute: '/eat',
      reasonCodes,
    }
  }

  let eatInScore = 0
  let eatOutScore = 0
  const text = normalizedText(input.mealText)

  if (includesAny(text, EAT_IN_TEXT)) {
    eatInScore += 3
    reasonCodes.push('text_eat_in')
  }
  if (includesAny(text, EAT_OUT_TEXT)) {
    eatOutScore += 3
    reasonCodes.push('text_eat_out')
  }

  for (const signal of input.signals ?? []) {
    if (
      signal === 'pantry_to_use' ||
      signal === 'leftovers' ||
      signal === 'peak_ingredients' ||
      signal === 'wants_cooking' ||
      signal === 'occasion_hosting'
    ) {
      eatInScore += 2
      reasonCodes.push(`signal_${signal}`)
    }
    if (
      signal === 'wants_restaurant' ||
      signal === 'needs_delivery' ||
      signal === 'limited_time' ||
      signal === 'no_cooking_capacity' ||
      signal === 'booking_ready'
    ) {
      eatOutScore += 2
      reasonCodes.push(`signal_${signal}`)
    }
  }

  if ((input.participantCount ?? 0) >= 5) {
    eatInScore += 1
    eatOutScore += 1
    reasonCodes.push('group_size_requires_both_paths')
  }

  if ((input.preferenceProfile?.hardConstraints.length ?? 0) > 0) {
    eatInScore += 1
    eatOutScore += 1
    reasonCodes.push('dietary_constraints_require_fit_check')
  }

  const scoreGap = Math.abs(eatInScore - eatOutScore)
  const mode = scoreGap <= 1 ? 'either' : eatInScore > eatOutScore ? 'eat_in' : 'eat_out'
  const topScore = Math.max(eatInScore, eatOutScore)
  const confidence = topScore === 0 ? 0.5 : clampConfidence(0.55 + topScore * 0.07)

  if (reasonCodes.length === 0) reasonCodes.push('no_strong_fulfillment_signal')

  return {
    mode,
    confidence,
    eatInEnabled: mode !== 'eat_out',
    eatOutEnabled: mode !== 'eat_in',
    discoveryRoute: '/eat',
    reasonCodes,
  }
}

export type BookingReadinessValue = 'known' | 'unknown' | 'unsafe' | 'not_applicable'

export type DiscoveryBookingReadinessCandidate = {
  id: string
  itemType: DiscoveryItemType
  href: string
  hasEnoughInfo: boolean
  availability: BookingReadinessValue
  price: BookingReadinessValue
  dietaryFit: BookingReadinessValue
  groupFit: BookingReadinessValue
}

export type DiscoveryBookingReadiness = {
  status: 'ready' | 'needs_info' | 'blocked'
  destination: DiscoveryDestinationValidation
  checks: Array<{
    key: 'info' | 'availability' | 'price' | 'dietary_fit' | 'group_fit'
    ready: boolean
    blocking: boolean
  }>
  missingFields: string[]
  blockers: string[]
  nextAction: 'start_booking' | 'ask_clarifying_question' | 'repair_discovery_option'
}

export function evaluateDiscoveryBookingReadiness(
  candidate: DiscoveryBookingReadinessCandidate
): DiscoveryBookingReadiness {
  const destination = validateDiscoveryDestination(candidate.itemType, candidate.href)
  const checks: DiscoveryBookingReadiness['checks'] = [
    {
      key: 'info',
      ready: candidate.hasEnoughInfo,
      blocking: !candidate.hasEnoughInfo,
    },
    {
      key: 'availability',
      ready: candidate.availability === 'known' || candidate.availability === 'not_applicable',
      blocking: candidate.availability === 'unknown',
    },
    {
      key: 'price',
      ready: candidate.price === 'known' || candidate.price === 'not_applicable',
      blocking: false,
    },
    {
      key: 'dietary_fit',
      ready: candidate.dietaryFit === 'known' || candidate.dietaryFit === 'not_applicable',
      blocking: candidate.dietaryFit === 'unsafe',
    },
    {
      key: 'group_fit',
      ready: candidate.groupFit === 'known' || candidate.groupFit === 'not_applicable',
      blocking: candidate.groupFit === 'unknown',
    },
  ]

  const missingFields = checks
    .filter((check) => !check.ready && !check.blocking)
    .map((check) => check.key)
  const blockers: string[] = checks.filter((check) => check.blocking).map((check) => check.key)

  if (!destination.valid) blockers.push('destination')

  const status = blockers.length > 0 ? 'blocked' : missingFields.length > 0 ? 'needs_info' : 'ready'

  return {
    status,
    destination,
    checks,
    missingFields,
    blockers,
    nextAction:
      status === 'ready'
        ? 'start_booking'
        : status === 'needs_info'
          ? 'ask_clarifying_question'
          : 'repair_discovery_option',
  }
}

export type DinnerEventShapeKind =
  | 'dinner_for_6'
  | 'tasting_night'
  | 'birthday_meal'
  | 'team_lunch'
  | 'market_crawl'
  | 'cooking_class'
  | 'open_dinner'

export type DinnerEventShapeInput = {
  fulfillmentMode: DinnerFulfillmentMode
  mealDirection: string
  occasion?: string | null
  groupSize?: number | null
  desiredFormat?: string | null
  discoveryItemType?: DiscoveryItemType
  discoveryHref?: string
}

export type DinnerEventShape = {
  kind: DinnerEventShapeKind
  title: string
  fulfillmentMode: DinnerFulfillmentMode
  guestCount: number | null
  planningFields: Array<'date' | 'time' | 'location' | 'budget' | 'dietary' | 'host_kitchen'>
  bookingHandoff:
    | { ready: false; reason: 'eat_in_planning_only' | 'missing_destination' }
    | { ready: true; destination: DiscoveryDestinationValidation }
}

export function buildDinnerEventShape(input: DinnerEventShapeInput): DinnerEventShape {
  const text = normalizedText(
    `${input.mealDirection} ${input.occasion ?? ''} ${input.desiredFormat ?? ''}`
  )
  const groupSize = input.groupSize ?? null
  const kind: DinnerEventShapeKind = text.includes('class')
    ? 'cooking_class'
    : text.includes('market') || text.includes('crawl')
      ? 'market_crawl'
      : text.includes('team') || text.includes('lunch')
        ? 'team_lunch'
        : text.includes('birthday')
          ? 'birthday_meal'
          : text.includes('tasting')
            ? 'tasting_night'
            : groupSize !== null && groupSize >= 5 && groupSize <= 8
              ? 'dinner_for_6'
              : 'open_dinner'

  const planningFields: DinnerEventShape['planningFields'] = [
    'date',
    'time',
    'location',
    'budget',
    'dietary',
  ]
  if (input.fulfillmentMode !== 'eat_out') planningFields.push('host_kitchen')

  const destination =
    input.discoveryItemType && input.discoveryHref
      ? validateDiscoveryDestination(input.discoveryItemType, input.discoveryHref)
      : null

  return {
    kind,
    title: eventShapeTitle(kind, input.mealDirection),
    fulfillmentMode: input.fulfillmentMode,
    guestCount: groupSize,
    planningFields,
    bookingHandoff:
      input.fulfillmentMode === 'eat_in'
        ? { ready: false, reason: 'eat_in_planning_only' }
        : destination?.valid
          ? { ready: true, destination }
          : { ready: false, reason: 'missing_destination' },
  }
}

function eventShapeTitle(kind: DinnerEventShapeKind, mealDirection: string): string {
  const direction = mealDirection.trim() || 'Dinner'
  const prefix: Record<DinnerEventShapeKind, string> = {
    dinner_for_6: 'Dinner for 6',
    tasting_night: 'Tasting night',
    birthday_meal: 'Birthday meal',
    team_lunch: 'Team lunch',
    market_crawl: 'Market crawl',
    cooking_class: 'Cooking class',
    open_dinner: 'Dinner plan',
  }

  return `${prefix[kind]}: ${direction}`
}
