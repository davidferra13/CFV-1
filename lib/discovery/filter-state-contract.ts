import {
  getDiscoveryRailContract,
  type DiscoveryFilterFacet,
} from '@/lib/discovery/rail-contract-registry'
import type { DiscoveryItemType, DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'
import type { ConsumerIntent, FulfillmentMode } from '@/lib/public-consumer/discovery-actions'

export type DiscoveryResultTypeFilter = 'chef' | 'listing' | 'menu' | 'package' | 'meal_prep_item'

export type DiscoveryRailSelection = {
  type: DiscoveryItemType
  label: string
  value: string
  href: string
}

export type DiscoveryFilterState = {
  cuisines: string[]
  cravings: string[]
  dietary: string[]
  occasion?: ConsumerIntent
  fulfillment?: FulfillmentMode
  location?: string
  radiusMiles?: number
  budget?: string
  dateWindow?: string
  partySize?: number
  resultTypes: DiscoveryResultTypeFilter[]
  moods: string[]
  ingredients: string[]
  remyTuning?: 'off' | 'light' | 'guided'
  selectedRailItems: DiscoveryRailSelection[]
}

export type ActiveDiscoveryFilterToken = {
  key: string
  label: string
  facet: DiscoveryFilterFacet | 'radius' | 'remy'
  clearParams: string[]
}

type DiscoveryFilterStateInput = {
  cuisines?: unknown
  cravings?: unknown
  dietary?: unknown
  occasion?: unknown
  fulfillment?: unknown
  location?: unknown
  radiusMiles?: unknown
  budget?: unknown
  dateWindow?: unknown
  partySize?: unknown
  resultTypes?: unknown
  moods?: unknown
  ingredients?: unknown
  remyTuning?: unknown
  selectedRailItems?: unknown
}

const EMPTY_FILTER_STATE: DiscoveryFilterState = {
  cuisines: [],
  cravings: [],
  dietary: [],
  resultTypes: [],
  moods: [],
  ingredients: [],
  selectedRailItems: [],
}

const PARAM_ALIASES = {
  cuisines: ['cuisine', 'cuisines'],
  cravings: ['craving', 'q'],
  dietary: ['dietary', 'diet'],
  resultTypes: ['resultType', 'resultTypes', 'type'],
  moods: ['mood', 'moods', 'eventStyle'],
  ingredients: ['ingredient', 'ingredients'],
} as const

export function emptyDiscoveryFilterState(): DiscoveryFilterState {
  return cloneFilterState(EMPTY_FILTER_STATE)
}

export function normalizeDiscoveryFilterState(
  input: DiscoveryFilterStateInput = {}
): DiscoveryFilterState {
  return {
    cuisines: stringList(input.cuisines),
    cravings: stringList(input.cravings),
    dietary: stringList(input.dietary),
    ...(isConsumerIntent(input.occasion) ? { occasion: input.occasion } : {}),
    ...(isFulfillmentMode(input.fulfillment) ? { fulfillment: input.fulfillment } : {}),
    ...(text(input.location) ? { location: text(input.location) } : {}),
    ...(positiveNumber(input.radiusMiles)
      ? { radiusMiles: positiveNumber(input.radiusMiles) }
      : {}),
    ...(text(input.budget) ? { budget: text(input.budget) } : {}),
    ...(text(input.dateWindow) ? { dateWindow: text(input.dateWindow) } : {}),
    ...(positiveInteger(input.partySize) ? { partySize: positiveInteger(input.partySize) } : {}),
    resultTypes: stringList(input.resultTypes).filter(isResultType),
    moods: stringList(input.moods),
    ingredients: stringList(input.ingredients),
    ...(isRemyTuning(input.remyTuning) ? { remyTuning: input.remyTuning } : {}),
    selectedRailItems: normalizeSelections(input.selectedRailItems),
  }
}

export function parseDiscoveryFiltersFromSearchParams(
  source: URLSearchParams | string
): DiscoveryFilterState {
  const params =
    typeof source === 'string' ? new URLSearchParams(source.replace(/^\?/, '')) : source
  return normalizeDiscoveryFilterState({
    cuisines: readListParam(params, PARAM_ALIASES.cuisines),
    cravings: readListParam(params, PARAM_ALIASES.cravings),
    dietary: readListParam(params, PARAM_ALIASES.dietary),
    occasion: params.get('intent') ?? undefined,
    fulfillment: params.get('fulfillment') ?? undefined,
    location: params.get('location') ?? undefined,
    radiusMiles: Number(params.get('radiusMiles') ?? params.get('radius') ?? NaN),
    budget: params.get('budget') ?? undefined,
    dateWindow: params.get('dateWindow') ?? undefined,
    partySize: Number(params.get('partySize') ?? NaN),
    resultTypes: readListParam(params, PARAM_ALIASES.resultTypes),
    moods: readListParam(params, PARAM_ALIASES.moods),
    ingredients: readListParam(params, PARAM_ALIASES.ingredients),
    remyTuning: params.get('remy') ?? undefined,
  })
}

export function serializeDiscoveryFiltersToSearchParams(
  state: Partial<DiscoveryFilterState>
): URLSearchParams {
  const filters = normalizeDiscoveryFilterState(state)
  const params = new URLSearchParams()

  setListParam(params, 'cuisine', filters.cuisines)
  setListParam(params, 'craving', filters.cravings)
  setListParam(params, 'dietary', filters.dietary)
  if (filters.occasion) params.set('intent', filters.occasion)
  if (filters.fulfillment) params.set('fulfillment', filters.fulfillment)
  if (filters.location) params.set('location', filters.location)
  if (filters.radiusMiles) params.set('radiusMiles', String(filters.radiusMiles))
  if (filters.budget) params.set('budget', filters.budget)
  if (filters.dateWindow) params.set('dateWindow', filters.dateWindow)
  if (filters.partySize) params.set('partySize', String(filters.partySize))
  setListParam(params, 'resultType', filters.resultTypes)
  setListParam(params, 'mood', filters.moods)
  setListParam(params, 'ingredient', filters.ingredients)
  if (filters.remyTuning && filters.remyTuning !== 'off') params.set('remy', filters.remyTuning)

  return params
}

export function discoveryFiltersToHref(
  route: string,
  state: Partial<DiscoveryFilterState>
): string {
  const params = serializeDiscoveryFiltersToSearchParams(state)
  const search = params.toString()
  return search ? `${route}?${search}` : route
}

export function toggleDiscoveryRailFilter(
  state: Partial<DiscoveryFilterState>,
  item: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>
): DiscoveryFilterState {
  const current = normalizeDiscoveryFilterState(state)
  const contract = getDiscoveryRailContract(item.type)
  const facet = contract.filterFacets[0]
  if (!facet) return current

  const selection = selectionFromRailItem(item)
  const selectedRailItems = toggleSelection(current.selectedRailItems, selection)
  const next = { ...current, selectedRailItems }
  const currentlySelected = current.selectedRailItems.some(
    (entry) => selectionKey(entry) === selectionKey(selection)
  )

  return applyFacetToggle(next, facet, selection.value, item.label, currentlySelected)
}

export function clearDiscoveryFilterState(
  state: Partial<DiscoveryFilterState>,
  options: { preserveIntent?: boolean; preserveLocation?: boolean } = {}
): DiscoveryFilterState {
  const current = normalizeDiscoveryFilterState(state)
  return normalizeDiscoveryFilterState({
    ...(options.preserveIntent ? { occasion: current.occasion } : {}),
    ...(options.preserveLocation
      ? { location: current.location, radiusMiles: current.radiusMiles }
      : {}),
  })
}

export function isDiscoveryFilterStateEmpty(state: Partial<DiscoveryFilterState>): boolean {
  const filters = normalizeDiscoveryFilterState(state)
  return (
    filters.cuisines.length === 0 &&
    filters.cravings.length === 0 &&
    filters.dietary.length === 0 &&
    !filters.occasion &&
    !filters.fulfillment &&
    !filters.location &&
    !filters.radiusMiles &&
    !filters.budget &&
    !filters.dateWindow &&
    !filters.partySize &&
    filters.resultTypes.length === 0 &&
    filters.moods.length === 0 &&
    filters.ingredients.length === 0 &&
    !filters.remyTuning &&
    filters.selectedRailItems.length === 0
  )
}

export function buildActiveDiscoveryFilterSummary(
  state: Partial<DiscoveryFilterState>
): ActiveDiscoveryFilterToken[] {
  const filters = normalizeDiscoveryFilterState(state)
  const tokens: ActiveDiscoveryFilterToken[] = []

  for (const value of filters.cuisines)
    token(tokens, 'cuisine', value, 'cuisine', ['cuisine', 'cuisines'])
  for (const value of filters.cravings) token(tokens, 'craving', value, 'craving', ['craving', 'q'])
  for (const value of filters.dietary)
    token(tokens, 'dietary', value, 'dietary', ['dietary', 'diet'])
  if (filters.occasion) token(tokens, 'intent', humanize(filters.occasion), 'occasion', ['intent'])
  if (filters.fulfillment)
    token(tokens, 'fulfillment', humanize(filters.fulfillment), 'fulfillment', ['fulfillment'])
  if (filters.location) token(tokens, 'location', filters.location, 'location', ['location'])
  if (filters.radiusMiles)
    token(tokens, 'radius', `${filters.radiusMiles} miles`, 'radius', ['radius', 'radiusMiles'])
  if (filters.budget) token(tokens, 'budget', humanize(filters.budget), 'budget', ['budget'])
  if (filters.dateWindow)
    token(tokens, 'dateWindow', humanize(filters.dateWindow), 'dateWindow', ['dateWindow'])
  if (filters.partySize)
    token(tokens, 'partySize', `${filters.partySize} people`, 'partySize', ['partySize'])
  for (const value of filters.resultTypes)
    token(tokens, 'resultType', humanize(value), 'resultType', [
      'resultType',
      'resultTypes',
      'type',
    ])
  for (const value of filters.moods)
    token(tokens, 'mood', humanize(value), 'mood', ['mood', 'moods', 'eventStyle'])
  for (const value of filters.ingredients)
    token(tokens, 'ingredient', humanize(value), 'ingredient', ['ingredient', 'ingredients'])
  if (filters.remyTuning && filters.remyTuning !== 'off')
    token(tokens, 'remy', `Remy ${filters.remyTuning}`, 'remy', ['remy'])

  return tokens
}

export function selectionFromRailItem(
  item: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>
): DiscoveryRailSelection {
  return {
    type: item.type,
    label: item.label,
    value: inferFilterValue(item),
    href: item.href,
  }
}

function applyFacetToggle(
  state: DiscoveryFilterState,
  facet: DiscoveryFilterFacet,
  value: string,
  label: string,
  remove: boolean
): DiscoveryFilterState {
  switch (facet) {
    case 'cuisine':
      return { ...state, cuisines: toggleValue(state.cuisines, value, remove) }
    case 'craving':
      return { ...state, cravings: toggleValue(state.cravings, value, remove) }
    case 'dietary':
      return { ...state, dietary: toggleValue(state.dietary, value, remove) }
    case 'fulfillment':
      return { ...state, fulfillment: remove ? undefined : inferFulfillment(value, label) }
    case 'occasion':
      return { ...state, occasion: remove ? undefined : inferConsumerIntent(value, label) }
    case 'location':
      return { ...state, location: remove ? undefined : label }
    case 'budget':
      return { ...state, budget: remove ? undefined : value }
    case 'dateWindow':
      return { ...state, dateWindow: remove ? undefined : value }
    case 'partySize':
      return { ...state, partySize: remove ? undefined : inferPartySize(value, label) }
    case 'resultType':
      return {
        ...state,
        resultTypes: toggleValue(state.resultTypes, inferResultType(value, label), remove),
      }
    case 'mood':
      return { ...state, moods: toggleValue(state.moods, value, remove) }
    case 'ingredient':
      return { ...state, ingredients: toggleValue(state.ingredients, value, remove) }
    default:
      return state
  }
}

function inferFilterValue(item: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>): string {
  try {
    const url = new URL(item.href, 'https://chef.test')
    const contract = getDiscoveryRailContract(item.type)
    for (const facet of contract.filterFacets) {
      const paramName = facetToPrimaryParam(facet)
      const paramValue = url.searchParams.get(paramName)
      if (paramValue) return slugify(paramValue)
    }
    const pathValue = url.pathname.split('/').filter(Boolean).at(-1)
    if (pathValue && url.pathname !== '/eat' && url.pathname !== '/chefs') return slugify(pathValue)
  } catch {
    // Fall through to label.
  }
  return slugify(item.label)
}

function facetToPrimaryParam(facet: DiscoveryFilterFacet): string {
  const map: Record<DiscoveryFilterFacet, string> = {
    cuisine: 'cuisine',
    craving: 'craving',
    dietary: 'dietary',
    fulfillment: 'fulfillment',
    occasion: 'intent',
    location: 'location',
    budget: 'budget',
    dateWindow: 'dateWindow',
    partySize: 'partySize',
    resultType: 'resultType',
    mood: 'mood',
    ingredient: 'ingredient',
  }
  return map[facet]
}

function cloneFilterState(state: DiscoveryFilterState): DiscoveryFilterState {
  return {
    ...state,
    cuisines: [...state.cuisines],
    cravings: [...state.cravings],
    dietary: [...state.dietary],
    resultTypes: [...state.resultTypes],
    moods: [...state.moods],
    ingredients: [...state.ingredients],
    selectedRailItems: state.selectedRailItems.map((item) => ({ ...item })),
  }
}

function normalizeSelections(value: unknown): DiscoveryRailSelection[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is DiscoveryRailSelection => {
      if (!isRecord(entry)) return false
      return (
        typeof entry.type === 'string' &&
        typeof entry.label === 'string' &&
        typeof entry.value === 'string' &&
        typeof entry.href === 'string'
      )
    })
    .map((entry) => ({
      type: entry.type,
      label: entry.label.trim(),
      value: slugify(entry.value),
      href: entry.href,
    }))
}

