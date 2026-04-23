const CULINARY_SIGNAL_META = {
  allergy: { label: 'Allergy', order: 10 },
  dietary_restriction: { label: 'Dietary restriction', order: 20 },
  negative_item: { label: 'Avoid', order: 30 },
  favorite_cuisine: { label: 'Favorite cuisine', order: 40 },
  favorite_dish: { label: 'Favorite dish', order: 50 },
  positive_item: { label: 'Positive signal', order: 60 },
  requested_item: { label: 'Requested item', order: 70 },
  spice_preference: { label: 'Spice preference', order: 80 },
} as const

type ClientCulinarySignalKind = keyof typeof CULINARY_SIGNAL_META

type ClientCulinarySignalSource =
  | 'allergy_record'
  | 'client_profile'
  | 'taste_profile'
  | 'observed_feedback'
  | 'served_history'
  | 'meal_request'

type InternalSignal = ClientCulinarySignal & {
  familyKey: string
  sourcePriority: number
}

const SOURCE_PRIORITY: Record<ClientCulinarySignalSource, number> = {
  allergy_record: 0,
  taste_profile: 1,
  client_profile: 2,
  observed_feedback: 3,
  served_history: 4,
  meal_request: 5,
}

export interface ClientCulinarySignal {
  id: string
  kind: ClientCulinarySignalKind
  label: string
  value: string
  source: ClientCulinarySignalSource
  sourceLabel: string
  freshness: string | null
  confidence: number | null
  shadowedByProfile: boolean
}

export interface ClientCulinarySignalSnapshot {
  clientId: string
  clientName: string
  generatedAt: string
  canonical: ClientCulinarySignal[]
  profile: ClientCulinarySignal[]
  observed: ClientCulinarySignal[]
  requests: ClientCulinarySignal[]
  secondaryDerived: ClientCulinarySignal[]
  positive: ClientCulinarySignal[]
  negative: ClientCulinarySignal[]
  safety: ClientCulinarySignal[]
  context: ClientCulinarySignal[]
}

export interface ClientCulinaryClientRecord {
  id: string
  full_name: string
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
  dislikes?: string[] | null
  spice_tolerance?: string | null
  favorite_cuisines?: string[] | null
  favorite_dishes?: string[] | null
  updated_at?: string | null
}

export interface ClientAllergySignalRecord {
  allergen: string
  severity?: string | null
  confirmed_by_chef?: boolean | null
  updated_at?: string | null
  created_at?: string | null
}

export interface ClientTasteProfileRecord {
  favorite_cuisines?: string[] | null
  disliked_ingredients?: string[] | null
  spice_tolerance?: number | null
  avoids?: string[] | null
  updated_at?: string | null
}

export interface ClientPreferenceSignalRecord {
  item_type?: string | null
  item_name?: string | null
  rating?: string | null
  observed_at?: string | null
}

export interface ServedDishSignalRecord {
  dish_name?: string | null
  client_reaction?: string | null
  client_feedback_at?: string | null
  served_date?: string | null
}

export interface ClientMealRequestSignalRecord {
  request_type?: string | null
  dish_name?: string | null
  status?: string | null
  updated_at?: string | null
  created_at?: string | null
}

export interface ClientCulinaryMenuSummary {
  clientId: string
  clientName: string
  loved: string[]
  disliked: string[]
  cuisinePreferences: string[]
  favoriteDishes: string[]
  spicePreference: string | null
  pastEventCount: number
}

function cleanValue(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim()
  return value.length > 0 ? value : null
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase()
}

function uniqueStrings(values: Array<string | null | undefined> | null | undefined): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values ?? []) {
    const value = cleanValue(raw)
    if (!value) continue

    const key = normalizeKey(value)
    if (seen.has(key)) continue

    seen.add(key)
    result.push(value)
  }

  return result
}

function formatEnumLabel(raw: string | null | undefined): string | null {
  const value = cleanValue(raw)
  if (!value) return null

  return value
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((token) => (token ? token[0].toUpperCase() + token.slice(1) : token))
    .join(' ')
}

function formatClientSpicePreference(raw: string | null | undefined): string | null {
  const value = cleanValue(raw)
  if (!value) return null

  const map: Record<string, string> = {
    none: 'No Spice',
    mild: 'Mild',
    medium: 'Medium',
    hot: 'Hot',
    very_hot: 'Very Hot',
  }

  return map[normalizeKey(value)] ?? formatEnumLabel(value)
}

