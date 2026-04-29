export const PANTRY_CONFIDENCE_STATUSES = [
  'confirmed',
  'likely',
  'estimated',
  'stale',
  'conflict',
  'unknown',
] as const

export type PantryConfidenceStatus = (typeof PANTRY_CONFIDENCE_STATUSES)[number]

export type PantryReviewStatus = 'approved' | 'pending_review' | 'rejected'

export type PantryStockStatus = 'ok' | 'low' | 'critical' | 'out' | 'unknown'

export type PantryMovementRow = {
  id?: string | null
  ingredient_id: string | null
  ingredient_name: string
  transaction_type: string
  quantity: number | string
  unit: string
  cost_cents?: number | null
  location_id?: string | null
  created_at?: string | Date | null
  confidence_status?: PantryConfidenceStatus | string | null
  review_status?: PantryReviewStatus | string | null
}

export type PantryCountRow = {
  id?: string | null
  ingredient_id?: string | null
  ingredient_name: string
  current_qty: number | string
  par_level?: number | string | null
  unit: string
  last_counted_at?: string | Date | null
  updated_at?: string | Date | null
  vendor_id?: string | null
}

export type PantryStockPosition = {
  key: string
  ingredientId: string | null
  ingredientName: string
  unit: string
  currentQty: number
  parLevel: number | null
  deficit: number
  deficitPct: number
  status: PantryStockStatus
  confidenceStatus: PantryConfidenceStatus
  confidenceLabel: string
  confidenceReason: string
  lastMovementAt: string | null
  lastCountedAt: string | null
  transactionCount: number
  pendingReviewCount: number
  source: 'ledger' | 'legacy_count'
}

export type CountAdjustmentDecision = {
  transactionType: 'opening_balance' | 'audit_adjustment'
  quantity: number
  confidenceStatus: PantryConfidenceStatus
  evidenceSourceType: 'baseline_count' | 'manual_adjustment'
}

const CONFIDENCE_LABELS: Record<PantryConfidenceStatus, string> = {
  confirmed: 'Confirmed',
  likely: 'Likely',
  estimated: 'Estimated',
  stale: 'Stale',
  conflict: 'Conflict',
  unknown: 'Unknown',
}

const CONFIDENCE_RANK: Record<PantryConfidenceStatus, number> = {
  conflict: 0,
  unknown: 1,
  stale: 2,
  estimated: 3,
  likely: 4,
  confirmed: 5,
}

export function normalizePantryConfidence(value: unknown): PantryConfidenceStatus {
  return PANTRY_CONFIDENCE_STATUSES.includes(value as PantryConfidenceStatus)
    ? (value as PantryConfidenceStatus)
    : 'unknown'
}

export function getPantryConfidenceLabel(status: PantryConfidenceStatus): string {
  return CONFIDENCE_LABELS[status]
}

export function chooseWeakerConfidence(
  current: PantryConfidenceStatus,
  next: PantryConfidenceStatus
): PantryConfidenceStatus {
  return CONFIDENCE_RANK[next] < CONFIDENCE_RANK[current] ? next : current
}

export function makeInventoryGroupKey(input: {
  ingredientId?: string | null
  ingredientName: string
  unit: string
}): string {
  const identity = input.ingredientId ?? input.ingredientName.trim().toLowerCase()
  return `${identity}::${input.unit.trim().toLowerCase()}`
}

export function decideCountAdjustment(input: {
  targetQty: number
  ledgerQty: number
  hasLedgerMovements: boolean
}): CountAdjustmentDecision | null {
  const roundedTarget = roundQty(input.targetQty)
  const roundedLedger = roundQty(input.ledgerQty)
  const delta = roundQty(roundedTarget - roundedLedger)

  if (delta === 0) return null

  if (!input.hasLedgerMovements) {
    return {
      transactionType: 'opening_balance',
      quantity: roundedTarget,
      confidenceStatus: 'confirmed',
      evidenceSourceType: 'baseline_count',
    }
  }

  return {
    transactionType: 'audit_adjustment',
    quantity: delta,
    confidenceStatus: 'confirmed',
    evidenceSourceType: 'manual_adjustment',
  }
}