function readListParam(params: URLSearchParams, aliases: readonly string[]): string[] {
  const values: string[] = []
  for (const alias of aliases) {
    for (const value of params.getAll(alias)) {
      values.push(...value.split(','))
    }
  }
  return stringList(values)
}

function setListParam(params: URLSearchParams, key: string, values: readonly string[]): void {
  const normalized = stringList(values)
  if (normalized.length > 0) params.set(key, normalized.join(','))
}

function toggleSelection(
  selections: DiscoveryRailSelection[],
  selection: DiscoveryRailSelection
): DiscoveryRailSelection[] {
  const key = selectionKey(selection)
  if (selections.some((entry) => selectionKey(entry) === key)) {
    return selections.filter((entry) => selectionKey(entry) !== key)
  }
  return [...selections, selection]
}

function selectionKey(selection: DiscoveryRailSelection): string {
  return `${selection.type}:${selection.value}`
}

function toggleValue<T extends string>(values: readonly T[], value: T, remove: boolean): T[] {
  if (remove) return values.filter((entry) => entry !== value)
  if (values.includes(value)) return [...values]
  return [...values, value]
}

function token(
  tokens: ActiveDiscoveryFilterToken[],
  key: string,
  label: string,
  facet: ActiveDiscoveryFilterToken['facet'],
  clearParams: string[]
): void {
  tokens.push({ key, label, facet, clearParams })
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function inferFulfillment(value: string, label: string): FulfillmentMode {
  const source = `${value} ${label}`.toLowerCase()
  if (source.includes('restaurant') || source.includes('going_out')) return 'restaurant'
  if (source.includes('meal_prep')) return 'meal_prep'
  if (source.includes('chef') || source.includes('private')) return 'private_chef'
  return 'any'
}

function inferConsumerIntent(value: string, label: string): ConsumerIntent {
  const source = `${value} ${label}`.toLowerCase()
  if (source.includes('tonight')) return 'tonight'
  if (source.includes('weekend')) return 'weekend'
  if (source.includes('meal_prep')) return 'meal_prep'
  if (source.includes('team')) return 'team_dinner'
  if (source.includes('lunch')) return 'work_lunch'
  if (source.includes('late')) return 'late_night'
  if (source.includes('quick')) return 'quick_eats'
  if (source.includes('surprise')) return 'surprise_me'
  if (source.includes('private')) return 'private_chef'
  if (source.includes('out')) return 'going_out'
  return 'dinner_party'
}

function inferPartySize(value: string, label: string): number | undefined {
  return positiveInteger(value) ?? positiveInteger(label)
}

function inferResultType(value: string, label: string): DiscoveryResultTypeFilter {
  const source = `${value} ${label}`.toLowerCase()
  if (source.includes('menu')) return 'menu'
  if (source.includes('package')) return 'package'
  if (source.includes('meal_prep')) return 'meal_prep_item'
  if (source.includes('restaurant') || source.includes('listing')) return 'listing'
  return 'chef'
}

function stringList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return Array.from(
    new Set(raw.map((entry) => (typeof entry === 'string' ? slugify(entry) : '')).filter(Boolean))
  )
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isConsumerIntent(value: unknown): value is ConsumerIntent {
  return (
    typeof value === 'string' &&
    [
      'tonight',
      'weekend',
      'dinner_party',
      'meal_prep',
      'private_chef',
      'going_out',
      'team_dinner',
      'work_lunch',
      'late_night',
      'quick_eats',
      'surprise_me',
      'visual',
    ].includes(value)
  )
}

function isFulfillmentMode(value: unknown): value is FulfillmentMode {
  return (
    typeof value === 'string' && ['private_chef', 'restaurant', 'meal_prep', 'any'].includes(value)
  )
}

function isResultType(value: string): value is DiscoveryResultTypeFilter {
  return ['chef', 'listing', 'menu', 'package', 'meal_prep_item'].includes(value)
}

function isRemyTuning(value: unknown): value is DiscoveryFilterState['remyTuning'] {
  return typeof value === 'string' && ['off', 'light', 'guided'].includes(value)
}
