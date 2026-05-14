export type DiscoveryQueryFulfillment = 'any' | 'private_chef' | 'restaurant' | 'meal_prep'

export type DiscoveryQueryBudgetLabel = 'budget' | 'moderate' | 'premium' | 'luxury'

export type DiscoveryQuerySignalKind =
  | 'occasion'
  | 'party_size'
  | 'location'
  | 'budget'
  | 'dietary'
  | 'craving'
  | 'dish'
  | 'date_window'
  | 'fulfillment'

export type DiscoveryQuerySignal = {
  kind: DiscoveryQuerySignalKind
  value: string | number
  confidence: number
  text: string
}

export type DiscoveryQueryFilters = {
  occasion?: string
  partySize?: number
  location?: string
  maxBudgetPerPerson?: number
  budgetLabel?: DiscoveryQueryBudgetLabel
  cuisines: string[]
  dishes: string[]
  dietary: string[]
  dateWindow?: string
  fulfillment: DiscoveryQueryFulfillment
  neighborhoods: string[]
  terms: string[]
}

export type ParsedDiscoveryQuery = {
  rawQuery: string
  normalizedQuery: string
  confidence: number
  filters: DiscoveryQueryFilters
  signals: DiscoveryQuerySignal[]
  unparsedTerms: string[]
}

const OCCASIONS = [
  'birthday dinner',
  'birthday',
  'anniversary',
  'date night',
  'dinner party',
  'team dinner',
  'corporate lunch',
  'work lunch',
  'holiday party',
  'graduation',
  'family dinner',
]

const CUISINES = [
  'italian',
  'thai',
  'indian',
  'japanese',
  'mexican',
  'korean',
  'chinese',
  'french',
  'mediterranean',
  'seafood',
  'bbq',
  'vegan',
]

const DISHES = [
  'sushi',
  'tacos',
  'pizza',
  'ramen',
  'pasta',
  'dumplings',
  'steak',
  'brunch',
  'tasting menu',
]

const DIETARY = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'gluten free',
  'halal',
  'kosher',
  'dairy-free',
]

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'around',
  'at',
  'below',
  'for',
  'in',
  'less',
  'max',
  'near',
  'of',
  'or',
  'than',
  'the',
  'this',
  'to',
  'under',
  'with',
])

export function parseDiscoveryQuery(input: string): ParsedDiscoveryQuery {
  const rawQuery = input
  const normalizedQuery = normalizeFreeform(input)
  const signals: DiscoveryQuerySignal[] = []

  const occasion = firstPhrase(normalizedQuery, OCCASIONS)
  if (occasion) addSignal(signals, 'occasion', occasion, occasion, 0.86)

  const partySize = parsePartySize(normalizedQuery)
  if (partySize) addSignal(signals, 'party_size', partySize, String(partySize), 0.92)

  const budget = parseBudget(normalizedQuery)
  if (budget.maxBudgetPerPerson) {
    addSignal(signals, 'budget', budget.maxBudgetPerPerson, String(budget.maxBudgetPerPerson), 0.88)
  } else if (budget.budgetLabel) {
    addSignal(signals, 'budget', budget.budgetLabel, budget.budgetLabel, 0.72)
  }

  const location = parseLocation(normalizedQuery)
  if (location) addSignal(signals, 'location', location, location, 0.84)

  const dateWindow = parseDateWindow(normalizedQuery)
  if (dateWindow) addSignal(signals, 'date_window', dateWindow, dateWindow, 0.78)

  const fulfillment = parseFulfillment(normalizedQuery)
  if (fulfillment !== 'any') addSignal(signals, 'fulfillment', fulfillment, fulfillment, 0.75)

  const cuisines = unique(firstPhrases(normalizedQuery, CUISINES))
  for (const cuisine of cuisines) addSignal(signals, 'craving', cuisine, cuisine, 0.76)

  const dishes = unique(firstPhrases(normalizedQuery, DISHES))
  for (const dish of dishes) addSignal(signals, 'dish', dish, dish, 0.78)

  const dietary = unique(firstPhrases(normalizedQuery, DIETARY).map(normalizeDietary))
  for (const need of dietary) addSignal(signals, 'dietary', need, need, 0.82)

  const filters: DiscoveryQueryFilters = {
    ...(occasion ? { occasion } : {}),
    ...(partySize ? { partySize } : {}),
    ...(location ? { location } : {}),
    ...(budget.maxBudgetPerPerson ? { maxBudgetPerPerson: budget.maxBudgetPerPerson } : {}),
    ...(budget.budgetLabel ? { budgetLabel: budget.budgetLabel } : {}),
    cuisines,
    dishes,
    dietary,
    ...(dateWindow ? { dateWindow } : {}),
    fulfillment,
    neighborhoods: location ? [location] : [],
    terms: extractTerms(normalizedQuery, signals),
  }

  return {
    rawQuery,
    normalizedQuery,
    confidence: calculateConfidence(signals, normalizedQuery),
    filters,
    signals,
    unparsedTerms: filters.terms,
  }
}

