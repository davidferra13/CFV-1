import { evaluateCanonicalIngredientPublicPublishability } from '@/lib/openclaw/public-ingredient-publish'

export type SystemIngredientCategory =
  | 'protein'
  | 'produce'
  | 'dairy'
  | 'pantry'
  | 'spice'
  | 'oil'
  | 'alcohol'
  | 'baking'
  | 'frozen'
  | 'canned'
  | 'fresh_herb'
  | 'dry_herb'
  | 'condiment'
  | 'beverage'
  | 'specialty'
  | 'other'

export type SystemIngredientStandardUnit = 'g' | 'oz' | 'ml' | 'fl_oz' | 'each' | 'bunch'
export type SystemIngredientUnitType = 'weight' | 'volume' | 'each' | 'bunch'

export interface CanonicalFoodReadinessInput {
  id: string
  name: string
  category: string | null
  standardUnit: string | null
  normalizationHits?: number
  hasCatalogFoodMatch?: boolean
  hasMarketPrice?: boolean
  hasDocumentation?: boolean
}

export interface CanonicalFoodReadiness {
  canonicalId: string
  canonicalName: string
  canonicalCategory: string | null
  publishReason: string
  isPublishable: boolean
  hasCatalogSupport: boolean
  hasMarketPrice: boolean
  hasDocumentation: boolean
  showsInChefFlow: boolean
  promotable: boolean
  chefFlowReady: boolean
  fullyReady: boolean
  missing: Array<'catalog_support' | 'pricing' | 'documentation'>
  systemIngredient: {
    name: string
    category: SystemIngredientCategory
    unitType: SystemIngredientUnitType
    standardUnit: SystemIngredientStandardUnit
    slug: string
    aliases: string[]
  }
}

const CANONICAL_TO_SYSTEM_CATEGORY: Record<string, SystemIngredientCategory> = {
  alcohol: 'alcohol',
  baking: 'baking',
  'baking essentials': 'baking',
  beverages: 'beverage',
  breakfast: 'pantry',
  candy: 'pantry',
  canned: 'canned',
  'canned goods & soups': 'canned',
  condiment: 'condiment',
  condiments: 'condiment',
  'condiments & sauces': 'condiment',
  dairy: 'dairy',
  'dairy & eggs': 'dairy',
  deli: 'specialty',
  'dry goods & pasta': 'pantry',
  'dry herbs': 'dry_herb',
  'dry herb': 'dry_herb',
  flipp: 'other',
  'flipp circular': 'other',
  'flipp-circular': 'other',
  frozen: 'frozen',
  'fresh herbs': 'fresh_herb',
  'fresh herb': 'fresh_herb',
  'grains & bakery': 'pantry',
  international: 'specialty',
  meat: 'protein',
  'meat & seafood': 'protein',
  'oils & spices': 'spice',
  'oils, vinegars, & spices': 'oil',
  pantry: 'pantry',
  'prepared & deli': 'specialty',
  'prepared foods': 'specialty',
  produce: 'produce',
  protein: 'protein',
  seafood: 'protein',
  snacks: 'pantry',
  'snacks & candy': 'pantry',
  spice: 'spice',
  spices: 'spice',
  'usda terminal': 'produce',
  'usda-terminal': 'produce',
}

