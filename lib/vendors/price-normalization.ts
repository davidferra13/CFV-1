export type ComparablePrice = {
  comparableCents: number
  displayUnit: string
  usedNormalization: boolean
  baseUnit: 'g' | 'ml' | 'ea' | null
  normalizedQuantity: number | null
  packCount: number
}

const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
}

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  'fl oz': 29.5735,
  floz: 29.5735,
  gallon: 3785.41,
  gallons: 3785.41,
  gal: 3785.41,
  quart: 946.353,
  quarts: 946.353,
  qt: 946.353,
  pint: 473.176,
  pints: 473.176,
  pt: 473.176,
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
