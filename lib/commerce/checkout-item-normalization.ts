import type { TaxClass } from './constants'

export type CheckoutModifierInput = {
  name: string
  option: string
  price_delta_cents: number
}

export type CheckoutModifierSelection = {
  name: string
  option: string
  price_delta_cents: number
}

const VALID_TAX_CLASSES = new Set<TaxClass>([
  'standard',
  'reduced',
  'exempt',
  'alcohol',
  'cannabis',
  'prepared_food',
  'zero',
])

const MAX_MODIFIER_SELECTIONS = 40
const MAX_MANUAL_MODIFIER_DELTA_CENTS = 100000

function asTrimmedString(value: unknown) {
  return String(value ?? '').trim()
}

function asInteger(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

export function normalizeTaxClass(raw: unknown): TaxClass {
  const normalized = asTrimmedString(raw).toLowerCase() || 'standard'
  if (VALID_TAX_CLASSES.has(normalized as TaxClass)) {
    return normalized as TaxClass
  }
  throw new Error(`Invalid tax class "${String(raw ?? '')}"`)
}

export function sanitizeManualModifierSelections(
  selections: CheckoutModifierInput[] | null | undefined
): CheckoutModifierSelection[] {
  if (!Array.isArray(selections) || selections.length === 0) return []
  if (selections.length > MAX_MODIFIER_SELECTIONS) {
    throw new Error(`Too many modifiers (max ${MAX_MODIFIER_SELECTIONS})`)
  }

  const normalized: CheckoutModifierSelection[] = []
  const seen = new Set<string>()

  for (const selection of selections) {
    const name = asTrimmedString(selection?.name)
    const option = asTrimmedString(selection?.option)
    const delta = asInteger(selection?.price_delta_cents)

    if (!name || !option || delta == null) {
      throw new Error('Invalid modifier selection in checkout request')
    }
    if (Math.abs(delta) > MAX_MANUAL_MODIFIER_DELTA_CENTS) {
      throw new Error('Modifier price delta exceeds allowed range')
    }

    const key = `${name.toLowerCase()}::${option.toLowerCase()}`
    if (seen.has(key)) {
      throw new Error('Duplicate modifier selection is not allowed')
    }
    seen.add(key)

    normalized.push({
      name,
      option,
      price_delta_cents: delta,
    })
  }

  return normalized
}

export function resolveCatalogModifierSelections(input: {
  productName: string
  catalogModifiers: unknown
  selections: CheckoutModifierInput[] | null | undefined
}): CheckoutModifierSelection[] {
  const selections = sanitizeManualModifierSelections(input.selections)
  if (selections.length === 0) return []

  const modifierLookup = new Map<
    string,
    {
      label: string
      options: Map<
        string,
        {
          label: string
          delta: number
        }
      >
    }
  >()

  for (const modifier of Array.isArray(input.catalogModifiers) ? input.catalogModifiers : []) {
    const modifierLabel = asTrimmedString((modifier as any)?.name)
    if (!modifierLabel) continue

    const optionLookup = new Map<string, { label: string; delta: number }>()
    for (const option of Array.isArray((modifier as any)?.options)
      ? (modifier as any).options
      : []) {
      const optionLabel = asTrimmedString((option as any)?.label)
      const optionDelta = asInteger((option as any)?.price_delta_cents)
      if (!optionLabel || optionDelta == null) continue
      optionLookup.set(optionLabel.toLowerCase(), {
        label: optionLabel,
        delta: optionDelta,
      })
    }

    modifierLookup.set(modifierLabel.toLowerCase(), {
      label: modifierLabel,
      options: optionLookup,
    })
  }

  const normalized: CheckoutModifierSelection[] = []
  const selectedModifierKeys = new Set<string>()

  for (const selection of selections) {
    const modifierKey = selection.name.toLowerCase()
    if (selectedModifierKeys.has(modifierKey)) {
      throw new Error(`Duplicate modifier "${selection.name}" for "${input.productName}"`)
    }
    selectedModifierKeys.add(modifierKey)

    const catalogModifier = modifierLookup.get(modifierKey)
    if (!catalogModifier) {
      throw new Error(`Invalid modifier "${selection.name}" for "${input.productName}"`)
    }

    const option = catalogModifier.options.get(selection.option.toLowerCase())
    if (!option) {
      throw new Error(
        `Invalid modifier option "${selection.option}" for "${catalogModifier.label}" on "${input.productName}"`
      )
    }

    if (selection.price_delta_cents !== option.delta) {
      throw new Error(
        `Modifier price mismatch for "${input.productName}" (${catalogModifier.label}: ${option.label})`
      )
    }

    normalized.push({
      name: catalogModifier.label,
      option: option.label,
      price_delta_cents: option.delta,
    })
  }

  return normalized
}