const UNIT_ALIASES: Record<string, SystemIngredientStandardUnit> = {
  bunch: 'bunch',
  ct: 'each',
  each: 'each',
  ea: 'each',
  floz: 'fl_oz',
  'fl oz': 'fl_oz',
  'fl. oz': 'fl_oz',
  fl_oz: 'fl_oz',
  g: 'g',
  gal: 'fl_oz',
  gallon: 'fl_oz',
  grams: 'g',
  gram: 'g',
  kg: 'g',
  kilogram: 'g',
  kilograms: 'g',
  l: 'ml',
  lb: 'oz',
  lbs: 'oz',
  liter: 'ml',
  liters: 'ml',
  litre: 'ml',
  litres: 'ml',
  ml: 'ml',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  pound: 'oz',
  pounds: 'oz',
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function trimFoodName(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripTrailingFoodQualifiers(value: string): string {
  return value.replace(
    /\b(raw|fresh|cooked|dried|frozen|canned|boiled|roasted|smoked|ground|whole|sliced|diced|chopped|minced|prepared|unsweetened|sweetened|plain|regular)\b/gi,
    ' '
  )
}

function cleanFoodAlias(value: string): string {
  return trimFoodName(
    stripTrailingFoodQualifiers(
      value
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ')
    )
  )
}

export function normalizeFoodLookupKey(value: string): string {
  return cleanFoodAlias(value)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugifyFoodName(name: string): string {
  const ascii = cleanFoodAlias(name)
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/&/g, ' and ')

  const slug = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return slug || 'ingredient'
}

export function buildFoodAliases(name: string): string[] {
  const raw = trimFoodName(name).toLowerCase()
  const firstSegment = trimFoodName(raw.split(',')[0] ?? '')
  const cleaned = cleanFoodAlias(name)
  const slugWords = slugifyFoodName(name).replace(/-/g, ' ')
  const values = [raw, firstSegment, cleaned, slugWords]

  return [...new Set(values.map(normalizeFoodLookupKey).filter((value) => value.length >= 2))]
}

export function mapCanonicalCategoryToSystemCategory(
  category: string | null | undefined
): SystemIngredientCategory {
  const normalized = normalizeText(category)
  return CANONICAL_TO_SYSTEM_CATEGORY[normalized] ?? 'other'
}

export function normalizeFoodStandardUnit(
  standardUnit: string | null | undefined
): SystemIngredientStandardUnit {
  const normalized = normalizeText(standardUnit)
  return UNIT_ALIASES[normalized] ?? 'each'
}

export function deriveSystemUnitType(
  standardUnit: SystemIngredientStandardUnit
): SystemIngredientUnitType {
  if (standardUnit === 'g' || standardUnit === 'oz') return 'weight'
  if (standardUnit === 'ml' || standardUnit === 'fl_oz') return 'volume'
  if (standardUnit === 'bunch') return 'bunch'
  return 'each'
}

export function evaluateCanonicalFoodReadiness(
  input: CanonicalFoodReadinessInput
): CanonicalFoodReadiness {
  const hasCatalogSupport = input.hasCatalogFoodMatch === true || (input.normalizationHits ?? 0) > 0
  const publishability = evaluateCanonicalIngredientPublicPublishability({
    id: input.id,
    name: input.name,
    category: input.category,
    hasFoodProductMatch: hasCatalogSupport,
  })
  const standardUnit = normalizeFoodStandardUnit(input.standardUnit)
  const unitType = deriveSystemUnitType(standardUnit)
  const hasMarketPrice = input.hasMarketPrice === true
  const hasDocumentation = input.hasDocumentation === true
  const showsInChefFlow = publishability.allowed && hasCatalogSupport
  const promotable = showsInChefFlow
  const chefFlowReady = promotable && hasMarketPrice
  const fullyReady = chefFlowReady && hasDocumentation
  const missing: CanonicalFoodReadiness['missing'] = []

  if (!hasCatalogSupport) missing.push('catalog_support')
  if (!hasMarketPrice) missing.push('pricing')
  if (!hasDocumentation) missing.push('documentation')

  return {
    canonicalId: input.id,
    canonicalName: trimFoodName(input.name),
    canonicalCategory: input.category,
    publishReason: publishability.reason,
    isPublishable: publishability.allowed,
    hasCatalogSupport,
    hasMarketPrice,
    hasDocumentation,
    showsInChefFlow,
    promotable,
    chefFlowReady,
    fullyReady,
    missing,
    systemIngredient: {
      name: trimFoodName(input.name),
      category: mapCanonicalCategoryToSystemCategory(input.category),
      unitType,
      standardUnit,
      slug: slugifyFoodName(input.name),
      aliases: buildFoodAliases(input.name),
    },
  }
}