export function discoveryQueryToSearchParams(parsed: ParsedDiscoveryQuery): URLSearchParams {
  const params = new URLSearchParams()
  const { filters } = parsed

  if (filters.occasion) params.set('intent', filters.occasion.replace(/\s+/g, '_'))
  if (filters.partySize) params.set('partySize', String(filters.partySize))
  if (filters.location) params.set('location', titleCase(filters.location))
  if (filters.maxBudgetPerPerson) params.set('maxBudget', String(filters.maxBudgetPerPerson))
  if (filters.budgetLabel) params.set('budget', filters.budgetLabel)
  if (filters.dietary[0]) params.set('dietary', filters.dietary[0])
  if (filters.dateWindow) params.set('dateWindow', filters.dateWindow.replace(/\s+/g, '_'))
  if (filters.fulfillment !== 'any') params.set('fulfillment', filters.fulfillment)

  const craving = filters.cuisines[0] ?? filters.dishes[0]
  if (craving) params.set('craving', craving)

  return params
}

function parsePartySize(source: string): number | undefined {
  const match =
    source.match(/\bfor\s+(\d{1,3})\b/) ??
    source.match(/\b(\d{1,3})\s*(people|guests|friends|diners|ppl|family|team)\b/)
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isInteger(value) && value > 0 && value <= 200 ? value : undefined
}

function parseBudget(source: string): {
  maxBudgetPerPerson?: number
  budgetLabel?: DiscoveryQueryBudgetLabel
} {
  const amount =
    source.match(/\b(?:under|below|max|less than)\s*\$?(\d{2,5})\b/) ??
    source.match(/<\s*\$?(\d{2,5})\b/)
  if (amount) return { maxBudgetPerPerson: Number(amount[1]) }
  if (source.includes('luxury') || source.includes('splurge')) return { budgetLabel: 'luxury' }
  if (source.includes('premium') || source.includes('upscale')) return { budgetLabel: 'premium' }
  if (source.includes('moderate') || source.includes('mid range'))
    return { budgetLabel: 'moderate' }
  if (source.includes('budget') || source.includes('cheap')) return { budgetLabel: 'budget' }
  return {}
}

function parseLocation(source: string): string | undefined {
  const match = source.match(
    /\b(?:near|in|around)\s+([a-z][a-z\s-]{1,40}?)(?=\s+(?:under|below|max|less|for|with|tonight|tomorrow|this|next|private|restaurant|chef|vegan|vegetarian|gluten|halal|kosher)\b|$)/
  )
  return match ? cleanPhrase(match[1]) : undefined
}

function parseDateWindow(source: string): string | undefined {
  if (source.includes('tonight')) return 'tonight'
  if (source.includes('tomorrow')) return 'tomorrow'
  if (source.includes('this weekend') || source.includes('weekend')) return 'this weekend'
  if (source.includes('next week')) return 'next week'
  if (source.includes('planning ahead')) return 'planning ahead'
  return undefined
}

function parseFulfillment(source: string): DiscoveryQueryFulfillment {
  if (source.includes('meal prep')) return 'meal_prep'
  if (source.includes('restaurant') || source.includes('going out') || source.includes('eat out')) {
    return 'restaurant'
  }
  if (source.includes('private chef') || source.includes('chef')) return 'private_chef'
  return 'any'
}

function addSignal(
  signals: DiscoveryQuerySignal[],
  kind: DiscoveryQuerySignalKind,
  value: string | number,
  text: string,
  confidence: number
): void {
  signals.push({ kind, value, text, confidence })
}

function firstPhrase(source: string, phrases: string[]): string | undefined {
  return phrases.find((phrase) => hasPhrase(source, phrase))
}

function firstPhrases(source: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => hasPhrase(source, phrase))
}

function hasPhrase(source: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(source)
}

function extractTerms(source: string, signals: DiscoveryQuerySignal[]): string[] {
  let remaining = ` ${source} `
  for (const signal of signals) {
    remaining = remaining.replace(
      new RegExp(`\\b${escapeRegExp(String(signal.text))}\\b`, 'g'),
      ' '
    )
  }
  return unique(
    remaining
      .replace(/\$?\d+/g, ' ')
      .split(/\s+/)
      .map(cleanPhrase)
      .filter((term) => term.length > 1 && !STOP_WORDS.has(term))
  )
}

function normalizeFreeform(value: string): string {
  return value
    .toLowerCase()
    .replace(/[?!.,"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDietary(value: string): string {
  return value.replace(/\s+/g, '-')
}

function cleanPhrase(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function calculateConfidence(signals: DiscoveryQuerySignal[], normalizedQuery: string): number {
  if (!normalizedQuery) return 0
  if (signals.length === 0) return 0.18
  const average = signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length
  const coverage = Math.min(0.2, signals.length * 0.025)
  return round(Math.min(0.97, average + coverage))
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
