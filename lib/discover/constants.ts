// External Directory Constants
// Business types, cuisine categories, and filter options for the /nearby directory.

export const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'private_chef', label: 'Private Chef' },
  { value: 'caterer', label: 'Caterer' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'meal_prep', label: 'Meal Prep' },
  { value: 'pop_up', label: 'Pop-Up' },
  { value: 'supper_club', label: 'Supper Club' },
] as const

export const CUISINE_CATEGORIES = [
  { value: 'american', label: 'American' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'thai', label: 'Thai' },
  { value: 'indian', label: 'Indian' },
  { value: 'french', label: 'French' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'korean', label: 'Korean' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'middle_eastern', label: 'Middle Eastern' },
  { value: 'southern', label: 'Southern' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'fusion', label: 'Fusion' },
  { value: 'farm_to_table', label: 'Farm to Table' },
  { value: 'desserts', label: 'Desserts & Pastry' },
  { value: 'other', label: 'Other' },
] as const

export const PRICE_RANGES = [
  { value: '$', label: '$' },
  { value: '$$', label: '$$' },
  { value: '$$$', label: '$$$' },
  { value: '$$$$', label: '$$$$' },
] as const

export const LISTING_STATUSES = [
  { value: 'discovered', label: 'Listed' },
  { value: 'pending_submission', label: 'Pending Review' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'verified', label: 'Verified' },
  { value: 'removed', label: 'Removed' },
] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]['value']
export type CuisineCategory = (typeof CUISINE_CATEGORIES)[number]['value']
export type PriceRange = (typeof PRICE_RANGES)[number]['value']
export type ListingStatus = (typeof LISTING_STATUSES)[number]['value']

export function getBusinessTypeLabel(value: string): string {
  return BUSINESS_TYPES.find((t) => t.value === value)?.label ?? value
}

export function getBusinessTypeCollectionLabel(value: string): string {
  switch (value) {
    case 'restaurant':
      return 'Restaurants'
    case 'private_chef':
      return 'Private Chefs'
    case 'caterer':
      return 'Caterers'
    case 'food_truck':
      return 'Food Trucks'
    case 'bakery':
      return 'Bakeries'
    case 'meal_prep':
      return 'Meal Prep'
    case 'pop_up':
      return 'Pop-Ups'
    case 'supper_club':
      return 'Supper Clubs'
    default:
      return getBusinessTypeLabel(value)
  }
}

export function getCuisineLabel(value: string): string {
  return CUISINE_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export const ITEMS_PER_PAGE = 24

export const US_STATES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

const US_STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code])
) as Record<string, string>

function normalizeStateInput(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

export function normalizeUsStateCode(value: string | null | undefined): string | null {
  const normalized = normalizeStateInput(value)
  if (!normalized) return null

  const upper = normalized.toUpperCase()
  if (upper in US_STATES) return upper

  return US_STATE_NAME_TO_CODE[normalized.toLowerCase()] ?? null
}

export function getStateName(code: string): string {
  const normalizedCode = normalizeUsStateCode(code)
  return normalizedCode ? US_STATES[normalizedCode] : code
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
