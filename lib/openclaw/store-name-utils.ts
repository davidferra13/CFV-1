const NON_RETAIL_KEYWORDS = [
  'bureau of labor statistics',
  'federal reserve economic data',
  'agricultural marketing service',
  'usda',
  'fred',
  'government baseline',
  'commodity',
]

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  aldi: 'ALDI',
  bjs: "BJ's Wholesale Club",
  bjs_wholesale_club: "BJ's Wholesale Club",
  costco: 'Costco',
  cvs_pharmacy: 'CVS Pharmacy',
  demoulas_market_basket: 'Market Basket',
  dollar_general: 'Dollar General',
  family_dollar: 'Family Dollar',
  hannaford: 'Hannaford',
  market_basket: 'Market Basket',
  mckinnons_supermarkets: "McKinnon's Supermarkets",
  price_chopper: 'Price Chopper',
  restaurant_depot: 'Restaurant Depot',
  sams_club: "Sam's Club",
  shaws: "Shaw's",
  stop_and_shop: 'Stop & Shop',
  target: 'Target',
  trader_joes: "Trader Joe's",
  walgreens: 'Walgreens',
  walmart: 'Walmart',
  wegmans: 'Wegmans',
  whole_foods: 'Whole Foods',
}

const CURATED_STORE_KEYS = new Set(Object.keys(DISPLAY_NAME_OVERRIDES))

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripStoreDecorators(name: string): string {
  return collapseWhitespace(
    name
      .replace(/_/g, ' ')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\bweekly flyer\b/gi, ' ')
      .replace(/\bweekly specials?\b/gi, ' ')
      .replace(/\bweekly ads?\b/gi, ' ')
      .replace(/\bcircular\b/gi, ' ')
      .replace(/\bflyer\b/gi, ' ')
  )
}

function toLooseTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function looksLikeHumanReadableStoreName(value: string): boolean {
  const cleaned = collapseWhitespace(value)
  if (!cleaned || cleaned.length < 3) return false
  if (cleaned.includes('-')) return false
  if (/\d/.test(cleaned)) return false

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length > 6) return false

  return words.some((word) => word.length > 2)
}

export function normalizeStoreNameForMatch(name: string): string {
  return stripStoreDecorators(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['.\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function cleanStoreDisplayName(name: string): string {
  const cleaned = stripStoreDecorators(name)
  const normalized = normalizeStoreNameForMatch(cleaned).replace(/\s+/g, '_')
  if (DISPLAY_NAME_OVERRIDES[normalized]) return DISPLAY_NAME_OVERRIDES[normalized]
  if (cleaned === cleaned.toLowerCase()) return toLooseTitleCase(cleaned)
  return cleaned
}

export function isLikelyRetailStoreName(name: string): boolean {
  const normalized = normalizeStoreNameForMatch(name)
  if (!normalized) return false

  if (NON_RETAIL_KEYWORDS.some((keyword) => normalized.includes(keyword))) return false

  const key = normalized.replace(/\s+/g, '_')
  if (CURATED_STORE_KEYS.has(key)) return true

  return looksLikeHumanReadableStoreName(stripStoreDecorators(name))
}

function scoreRawStoreVariant(rawName: string, label: string): number {
  const normalizedRaw = rawName.trim().toLowerCase()
  const normalizedLabel = label.trim().toLowerCase()

  if (normalizedRaw === normalizedLabel) return 100
  if (/\(via instacart\)/i.test(rawName)) return 85
  if (!/[()]/.test(rawName) && !/\bweekly\b|\bflyer\b/i.test(rawName)) return 80
  if (/\(via flipp\)/i.test(rawName)) return 70
  if (/\bweekly\b|\bflyer\b/i.test(rawName)) return 55
  return 60
}

export type TrackedStoreSuggestion = {
  label: string
  rawName: string
  variantCount: number
}

export function buildTrackedStoreSuggestions(rawNames: string[]): TrackedStoreSuggestion[] {
  const grouped = new Map<
    string,
    { label: string; rawName: string; variantCount: number; score: number }
  >()

  for (const rawName of rawNames) {
    if (!isLikelyRetailStoreName(rawName)) continue

    const label = cleanStoreDisplayName(rawName)
    const key = normalizeStoreNameForMatch(label)
    if (!key) continue

    const nextScore = scoreRawStoreVariant(rawName, label)
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, { label, rawName, variantCount: 1, score: nextScore })
      continue
    }

    existing.variantCount += 1
    if (nextScore > existing.score) {
      existing.rawName = rawName
      existing.score = nextScore
    }
  }

  const suggestions = Array.from(grouped.values())
    .map(({ label, rawName, variantCount }) => ({ label, rawName, variantCount }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const curatedSuggestions = suggestions.filter((suggestion) =>
    CURATED_STORE_KEYS.has(normalizeStoreNameForMatch(suggestion.label).replace(/\s+/g, '_'))
  )

  return curatedSuggestions.length > 0 ? curatedSuggestions : suggestions
}