export function computePantryStockPositions(input: {
  movements: PantryMovementRow[]
  counts: PantryCountRow[]
  now?: Date
  staleAfterDays?: number
}): PantryStockPosition[] {
  const now = input.now ?? new Date()
  const staleAfterDays = input.staleAfterDays ?? 14
  const groups = new Map<
    string,
    {
      ingredientId: string | null
      ingredientName: string
      unit: string
      qty: number
      parLevel: number | null
      lastMovementAt: string | null
      lastCountedAt: string | null
      transactionCount: number
      pendingReviewCount: number
      confidenceStatus: PantryConfidenceStatus
      hasLedger: boolean
      legacyQty: number | null
    }
  >()

  for (const movement of input.movements) {
    const reviewStatus = movement.review_status ?? 'approved'
    if (reviewStatus === 'rejected') continue

    const key = makeInventoryGroupKey({
      ingredientId: movement.ingredient_id,
      ingredientName: movement.ingredient_name,
      unit: movement.unit,
    })
    const existing = groups.get(key) ?? {
      ingredientId: movement.ingredient_id ?? null,
      ingredientName: movement.ingredient_name,
      unit: movement.unit,
      qty: 0,
      parLevel: null,
      lastMovementAt: null,
      lastCountedAt: null,
      transactionCount: 0,
      pendingReviewCount: 0,
      confidenceStatus: 'confirmed' as PantryConfidenceStatus,
      hasLedger: true,
      legacyQty: null,
    }

    existing.qty = roundQty(existing.qty + Number(movement.quantity ?? 0))
    existing.transactionCount += 1
    existing.hasLedger = true
    if (reviewStatus === 'pending_review') existing.pendingReviewCount += 1

    const movementConfidence = normalizePantryConfidence(movement.confidence_status ?? 'confirmed')
    existing.confidenceStatus = chooseWeakerConfidence(
      existing.confidenceStatus,
      movementConfidence
    )

    const movementDate = toIsoString(movement.created_at)
    if (movementDate && (!existing.lastMovementAt || movementDate > existing.lastMovementAt)) {
      existing.lastMovementAt = movementDate
    }

    groups.set(key, existing)
  }

  for (const count of input.counts) {
    const key = makeInventoryGroupKey({
      ingredientId: count.ingredient_id ?? null,
      ingredientName: count.ingredient_name,
      unit: count.unit,
    })
    const existing = groups.get(key) ?? {
      ingredientId: count.ingredient_id ?? null,
      ingredientName: count.ingredient_name,
      unit: count.unit,
      qty: Number(count.current_qty ?? 0),
      parLevel: null,
      lastMovementAt: null,
      lastCountedAt: null,
      transactionCount: 0,
      pendingReviewCount: 0,
      confidenceStatus: 'unknown' as PantryConfidenceStatus,
      hasLedger: false,
      legacyQty: Number(count.current_qty ?? 0),
    }

    existing.parLevel = count.par_level != null ? Number(count.par_level) : null
    existing.lastCountedAt = toIsoString(count.last_counted_at ?? count.updated_at)
    existing.legacyQty = Number(count.current_qty ?? 0)

    if (!existing.hasLedger) {
      existing.qty = Number(count.current_qty ?? 0)
      existing.confidenceStatus = 'unknown'
    }

    groups.set(key, existing)
  }

  return Array.from(groups.values())
    .map((group) => {
      let confidenceStatus = group.confidenceStatus
      let confidenceReason = confidenceReasonForStatus(confidenceStatus, group.hasLedger)

      if (group.pendingReviewCount > 0) {
        confidenceStatus = 'conflict'
        confidenceReason = 'There are pending review movements for this item.'
      } else if (group.hasLedger && isStale(group.lastMovementAt, now, staleAfterDays)) {
        confidenceStatus = 'stale'
        confidenceReason = `No confirmed movement in ${staleAfterDays} days.`
      }

      const status = computeStockStatus({
        qty: group.qty,
        parLevel: group.parLevel,
        confidenceStatus,
      })
      const deficit =
        group.parLevel != null && status !== 'unknown'
          ? roundQty(Math.max(0, group.parLevel - group.qty))
          : 0
      const deficitPct =
        group.parLevel != null && group.parLevel > 0 && status !== 'unknown'
          ? Math.max(0, Math.round((1 - group.qty / group.parLevel) * 100))
          : 0

      return {
        key: makeInventoryGroupKey({
          ingredientId: group.ingredientId,
          ingredientName: group.ingredientName,
          unit: group.unit,
        }),
        ingredientId: group.ingredientId,
        ingredientName: group.ingredientName,
        unit: group.unit,
        currentQty: roundQty(group.qty),
        parLevel: group.parLevel,
        deficit,
        deficitPct,
        status,
        confidenceStatus,
        confidenceLabel: getPantryConfidenceLabel(confidenceStatus),
        confidenceReason,
        lastMovementAt: group.lastMovementAt,
        lastCountedAt: group.lastCountedAt,
        transactionCount: group.transactionCount,
        pendingReviewCount: group.pendingReviewCount,
        source: group.hasLedger ? ('ledger' as const) : ('legacy_count' as const),
      }
    })
    .sort((a, b) => {
      const statusOrder: Record<PantryStockStatus, number> = {
        conflict: 0,
        unknown: 1,
        out: 2,
        critical: 3,
        low: 4,
        ok: 5,
      } as Record<PantryStockStatus, number>
      return (
        statusOrder[a.status] - statusOrder[b.status] ||
        a.ingredientName.localeCompare(b.ingredientName)
      )
    })
}

function computeStockStatus(input: {
  qty: number
  parLevel: number | null
  confidenceStatus: PantryConfidenceStatus
}): PantryStockStatus {
  if (input.confidenceStatus === 'unknown' || input.confidenceStatus === 'conflict')
    return 'unknown'
  if (input.qty <= 0) return 'out'
  if (input.parLevel == null || input.parLevel <= 0) return 'ok'
  if (input.qty < input.parLevel * 0.25) return 'critical'
  if (input.qty < input.parLevel) return 'low'
  return 'ok'
}

function confidenceReasonForStatus(status: PantryConfidenceStatus, hasLedger: boolean): string {
  if (!hasLedger) return 'This item only has a legacy count, not an inventory movement trail.'
  if (status === 'confirmed') return 'Computed from approved inventory movements.'
  if (status === 'likely')
    return 'Computed from high-confidence evidence that still deserves review.'
  if (status === 'estimated') return 'Computed from projected usage, not physical confirmation.'
  if (status === 'stale') return 'The last reliable movement is old enough to need a recount.'
  if (status === 'conflict') return 'Evidence disagrees or needs chef review.'
  return 'ChefFlow does not have enough evidence to trust this quantity.'
}

function isStale(lastMovementAt: string | null, now: Date, staleAfterDays: number): boolean {
  if (!lastMovementAt) return false
  const last = new Date(lastMovementAt)
  if (Number.isNaN(last.getTime())) return false
  const ageMs = now.getTime() - last.getTime()
  return ageMs > staleAfterDays * 24 * 60 * 60 * 1000
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000
}
