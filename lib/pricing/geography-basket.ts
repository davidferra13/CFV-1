export type GeographicPricingSourceClass =
  | 'local_observed'
  | 'regional_observed'
  | 'national_observed'
  | 'chef_owned'
  | 'USDA_or_public_baseline'
  | 'category_baseline'
  | 'modeled_fallback'
  | 'unresolved'

export type GeographicQuoteSafety =
  | 'safe_to_quote'
  | 'verify_first'
  | 'planning_only'
  | 'not_usable'

export type GeographicPricingGeography = {
  code: string
  name: string
  kind: 'state' | 'district' | 'territory'
  region: string
}

export type GeographicPricingBasketItem = {
  ingredientKey: string
  displayName: string
  category: string
  targetUnit: string
  seasonalMonth: number | null
  aliases: string[]
}

export const GEOGRAPHIC_PRICING_GEOGRAPHIES: GeographicPricingGeography[] = [
  { code: 'AL', name: 'Alabama', kind: 'state', region: 'southeast' },
  { code: 'AK', name: 'Alaska', kind: 'state', region: 'west' },
  { code: 'AZ', name: 'Arizona', kind: 'state', region: 'west' },
  { code: 'AR', name: 'Arkansas', kind: 'state', region: 'southeast' },
  { code: 'CA', name: 'California', kind: 'state', region: 'west' },
  { code: 'CO', name: 'Colorado', kind: 'state', region: 'west' },
  { code: 'CT', name: 'Connecticut', kind: 'state', region: 'northeast' },
  { code: 'DE', name: 'Delaware', kind: 'state', region: 'south_atlantic' },
  { code: 'FL', name: 'Florida', kind: 'state', region: 'southeast' },
  { code: 'GA', name: 'Georgia', kind: 'state', region: 'southeast' },
  { code: 'HI', name: 'Hawaii', kind: 'state', region: 'west' },
  { code: 'ID', name: 'Idaho', kind: 'state', region: 'west' },
  { code: 'IL', name: 'Illinois', kind: 'state', region: 'midwest' },
  { code: 'IN', name: 'Indiana', kind: 'state', region: 'midwest' },
  { code: 'IA', name: 'Iowa', kind: 'state', region: 'midwest' },
  { code: 'KS', name: 'Kansas', kind: 'state', region: 'midwest' },
  { code: 'KY', name: 'Kentucky', kind: 'state', region: 'southeast' },
  { code: 'LA', name: 'Louisiana', kind: 'state', region: 'southeast' },
  { code: 'ME', name: 'Maine', kind: 'state', region: 'northeast' },
  { code: 'MD', name: 'Maryland', kind: 'state', region: 'south_atlantic' },
  { code: 'MA', name: 'Massachusetts', kind: 'state', region: 'northeast' },
  { code: 'MI', name: 'Michigan', kind: 'state', region: 'midwest' },
  { code: 'MN', name: 'Minnesota', kind: 'state', region: 'midwest' },
  { code: 'MS', name: 'Mississippi', kind: 'state', region: 'southeast' },
  { code: 'MO', name: 'Missouri', kind: 'state', region: 'midwest' },
  { code: 'MT', name: 'Montana', kind: 'state', region: 'west' },
  { code: 'NE', name: 'Nebraska', kind: 'state', region: 'midwest' },
  { code: 'NV', name: 'Nevada', kind: 'state', region: 'west' },
  { code: 'NH', name: 'New Hampshire', kind: 'state', region: 'northeast' },
  { code: 'NJ', name: 'New Jersey', kind: 'state', region: 'northeast' },
  { code: 'NM', name: 'New Mexico', kind: 'state', region: 'west' },
  { code: 'NY', name: 'New York', kind: 'state', region: 'northeast' },
  { code: 'NC', name: 'North Carolina', kind: 'state', region: 'southeast' },
  { code: 'ND', name: 'North Dakota', kind: 'state', region: 'midwest' },
  { code: 'OH', name: 'Ohio', kind: 'state', region: 'midwest' },
  { code: 'OK', name: 'Oklahoma', kind: 'state', region: 'southwest' },
  { code: 'OR', name: 'Oregon', kind: 'state', region: 'west' },
  { code: 'PA', name: 'Pennsylvania', kind: 'state', region: 'northeast' },
  { code: 'RI', name: 'Rhode Island', kind: 'state', region: 'northeast' },
  { code: 'SC', name: 'South Carolina', kind: 'state', region: 'southeast' },
  { code: 'SD', name: 'South Dakota', kind: 'state', region: 'midwest' },
  { code: 'TN', name: 'Tennessee', kind: 'state', region: 'southeast' },
  { code: 'TX', name: 'Texas', kind: 'state', region: 'southwest' },
  { code: 'UT', name: 'Utah', kind: 'state', region: 'west' },
  { code: 'VT', name: 'Vermont', kind: 'state', region: 'northeast' },
  { code: 'VA', name: 'Virginia', kind: 'state', region: 'south_atlantic' },
  { code: 'WA', name: 'Washington', kind: 'state', region: 'west' },
  { code: 'WV', name: 'West Virginia', kind: 'state', region: 'south_atlantic' },
  { code: 'WI', name: 'Wisconsin', kind: 'state', region: 'midwest' },
  { code: 'WY', name: 'Wyoming', kind: 'state', region: 'west' },
  { code: 'DC', name: 'Washington DC', kind: 'district', region: 'south_atlantic' },
  { code: 'PR', name: 'Puerto Rico', kind: 'territory', region: 'territory' },
  { code: 'GU', name: 'Guam', kind: 'territory', region: 'territory' },
  { code: 'AS', name: 'American Samoa', kind: 'territory', region: 'territory' },
  { code: 'MP', name: 'Northern Mariana Islands', kind: 'territory', region: 'territory' },
  { code: 'VI', name: 'US Virgin Islands', kind: 'territory', region: 'territory' },
]

