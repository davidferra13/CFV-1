import {
  canConvert,
  computeIngredientCost,
  convertWithDensity,
  lookupDensity,
  normalizeUnit,
} from '@/lib/units/conversion-engine'

export type IngredientPlanningMeta = {
  ingredientId: string
  ingredientName: string
  defaultUnit: string | null
  densityGPerMl: number | null
  lastPriceCents: number | null
  priceUnit: string | null
  preferredVendorId: string | null
}

export type IngredientQuantityRow = {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
}

export type IngredientStockRow = {
  ingredientId: string
  unit: string
  currentQty: number
}

export type ConsolidatedIngredientRow = {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
}

export type IngredientStockCoverage = {
  onHandQty: number
  unresolvedStockRows: IngredientStockRow[]
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getDensity(meta?: Partial<IngredientPlanningMeta> | null): number | null {
  const explicit = numberOrNull(meta?.densityGPerMl)
  if (explicit && explicit > 0) return explicit
  if (meta?.ingredientName) return lookupDensity(meta.ingredientName)
  return null
}

export function getIngredientPlanningKey(ingredientId: string, unit: string): string {
  return `${ingredientId}:${normalizeUnit(unit)}`
}

export function convertIngredientQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  meta?: Partial<IngredientPlanningMeta> | null
): number | null {
  const normalizedFrom = normalizeUnit(fromUnit)
  const normalizedTo = normalizeUnit(toUnit)

  if (!normalizedFrom || !normalizedTo) {
    if (normalizedFrom === normalizedTo) return quantity
    return null
  }

  return convertWithDensity(quantity, normalizedFrom, normalizedTo, getDensity(meta))
}

export function consolidateIngredientRows(
  rows: IngredientQuantityRow[],
  metaByIngredient: Map<string, IngredientPlanningMeta>
): ConsolidatedIngredientRow[] {
  const bucketsByIngredient = new Map<string, Array<{ unit: string; quantity: number }>>()
  const namesByIngredient = new Map<string, string>()

  for (const row of rows) {
    if (!row.ingredientId) continue

    const quantity = Number(row.quantity)
    if (!Number.isFinite(quantity) || quantity === 0) continue

    const meta = metaByIngredient.get(row.ingredientId)
    const ingredientName = row.ingredientName || meta?.ingredientName || row.ingredientId
    const normalizedUnit = normalizeUnit(row.unit || meta?.defaultUnit || '')
    const preferredUnit = normalizeUnit(meta?.defaultUnit || '')
    const density = getDensity(meta)
    const buckets = bucketsByIngredient.get(row.ingredientId) ?? []

    let targetBucket = buckets.find((bucket) => canConvert(normalizedUnit, bucket.unit, density))

    if (!targetBucket && preferredUnit && canConvert(normalizedUnit, preferredUnit, density)) {
      targetBucket = { unit: preferredUnit, quantity: 0 }
      buckets.push(targetBucket)
    }

    if (!targetBucket) {
      targetBucket = { unit: normalizedUnit || preferredUnit || row.unit || '', quantity: 0 }
      buckets.push(targetBucket)
    }

    const convertedQty = convertIngredientQuantity(
      quantity,
      normalizedUnit,
      targetBucket.unit,
      meta
    )

    if (convertedQty === null) {
      if (targetBucket.unit === normalizedUnit || !normalizedUnit) {
        targetBucket.quantity += quantity
      } else {
        buckets.push({ unit: normalizedUnit, quantity })
      }
    } else {
      targetBucket.quantity += convertedQty
    }

    bucketsByIngredient.set(row.ingredientId, buckets)
    namesByIngredient.set(row.ingredientId, ingredientName)
  }

  const consolidated: ConsolidatedIngredientRow[] = []

  for (const [ingredientId, buckets] of bucketsByIngredient.entries()) {
    const ingredientName = namesByIngredient.get(ingredientId) || ingredientId
    for (const bucket of buckets) {
      if (!bucket.unit || bucket.quantity === 0) continue
      consolidated.push({
        ingredientId,
        ingredientName,
        quantity: round3(bucket.quantity),
        unit: bucket.unit,
      })
    }
  }

  return consolidated.sort((a, b) => {
    const nameCmp = a.ingredientName.localeCompare(b.ingredientName)
    if (nameCmp !== 0) return nameCmp
    return a.unit.localeCompare(b.unit)
  })
}

