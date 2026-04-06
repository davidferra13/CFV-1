import { WEIGHT_CONVERSIONS, VOLUME_CONVERSIONS } from '@/lib/costing/knowledge'

export type ComparablePrice = {
  comparableCents: number
  displayUnit: string
  usedNormalization: boolean
  baseUnit: 'g' | 'ml' | 'ea' | null
  normalizedQuantity: number | null
  packCount: number
}

// Derived from canonical constants in lib/costing/knowledge.ts
const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: WEIGHT_CONVERSIONS.KG_TO_G,
  kilogram: WEIGHT_CONVERSIONS.KG_TO_G,
  kilograms: WEIGHT_CONVERSIONS.KG_TO_G,
  oz: WEIGHT_CONVERSIONS.OZ_TO_G,
  ounce: WEIGHT_CONVERSIONS.OZ_TO_G,
  ounces: WEIGHT_CONVERSIONS.OZ_TO_G,
  lb: WEIGHT_CONVERSIONS.LB_TO_G,
  lbs: WEIGHT_CONVERSIONS.LB_TO_G,
  pound: WEIGHT_CONVERSIONS.LB_TO_G,
  pounds: WEIGHT_CONVERSIONS.LB_TO_G,
}

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: VOLUME_CONVERSIONS.L_TO_ML,
  liter: VOLUME_CONVERSIONS.L_TO_ML,
  liters: VOLUME_CONVERSIONS.L_TO_ML,
  'fl oz': VOLUME_CONVERSIONS.FL_OZ_TO_ML,
  floz: VOLUME_CONVERSIONS.FL_OZ_TO_ML,
  gallon: VOLUME_CONVERSIONS.GALLON_TO_ML,
  gallons: VOLUME_CONVERSIONS.GALLON_TO_ML,
  gal: VOLUME_CONVERSIONS.GALLON_TO_ML,
  quart: VOLUME_CONVERSIONS.QUART_TO_ML,
  quarts: VOLUME_CONVERSIONS.QUART_TO_ML,
  qt: VOLUME_CONVERSIONS.QUART_TO_ML,
  pint: VOLUME_CONVERSIONS.PINT_TO_ML,
  pints: VOLUME_CONVERSIONS.PINT_TO_ML,
  pt: VOLUME_CONVERSIONS.PINT_TO_ML,
}

const COUNT_UNITS = new Set([
  'ea',
  'each',
  'unit',
  'units',
  'ct',
  'count',
  'pk',
  'pack',
  'packs',
  'pcs',
  'pc',
  'piece',
  'pieces',
  'dozen',
])

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
}

function parsePackCount(itemName: string): number {
  const normalized = normalizeToken(itemName)

  const explicitPack = normalized.match(/\b(\d+)\s*(ct|count|pk|pack|packs|pcs|pc|units?)\b/)
  if (explicitPack) return Math.max(1, Number(explicitPack[1]))

  const byX = normalized.match(/\b(\d+)\s*[xX]\s*(\d+(?:\.\d+)?)\s*([a-z ]+)\b/)
  if (byX) return Math.max(1, Number(byX[1]))

  return 1
}

function parseInlineSize(itemName: string): { size: number; measure: string } | null {
  const normalized = normalizeToken(itemName)
  const match = normalized.match(
    /\b(?:\d+\s*[xX]\s*)?(\d+(?:\.\d+)?)\s*(g|gram|grams|kg|kilogram|kilograms|oz|ounce|ounces|lb|lbs|pound|pounds|ml|milliliter|milliliters|l|liter|liters|fl oz|floz|ea|each|ct|count|pcs|pc)\b/
  )

  if (!match) return null
  const size = Number(match[1])
  if (!Number.isFinite(size) || size <= 0) return null
  return { size, measure: match[2] }
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toBaseUnit(
  size: number,
  measure: string
): { baseUnit: 'g' | 'ml' | 'ea'; quantity: number } | null {
  const token = normalizeToken(measure)

  if (token in WEIGHT_TO_GRAMS) {
    return { baseUnit: 'g', quantity: size * WEIGHT_TO_GRAMS[token] }
  }

  if (token in VOLUME_TO_ML) {
    return { baseUnit: 'ml', quantity: size * VOLUME_TO_ML[token] }
  }

  if (COUNT_UNITS.has(token)) {
    const quantity = token === 'dozen' ? size * 12 : size
    return { baseUnit: 'ea', quantity }
  }

  return null
}

export function normalizeIngredientName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+\s*[xX]\s*\d+(?:\.\d+)?\s*[a-z]+\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(oz|lb|lbs|g|kg|ml|l|ct|count|pack|pk|pcs|pc|ea)\b/g, ' ')
    .replace(/\b(pack|packs|case|cases|box|boxes)\b/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function deriveComparableUnitPrice(input: {
  priceCents: number
  itemName: string
  unitSize: number | string | null | undefined
  unitMeasure: string | null | undefined
}): ComparablePrice {
  const safePrice = Math.max(0, Number(input.priceCents || 0))
  const packCount = parsePackCount(input.itemName)

  const parsedUnitSize = toNumber(input.unitSize)
  const explicitMeasure = normalizeToken(input.unitMeasure)
  const normalizedItemName = normalizeToken(input.itemName)
  const inlineSize = parseInlineSize(input.itemName)

  let size = parsedUnitSize
  let measure = explicitMeasure

  if ((!size || !measure) && inlineSize) {
    size = size || inlineSize.size
    measure = measure || inlineSize.measure
  }

  if (size && measure) {
    const base = toBaseUnit(size, measure)
    if (base && base.quantity > 0) {
      const isInlineCountExpression = /\b\d+\s*(ct|count|pk|pack|packs|pcs|pc|units?)\b/.test(
        normalizedItemName
      )
      const packMultiplier =
        base.baseUnit === 'ea' && isInlineCountExpression && parsedUnitSize != null ? 1 : packCount
      const totalQuantity = base.quantity * packMultiplier
      if (totalQuantity > 0) {
        if (base.baseUnit === 'ea') {
          return {
            comparableCents: safePrice / totalQuantity,
            displayUnit: 'ea',
            usedNormalization: true,
            baseUnit: 'ea',
            normalizedQuantity: totalQuantity,
            packCount,
          }
        }

        return {
          comparableCents: (safePrice / totalQuantity) * 100,
          displayUnit: base.baseUnit === 'g' ? '100g' : '100ml',
          usedNormalization: true,
          baseUnit: base.baseUnit,
          normalizedQuantity: totalQuantity,
          packCount,
        }
      }
    }
  }

  return {
    comparableCents: safePrice,
    displayUnit: 'item',
    usedNormalization: false,
    baseUnit: null,
    normalizedQuantity: null,
    packCount,
  }
}
