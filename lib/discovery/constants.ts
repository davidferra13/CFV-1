export const DISCOVERY_CUISINE_OPTIONS = [
  { value: 'american', label: 'American' },
  { value: 'italian', label: 'Italian' },
  { value: 'french', label: 'French' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'thai', label: 'Thai' },
  { value: 'indian', label: 'Indian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'korean', label: 'Korean' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'southern', label: 'Southern' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'farm_to_table', label: 'Farm-to-table' },
  { value: 'latin', label: 'Latin' },
  { value: 'middle_eastern', label: 'Middle Eastern' },
] as const

export const DISCOVERY_SERVICE_TYPE_OPTIONS = [
  { value: 'private_dinner', label: 'Private dinner' },
  { value: 'meal_prep', label: 'Meal prep' },
  { value: 'catering', label: 'Catering' },
  { value: 'cooking_class', label: 'Cooking class' },
  { value: 'event_chef', label: 'Event chef' },
  { value: 'personal_chef', label: 'Personal chef' },
  { value: 'corporate', label: 'Corporate dining' },
  { value: 'retreat', label: 'Retreat / multi-day' },
  { value: 'popup', label: 'Pop-up' },
  { value: 'wedding', label: 'Wedding / celebration' },
] as const

export const DISCOVERY_PRICE_RANGE_OPTIONS = [
  { value: 'budget', label: 'Budget-friendly' },
  { value: 'mid', label: 'Mid-range' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
] as const

export type DiscoveryCuisine = (typeof DISCOVERY_CUISINE_OPTIONS)[number]['value']
export type DiscoveryServiceType = (typeof DISCOVERY_SERVICE_TYPE_OPTIONS)[number]['value']
export type DiscoveryPriceRange = (typeof DISCOVERY_PRICE_RANGE_OPTIONS)[number]['value']

function buildLabelMap(options: ReadonlyArray<{ value: string; label: string }>) {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<
    string,
    string
  >
}

export const DISCOVERY_CUISINE_LABELS = buildLabelMap(DISCOVERY_CUISINE_OPTIONS)
export const DISCOVERY_SERVICE_TYPE_LABELS = buildLabelMap(DISCOVERY_SERVICE_TYPE_OPTIONS)
export const DISCOVERY_PRICE_RANGE_LABELS = buildLabelMap(DISCOVERY_PRICE_RANGE_OPTIONS)

function normalizeOptionToken(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function canonicalizeOptionValue(
  value: string | null | undefined,
  options: ReadonlyArray<{ value: string; label: string }>
) {
  const token = normalizeOptionToken(value)
  if (!token) return null

  const matched = options.find(
    (option) =>
      normalizeOptionToken(option.value) === token || normalizeOptionToken(option.label) === token
  )

  return matched?.value ?? null
}

export function canonicalizeDiscoveryCuisine(value: string | null | undefined) {
  return canonicalizeOptionValue(value, DISCOVERY_CUISINE_OPTIONS)
}

export function canonicalizeDiscoveryServiceType(value: string | null | undefined) {
  return canonicalizeOptionValue(value, DISCOVERY_SERVICE_TYPE_OPTIONS)
}

export function canonicalizeDiscoveryPriceRange(value: string | null | undefined) {
  return canonicalizeOptionValue(value, DISCOVERY_PRICE_RANGE_OPTIONS)
}

export function humanizeDiscoveryValue(value: string | null | undefined) {
  const normalized = normalizeOptionToken(value)
  if (!normalized) return ''
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getDiscoveryCuisineLabel(value: string | null | undefined) {
  const canonical = canonicalizeDiscoveryCuisine(value)
  return (canonical && DISCOVERY_CUISINE_LABELS[canonical]) || humanizeDiscoveryValue(value)
}

export function getDiscoveryServiceTypeLabel(value: string | null | undefined) {
  const canonical = canonicalizeDiscoveryServiceType(value)
  return (canonical && DISCOVERY_SERVICE_TYPE_LABELS[canonical]) || humanizeDiscoveryValue(value)
}

export function getDiscoveryPriceRangeLabel(value: string | null | undefined) {
  const canonical = canonicalizeDiscoveryPriceRange(value)
  return (canonical && DISCOVERY_PRICE_RANGE_LABELS[canonical]) || humanizeDiscoveryValue(value)
}