export function buildStockCoverageMap(
  needs: ConsolidatedIngredientRow[],
  stockRows: IngredientStockRow[],
  metaByIngredient: Map<string, IngredientPlanningMeta>
): Map<string, IngredientStockCoverage> {
  const stockByIngredient = new Map<string, IngredientStockRow[]>()

  for (const row of stockRows) {
    if (!row.ingredientId) continue
    const existing = stockByIngredient.get(row.ingredientId) ?? []
    existing.push({
      ingredientId: row.ingredientId,
      unit: normalizeUnit(row.unit),
      currentQty: Number(row.currentQty) || 0,
    })
    stockByIngredient.set(row.ingredientId, existing)
  }

  const coverage = new Map<string, IngredientStockCoverage>()

  for (const need of needs) {
    const meta = metaByIngredient.get(need.ingredientId)
    const ingredientStock = stockByIngredient.get(need.ingredientId) ?? []
    let onHandQty = 0
    const unresolvedStockRows: IngredientStockRow[] = []

    for (const stock of ingredientStock) {
      const convertedQty = convertIngredientQuantity(stock.currentQty, stock.unit, need.unit, meta)
      if (convertedQty === null) {
        unresolvedStockRows.push(stock)
      } else {
        onHandQty += convertedQty
      }
    }

    coverage.set(getIngredientPlanningKey(need.ingredientId, need.unit), {
      onHandQty: round3(onHandQty),
      unresolvedStockRows,
    })
  }

  return coverage
}

export function estimateIngredientCostCents(
  quantity: number,
  unit: string,
  meta?: Partial<IngredientPlanningMeta> | null
): number {
  const costPerUnitCents = numberOrNull(meta?.lastPriceCents)
  if (!costPerUnitCents || costPerUnitCents <= 0) return 0

  const costUnit = normalizeUnit(meta?.priceUnit || meta?.defaultUnit || unit)
  const estimated = computeIngredientCost(
    quantity,
    unit,
    costPerUnitCents,
    costUnit,
    getDensity(meta)
  )

  if (estimated !== null) return estimated

  return Math.round(quantity * costPerUnitCents)
}

export async function fetchIngredientPlanningMeta(
  db: any,
  ingredientIds: string[],
  chefId?: string
): Promise<Map<string, IngredientPlanningMeta>> {
  const metaMap = new Map<string, IngredientPlanningMeta>()
  if (ingredientIds.length === 0) return metaMap

  let query = db
    .from('ingredients')
    .select(
      'id, name, default_unit, weight_to_volume_ratio, last_price_cents, price_unit, preferred_vendor'
    )
    .in('id', ingredientIds)

  if (chefId) {
    query = query.eq('tenant_id', chefId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch ingredient planning metadata: ${error.message}`)
  }

  for (const row of (data ?? []) as any[]) {
    metaMap.set(row.id, {
      ingredientId: row.id,
      ingredientName: row.name,
      defaultUnit: row.default_unit ?? null,
      densityGPerMl: numberOrNull(row.weight_to_volume_ratio),
      lastPriceCents: numberOrNull(row.last_price_cents),
      priceUnit: row.price_unit ?? null,
      preferredVendorId: row.preferred_vendor ?? null,
    })
  }

  return metaMap
}

export async function fetchCurrentStockRows(
  db: any,
  chefId: string,
  ingredientIds: string[]
): Promise<IngredientStockRow[]> {
  if (ingredientIds.length === 0) return []

  const { data, error } = await db
    .from('inventory_current_stock' as any)
    .select('ingredient_id, unit, current_qty')
    .eq('chef_id', chefId)
    .in('ingredient_id', ingredientIds)

  if (error) {
    throw new Error(`Failed to fetch inventory stock: ${(error as any).message}`)
  }

  return ((data ?? []) as any[])
    .filter((row: any) => row.ingredient_id && row.unit)
    .map((row: any) => ({
      ingredientId: row.ingredient_id,
      unit: row.unit,
      currentQty: Number(row.current_qty ?? 0),
    }))
}