function formatTasteProfileSpicePreference(raw: number | null | undefined): string | null {
  if (typeof raw !== 'number') return null

  const map: Record<number, string> = {
    1: 'No Spice',
    2: 'Mild',
    3: 'Medium',
    4: 'Hot',
    5: 'Very Hot',
  }

  return map[raw] ?? null
}

function buildFamilyKey(kind: ClientCulinarySignalKind, value: string): string {
  const normalized = normalizeKey(value)

  switch (kind) {
    case 'allergy':
      return `allergy:${normalized}`
    case 'dietary_restriction':
      return `dietary:${normalized}`
    case 'negative_item':
      return `negative:${normalized}`
    case 'favorite_cuisine':
      return `cuisine:${normalized}`
    case 'favorite_dish':
    case 'positive_item':
    case 'requested_item':
      return `positive:${normalized}`
    case 'spice_preference':
      return 'spice'
  }
}

function compareSignals(left: InternalSignal, right: InternalSignal): number {
  const byOrder = CULINARY_SIGNAL_META[left.kind].order - CULINARY_SIGNAL_META[right.kind].order
  if (byOrder !== 0) return byOrder

  if (left.sourcePriority !== right.sourcePriority) {
    return left.sourcePriority - right.sourcePriority
  }

  const leftFreshness = left.freshness ? Date.parse(left.freshness) : 0
  const rightFreshness = right.freshness ? Date.parse(right.freshness) : 0
  if (rightFreshness !== leftFreshness) return rightFreshness - leftFreshness

  return left.value.localeCompare(right.value)
}

function collapseSignals(signals: InternalSignal[]): InternalSignal[] {
  const bestByFamily = new Map<string, InternalSignal>()

  for (const signal of signals) {
    const current = bestByFamily.get(signal.familyKey)
    if (!current) {
      bestByFamily.set(signal.familyKey, signal)
      continue
    }

    if (compareSignals(signal, current) < 0) {
      bestByFamily.set(signal.familyKey, signal)
    }
  }

  return [...bestByFamily.values()].sort(compareSignals)
}

function exposeSignals(
  signals: InternalSignal[],
  shadowedByProfile = false
): ClientCulinarySignal[] {
  return signals
    .sort(compareSignals)
    .map(({ familyKey: _familyKey, sourcePriority: _sourcePriority, ...signal }) => ({
      ...signal,
      shadowedByProfile,
    }))
}

function createSignal(input: {
  kind: ClientCulinarySignalKind
  value: string
  source: ClientCulinarySignalSource
  sourceLabel: string
  freshness?: string | null
}): InternalSignal {
  return {
    id: `${input.source}:${input.kind}:${normalizeKey(input.value)}`,
    kind: input.kind,
    label: CULINARY_SIGNAL_META[input.kind].label,
    value: input.value,
    source: input.source,
    sourceLabel: input.sourceLabel,
    freshness: input.freshness ?? null,
    confidence: null,
    shadowedByProfile: false,
    familyKey: buildFamilyKey(input.kind, input.value),
    sourcePriority: SOURCE_PRIORITY[input.source],
  }
}

function buildAllergySignals(records: ClientAllergySignalRecord[]): InternalSignal[] {
  const signals: InternalSignal[] = []

  for (const record of records) {
    const value = cleanValue(record.allergen)
    if (!value) continue

    signals.push(
      createSignal({
        kind: 'allergy',
        value,
        source: 'allergy_record',
        sourceLabel: record.confirmed_by_chef ? 'Confirmed Allergy Record' : 'Allergy Record',
        freshness: record.updated_at ?? record.created_at ?? null,
      })
    )
  }

  return signals
}

function buildClientProfileSignals(client: ClientCulinaryClientRecord): InternalSignal[] {
  const freshness = client.updated_at ?? null
  const signals: InternalSignal[] = []

  for (const value of uniqueStrings(client.dietary_restrictions)) {
    signals.push(
      createSignal({
        kind: 'dietary_restriction',
        value,
        source: 'client_profile',
        sourceLabel: 'Profile',
        freshness,
      })
    )
  }

  for (const value of uniqueStrings(client.allergies)) {
    signals.push(
      createSignal({
        kind: 'allergy',
        value,
        source: 'client_profile',
        sourceLabel: 'Profile',
        freshness,
      })
    )
  }

  for (const value of uniqueStrings(client.dislikes)) {
    signals.push(
      createSignal({
        kind: 'negative_item',
        value,
        source: 'client_profile',
        sourceLabel: 'Profile',
        freshness,
      })
    )
  }

  for (const value of uniqueStrings(client.favorite_cuisines)) {
    signals.push(
      createSignal({
        kind: 'favorite_cuisine',
        value,
        source: 'client_profile',
        sourceLabel: 'Profile',
        freshness,
      })
    )
  }

  for (const value of uniqueStrings(client.favorite_dishes)) {
    signals.push(
      createSignal({
        kind: 'favorite_dish',
        value,
        source: 'client_profile',
        sourceLabel: 'Profile',
        freshness,
      })
    )
  }

  const spicePreference = formatClientSpicePreference(client.spice_tolerance)
  if (spicePreference) {
    signals.push(
      createSignal({
        kind: 'spice_preference',
        value: spicePreference,
        source: 'client_profile',
        sourceLabel: 'Profile',
        freshness,
      })
    )
  }

  return signals
}