export const GEOGRAPHIC_PRICING_BASKET: GeographicPricingBasketItem[] = [
  {
    ingredientKey: 'chicken_breast',
    displayName: 'Chicken Breast (Boneless, Skinless)',
    category: 'protein',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['chicken breast', 'boneless skinless chicken breast'],
  },
  {
    ingredientKey: 'salmon',
    displayName: 'Salmon Fillet',
    category: 'protein',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['salmon', 'salmon fillet'],
  },
  {
    ingredientKey: 'rice',
    displayName: 'Long Grain White Rice',
    category: 'pantry',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['rice', 'white rice', 'long grain rice'],
  },
  {
    ingredientKey: 'potatoes',
    displayName: 'Potatoes',
    category: 'produce',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['potatoes', 'potato'],
  },
  {
    ingredientKey: 'butter',
    displayName: 'Butter (Dairy)',
    category: 'dairy',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['butter', 'unsalted butter', 'salted butter'],
  },
  {
    ingredientKey: 'olive_oil',
    displayName: 'Extra Virgin Olive Oil',
    category: 'oil',
    targetUnit: 'fl oz',
    seasonalMonth: null,
    aliases: ['olive oil', 'extra virgin olive oil'],
  },
  {
    ingredientKey: 'garlic',
    displayName: 'Garlic',
    category: 'produce',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['garlic', 'fresh garlic'],
  },
  {
    ingredientKey: 'onion',
    displayName: 'Onions',
    category: 'produce',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['onion', 'onions'],
  },
  {
    ingredientKey: 'lemon',
    displayName: 'lemons',
    category: 'produce',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['lemon', 'lemons'],
  },
  {
    ingredientKey: 'parsley',
    displayName: 'Parsley',
    category: 'produce',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['parsley', 'fresh parsley'],
  },
  {
    ingredientKey: 'heavy_cream',
    displayName: 'Heavy Cream',
    category: 'dairy',
    targetUnit: 'fl oz',
    seasonalMonth: null,
    aliases: ['heavy cream', 'whipping cream'],
  },
  {
    ingredientKey: 'flour',
    displayName: 'Flour (Pantry)',
    category: 'pantry',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['flour', 'all purpose flour'],
  },
  {
    ingredientKey: 'eggs',
    displayName: 'Eggs',
    category: 'dairy',
    targetUnit: 'each',
    seasonalMonth: null,
    aliases: ['eggs', 'large eggs'],
  },
  {
    ingredientKey: 'seasonal_vegetable',
    displayName: 'Asparagus',
    category: 'produce',
    targetUnit: 'lb',
    seasonalMonth: 4,
    aliases: ['asparagus', 'seasonal vegetable'],
  },
  {
    ingredientKey: 'chocolate',
    displayName: 'Chocolate (Baking)',
    category: 'baking',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['chocolate', 'baking chocolate'],
  },
  {
    ingredientKey: 'berries',
    displayName: 'Blueberries',
    category: 'produce',
    targetUnit: 'lb',
    seasonalMonth: null,
    aliases: ['berries', 'blueberries'],
  },
]

export const GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS =
  GEOGRAPHIC_PRICING_GEOGRAPHIES.length * GEOGRAPHIC_PRICING_BASKET.length

export const SAFE_TO_QUOTE_MAX_FRESHNESS_DAYS = 7
export const VERIFY_FIRST_MAX_FRESHNESS_DAYS = 30
export const SAFE_TO_QUOTE_MIN_CONFIDENCE = 0.75
export const SAFE_TO_QUOTE_MIN_UNIT_CONFIDENCE = 0.8

export function getGeographyByCode(code: string): GeographicPricingGeography | null {
  const normalized = code.trim().toUpperCase()
  return GEOGRAPHIC_PRICING_GEOGRAPHIES.find((geography) => geography.code === normalized) ?? null
}

export function isVirtualRegionalStore(input: {
  storeCity?: string | null
  storeState?: string | null
  storeZip?: string | null
}): boolean {
  return (
    (input.storeZip ?? '').trim() === '00000' ||
    (input.storeCity ?? '').trim().toLowerCase() === 'regional' ||
    ((input.storeState ?? '').trim().toUpperCase() === 'MA' &&
      (input.storeZip ?? '').trim() === '00000')
  )
}
