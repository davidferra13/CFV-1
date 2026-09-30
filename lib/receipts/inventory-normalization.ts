import { convertQuantity, normalizeUnit } from '@/lib/units/conversion-engine'

export type ReceiptInventoryQuantity = {
  quantity: number
  unit: string
  normalized: boolean
  issue: 'missing_quantity' | 'missing_unit_assumed_default' | 'missing_quantity_and_unit' | 'incompatible_unit_preserved' | null
}

export function normalizeReceiptInventoryQuantity(input: {
  quantity: number | null | undefined
  sourceUnit: string | null | undefined
  targetUnit: string | null | undefined
}): ReceiptInventoryQuantity {
  const targetUnit = normalizeUnit(input.targetUnit?.trim() || 'each')
  const hasQuantity =
    typeof input.quantity === 'number' && Number.isFinite(input.quantity) && input.quantity > 0
  const quantity = hasQuantity ? input.quantity! : 1
  const sourceUnitRaw = input.sourceUnit?.trim()

  if (!sourceUnitRaw) {
    return {
      quantity,
      unit: targetUnit,
      normalized: false,
      issue: hasQuantity ? 'missing_unit_assumed_default' : 'missing_quantity_and_unit',
    }
  }
  const sourceUnit = normalizeUnit(sourceUnitRaw)

  if (sourceUnit === targetUnit) {
    return {
      quantity,
      unit: targetUnit,
      normalized: true,
      issue: hasQuantity ? null : 'missing_quantity',
    }
  }

  const converted = convertQuantity(quantity, sourceUnit, targetUnit)
  if (converted !== null && converted > 0) {
    return {
      quantity: converted,
      unit: targetUnit,
      normalized: true,
      issue: hasQuantity ? null : 'missing_quantity',
    }
  }

  return {
    quantity,
    unit: sourceUnit,
    normalized: false,
    issue: hasQuantity ? 'incompatible_unit_preserved' : 'missing_quantity',
  }
}
