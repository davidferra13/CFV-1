// External Directory Constants
// Business types, cuisine categories, and filter options for the /discover directory.

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
  { value: 'discovered', label: 'Discovered' },
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

export function getCuisineLabel(value: string): string {
  return CUISINE_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