function buildTasteProfileSignals(profile: ClientTasteProfileRecord | null): InternalSignal[] {
  if (!profile) return []

  const freshness = profile.updated_at ?? null
  const signals: InternalSignal[] = []

  for (const value of uniqueStrings(profile.favorite_cuisines)) {
    signals.push(
      createSignal({
        kind: 'favorite_cuisine',
        value,
        source: 'taste_profile',
        sourceLabel: 'Taste Profile',
        freshness,
      })
    )
  }

  for (const value of uniqueStrings(profile.disliked_ingredients)) {
    signals.push(
      createSignal({
        kind: 'negative_item',
        value,
        source: 'taste_profile',
        sourceLabel: 'Taste Profile',
        freshness,
      })
    )
  }

  for (const value of uniqueStrings(profile.avoids)) {
    signals.push(
      createSignal({
        kind: 'negative_item',
        value,
        source: 'taste_profile',
        sourceLabel: 'Taste Profile',
        freshness,
      })
    )
  }

  const spicePreference = formatTasteProfileSpicePreference(profile.spice_tolerance)
  if (spicePreference) {
    signals.push(
      createSignal({
        kind: 'spice_preference',
        value: spicePreference,
        source: 'taste_profile',
        sourceLabel: 'Taste Profile',
        freshness,
      })
    )
  }

  return signals
}

function buildObservedPreferenceSignals(
  preferences: ClientPreferenceSignalRecord[]
): InternalSignal[] {
  const signals: InternalSignal[] = []

  for (const preference of preferences) {
    const value = cleanValue(preference.item_name)
    if (!value) continue

    const rating = normalizeKey(preference.rating ?? '')
    const itemType = normalizeKey(preference.item_type ?? '')

    if (rating === 'liked' || rating === 'loved') {
      signals.push(
        createSignal({
          kind: itemType === 'cuisine' ? 'favorite_cuisine' : 'positive_item',
          value,
          source: 'observed_feedback',
          sourceLabel: 'Post-Event Feedback',
          freshness: preference.observed_at ?? null,
        })
      )
    }

    if (rating === 'disliked') {
      signals.push(
        createSignal({
          kind: 'negative_item',
          value,
          source: 'observed_feedback',
          sourceLabel: 'Post-Event Feedback',
          freshness: preference.observed_at ?? null,
        })
      )
    }
  }

  return signals
}

function buildServedDishSignals(history: ServedDishSignalRecord[]): InternalSignal[] {
  const signals: InternalSignal[] = []

  for (const item of history) {
    const value = cleanValue(item.dish_name)
    if (!value) continue

    const reaction = normalizeKey(item.client_reaction ?? '')
    if (reaction !== 'loved' && reaction !== 'liked' && reaction !== 'disliked') continue

    signals.push(
      createSignal({
        kind: reaction === 'disliked' ? 'negative_item' : 'positive_item',
        value,
        source: 'served_history',
        sourceLabel: 'Served Dish Feedback',
        freshness: item.client_feedback_at ?? item.served_date ?? null,
      })
    )
  }

  return signals
}

function buildMealRequestSignals(requests: ClientMealRequestSignalRecord[]): InternalSignal[] {
  const signals: InternalSignal[] = []

  for (const request of requests) {
    const value = cleanValue(request.dish_name)
    if (!value) continue

    const status = normalizeKey(request.status ?? '')
    if (status === 'withdrawn' || status === 'declined') continue

    const requestType = normalizeKey(request.request_type ?? '')
    if (
      requestType !== 'repeat_dish' &&
      requestType !== 'new_idea' &&
      requestType !== 'avoid_dish'
    ) {
      continue
    }

    signals.push(
      createSignal({
        kind: requestType === 'avoid_dish' ? 'negative_item' : 'requested_item',
        value,
        source: 'meal_request',
        sourceLabel: 'Meal Request',
        freshness: request.updated_at ?? request.created_at ?? null,
      })
    )
  }

  return signals
}

