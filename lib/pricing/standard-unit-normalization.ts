export type StandardUnit = 'lb' | 'fl oz' | 'each'

export type StandardUnitPrice = {
  priceCents: number
  unit: StandardUnit
}

function toPositiveNumber(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null
}

function normalizeUnitText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function normalizeStandardUnit(value: string | null | undefined): StandardUnit | null {
  const unit = normalizeUnitText(value)
  if (
    ['lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces', 'kg', 'g', 'gram', 'grams'].includes(
      unit
    )
  ) {
    return 'lb'
  }
  if (
    [
      'fl oz',
      'floz',
      'fluid ounce',
      'fluid ounces',
      'gal',
      'gallon',
      'gallons',
      'l',
      'liter',
      'liters',
      'ml',
      'milliliter',
      'milliliters',
    ].includes(unit)
  ) {
    return 'fl oz'
  }
  if (['ct', 'count', 'each', 'ea', 'unit', 'units'].includes(unit)) return 'each'
  return null
}

export function calculateStandardUnitPriceCents(input: {
  priceCents: number | null | undefined
  sizeValue: number | string | null | undefined
  sizeUnit: string | null | undefined
}): StandardUnitPrice | null {
  const priceCents = toPositiveNumber(input.priceCents)
  const sizeValue = toPositiveNumber(input.sizeValue)
  const rawUnit = normalizeUnitText(input.sizeUnit)
  const unit = normalizeStandardUnit(input.sizeUnit)

  if (!priceCents || !sizeValue || !unit) return null

  let normalizedPrice: number | null = null
  if (rawUnit === 'lb' || rawUnit === 'lbs' || rawUnit === 'pound' || rawUnit === 'pounds') {
    normalizedPrice = priceCents / sizeValue
  } else if (rawUnit === 'oz' || rawUnit === 'ounce' || rawUnit === 'ounces') {
    normalizedPrice = (priceCents / sizeValue) * 16
  } else if (rawUnit === 'kg') {
    normalizedPrice = priceCents / sizeValue / 2.20462
  } else if (rawUnit === 'g' || rawUnit === 'gram' || rawUnit === 'grams') {
    normalizedPrice = (priceCents / sizeValue) * 453.592
  } else if (
    rawUnit === 'fl oz' ||
    rawUnit === 'floz' ||
    rawUnit === 'fluid ounce' ||
    rawUnit === 'fluid ounces'
  ) {
    normalizedPrice = priceCents / sizeValue
  } else if (rawUnit === 'gal' || rawUnit === 'gallon' || rawUnit === 'gallons') {
    normalizedPrice = priceCents / sizeValue / 128
  } else if (rawUnit === 'l' || rawUnit === 'liter' || rawUnit === 'liters') {
    normalizedPrice = priceCents / sizeValue / 33.814
  } else if (rawUnit === 'ml' || rawUnit === 'milliliter' || rawUnit === 'milliliters') {
    normalizedPrice = (priceCents / sizeValue) * 29.5735
  } else if (
    rawUnit === 'ct' ||
    rawUnit === 'count' ||
    rawUnit === 'each' ||
    rawUnit === 'ea' ||
    rawUnit === 'unit' ||
    rawUnit === 'units'
  ) {
    normalizedPrice = priceCents / sizeValue
  }

  if (normalizedPrice == null || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    return null
  }

  return {
    priceCents: Math.max(1, Math.round(normalizedPrice)),
    unit,
  }
}
