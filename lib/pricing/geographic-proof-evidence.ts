import type { GeographicPricingBasketItem } from '@/lib/pricing/geography-basket'
import { normalizeStandardUnit } from '@/lib/pricing/standard-unit-normalization'

export type LocalProductMatchScore = {
  confidence: number
  reason: string
  matchedAlias: string | null
}

export type LocalUnitConversionScore = {
  confidence: number
  reason: string
}

type UnitConversionInput = {
  hasStandardUnitPrice: boolean
  targetUnit: string
  productSizeValue?: number | null
  productSizeUnit?: string | null
}

const PACKAGE_NOISE_BY_INGREDIENT: Record<string, string[]> = {
  chicken_breast: [
    'broth',
    'drumstick',
    'drumsticks',
    'ground',
    'nugget',
    'nuggets',
    'rotisserie',
    'sausage',
    'stock',
    'thigh',
    'thighs',
    'wing',
    'wings',
  ],
  salmon: [
    'burger',
    'cake',
    'canned',
    'dip',
    'jerky',
    'packet',
    'patty',
    'patties',
    'pouch',
    'smoked',
  ],
  rice: ['cake', 'cakes', 'cereal', 'cracker', 'crackers', 'milk', 'pilaf', 'seasoning', 'side'],
  potatoes: ['chip', 'chips', 'fries', 'frozen', 'hash', 'instant', 'mashed'],
  butter: ['almond', 'body', 'cookie', 'cookies', 'lotion', 'peanut', 'spread'],
  olive_oil: ['dressing', 'mayo', 'mayonnaise', 'spray'],
  garlic: ['crouton', 'croutons', 'dip', 'dressing', 'powder', 'salt', 'sauce', 'seasoning'],
  onion: ['dip', 'dressing', 'powder', 'salt', 'sauce', 'seasoning'],
  lemon: ['ade', 'cookie', 'cookies', 'extract', 'juice', 'lemonade', 'pie'],
  parsley: ['dried', 'flakes', 'seasoning'],
  heavy_cream: ['coffee creamer', 'cream cheese', 'ice cream', 'sour cream', 'whipped cream'],
  flour: ['almond', 'bread', 'cake', 'coconut', 'mix', 'tortilla'],
  eggs: ['egg noodles', 'nog', 'noodles', 'substitute'],
  seasonal_vegetable: ['sauce', 'soup'],
  chocolate: ['bar', 'candy', 'cereal', 'cookie', 'cookies', 'milk', 'syrup'],
  berries: ['cereal', 'granola', 'jam', 'muffin', 'muffins', 'preserve', 'preserves', 'yogurt'],
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function singularToken(value: string): string {
  if (value.length > 3 && value.endsWith('ies')) return `${value.slice(0, -3)}y`
  if (value.length > 3 && value.endsWith('es')) return value.slice(0, -2)
  if (value.length > 3 && value.endsWith('s')) return value.slice(0, -1)
  return value
}

function tokensFor(value: string): string[] {
  return normalizeText(value).split(' ').filter(Boolean).map(singularToken)
}

function aliasesForMatch(item: GeographicPricingBasketItem): string[] {
  return Array.from(
    new Set([item.displayName, item.ingredientKey.replace(/_/g, ' '), ...item.aliases])
  )
    .map(normalizeText)
    .filter(Boolean)
}

function containsPhrase(productText: string, alias: string): boolean {
  return ` ${productText} `.includes(` ${alias} `)
}

function hasAllAliasTokens(productTokens: Set<string>, alias: string): boolean {
  const aliasTokens = tokensFor(alias)
  return aliasTokens.length > 0 && aliasTokens.every((token) => productTokens.has(token))
}

function hasPackageNoise(productText: string, item: GeographicPricingBasketItem): boolean {
  const noise = PACKAGE_NOISE_BY_INGREDIENT[item.ingredientKey] ?? []
  return noise.some((phrase) => containsPhrase(productText, normalizeText(phrase)))
}

export function scoreLocalProductMatch(
  productName: string | null | undefined,
  item: GeographicPricingBasketItem
): LocalProductMatchScore {
  const productText = normalizeText(productName)
  if (!productText) {
    return { confidence: 0, reason: 'missing product name', matchedAlias: null }
  }

  const aliases = aliasesForMatch(item)
  const productTokens = new Set(tokensFor(productText))
  const noisyPackage = hasPackageNoise(productText, item)

  let best: LocalProductMatchScore = {
    confidence: 0.25,
    reason: 'no ingredient alias match',
    matchedAlias: null,
  }

  for (const alias of aliases) {
    const aliasTokens = tokensFor(alias)
    if (aliasTokens.length === 0) continue

    let confidence = 0
    let reason = ''

    if (productText === alias) {
      confidence = 0.94
      reason = 'exact product alias'
    } else if (containsPhrase(productText, alias)) {
      confidence = aliasTokens.length > 1 ? 0.88 : 0.8
      reason = 'product contains ingredient alias'
    } else if (hasAllAliasTokens(productTokens, alias)) {
      confidence = aliasTokens.length > 1 ? 0.84 : 0.76
      reason = 'product contains all alias tokens'
    } else if (aliasTokens.some((token) => productTokens.has(token))) {
      confidence = 0.58
      reason = 'partial alias token overlap'
    }

    if (confidence > best.confidence) {
      best = { confidence, reason, matchedAlias: alias }
    }
  }

  if (noisyPackage && best.confidence >= 0.75) {
    return {
      confidence: 0.62,
      reason: 'ingredient alias match capped by package noise',
      matchedAlias: best.matchedAlias,
    }
  }

  return best
}

function sizeUnitConvertsToTarget(
  sizeUnit: string | null | undefined,
  targetUnit: string
): boolean {
  return normalizeStandardUnit(sizeUnit) === normalizeStandardUnit(targetUnit)
}

export function scoreLocalUnitConversion(input: UnitConversionInput): LocalUnitConversionScore {
  if (input.hasStandardUnitPrice) {
    return { confidence: 0.88, reason: 'observed standard-unit price' }
  }

  const hasConvertiblePackageSize =
    typeof input.productSizeValue === 'number' &&
    Number.isFinite(input.productSizeValue) &&
    input.productSizeValue > 0 &&
    Boolean(input.productSizeUnit) &&
    sizeUnitConvertsToTarget(input.productSizeUnit ?? null, input.targetUnit)

  if (hasConvertiblePackageSize && input.productSizeValue === 1) {
    return { confidence: 0.82, reason: 'single-unit package matches target unit' }
  }

  if (hasConvertiblePackageSize) {
    return {
      confidence: 0.72,
      reason: 'package size can be converted but standard-unit price is missing',
    }
  }

  return { confidence: 0.35, reason: 'no reliable unit conversion proof' }
}