export function buildClientCulinarySignalSnapshot(input: {
  client: ClientCulinaryClientRecord
  allergyRecords?: ClientAllergySignalRecord[] | null
  tasteProfile?: ClientTasteProfileRecord | null
  preferences?: ClientPreferenceSignalRecord[] | null
  servedDishes?: ServedDishSignalRecord[] | null
  mealRequests?: ClientMealRequestSignalRecord[] | null
}): ClientCulinarySignalSnapshot {
  const profileSignals = collapseSignals([
    ...buildAllergySignals(input.allergyRecords ?? []),
    ...buildClientProfileSignals(input.client),
    ...buildTasteProfileSignals(input.tasteProfile ?? null),
  ])

  const observedSignals = collapseSignals([
    ...buildObservedPreferenceSignals(input.preferences ?? []),
    ...buildServedDishSignals(input.servedDishes ?? []),
  ])
  const requestSignals = collapseSignals(buildMealRequestSignals(input.mealRequests ?? []))

  const profileKeys = new Set(profileSignals.map((signal) => signal.familyKey))
  const canonicalDerived: InternalSignal[] = []
  const secondaryDerived: InternalSignal[] = []

  for (const signal of [...observedSignals, ...requestSignals]) {
    if (profileKeys.has(signal.familyKey)) {
      secondaryDerived.push(signal)
      continue
    }

    canonicalDerived.push(signal)
  }

  const canonical = collapseSignals([...profileSignals, ...canonicalDerived])
  const exposedCanonical = exposeSignals(canonical)

  return {
    clientId: input.client.id,
    clientName: input.client.full_name,
    generatedAt: new Date().toISOString(),
    canonical: exposedCanonical,
    profile: exposeSignals(profileSignals),
    observed: exposeSignals(observedSignals),
    requests: exposeSignals(requestSignals),
    secondaryDerived: exposeSignals(secondaryDerived, true),
    positive: exposedCanonical.filter(
      (signal) =>
        signal.kind === 'favorite_dish' ||
        signal.kind === 'positive_item' ||
        signal.kind === 'requested_item'
    ),
    negative: exposedCanonical.filter((signal) => signal.kind === 'negative_item'),
    safety: exposedCanonical.filter(
      (signal) => signal.kind === 'allergy' || signal.kind === 'dietary_restriction'
    ),
    context: exposedCanonical.filter(
      (signal) => signal.kind === 'favorite_cuisine' || signal.kind === 'spice_preference'
    ),
  }
}

function listSignalValues(signals: ClientCulinarySignal[]): string[] {
  return uniqueStrings(signals.map((signal) => signal.value))
}

export function summarizeClientCulinarySignals(
  snapshot: ClientCulinarySignalSnapshot,
  pastEventCount: number
): ClientCulinaryMenuSummary {
  const disliked = listSignalValues(snapshot.negative)
  const dislikedKeys = new Set(disliked.map(normalizeKey))

  const favoriteDishes = listSignalValues(
    snapshot.canonical.filter((signal) => signal.kind === 'favorite_dish')
  ).filter((value) => !dislikedKeys.has(normalizeKey(value)))

  const loved = listSignalValues(
    snapshot.canonical.filter(
      (signal) => signal.kind === 'positive_item' || signal.kind === 'requested_item'
    )
  ).filter((value) => {
    const key = normalizeKey(value)
    return !dislikedKeys.has(key) && !favoriteDishes.some((dish) => normalizeKey(dish) === key)
  })

  const cuisinePreferences = listSignalValues(
    snapshot.canonical.filter((signal) => signal.kind === 'favorite_cuisine')
  )

  const spicePreference =
    snapshot.canonical.find((signal) => signal.kind === 'spice_preference')?.value ?? null

  return {
    clientId: snapshot.clientId,
    clientName: snapshot.clientName,
    loved: loved.slice(0, 8),
    disliked: disliked.slice(0, 8),
    cuisinePreferences: cuisinePreferences.slice(0, 5),
    favoriteDishes: favoriteDishes.slice(0, 6),
    spicePreference,
    pastEventCount,
  }
}

export function buildNegativeSignalLookup(
  snapshot: ClientCulinarySignalSnapshot
): Map<string, ClientCulinarySignal> {
  const lookup = new Map<string, ClientCulinarySignal>()

  for (const signal of snapshot.negative) {
    lookup.set(normalizeKey(signal.value), signal)
  }

  return lookup
}
