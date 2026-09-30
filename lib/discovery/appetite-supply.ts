import {
  inferAppetiteTagIds,
  type AppetiteSupplyObservation,
} from '@/lib/discovery/appetite-engine'

export type AppetiteSupplySourceName = 'chefs' | 'listings' | 'culinary'
export type AppetiteSupplySourceStatus = 'complete' | 'capped' | 'failed'
export type AppetiteSupplyCoverage = 'complete' | 'capped' | 'partial' | 'unavailable'
export type AppetiteSupplySourceType = 'chef' | 'listing' | 'menu' | 'package' | 'meal_prep_item'

export type AppetiteSupplySourceRecord = {
  id: string
  sourceType: AppetiteSupplySourceType
  texts: readonly (string | null | undefined)[]
  availabilityWeight?: number
}

export type AppetiteSupplySourceBatch = {
  source: AppetiteSupplySourceName
  status: AppetiteSupplySourceStatus
  totalKnown: number | null
  records: readonly AppetiteSupplySourceRecord[]
}

export type AppetiteCensusObservation = AppetiteSupplyObservation & {
  id: string
  sourceType: AppetiteSupplySourceType
}

export type AppetiteSupplySourceSummary = {
  source: AppetiteSupplySourceName
  status: AppetiteSupplySourceStatus
  observedCount: number
  totalKnown: number | null
}

export type AppetiteSupplyCensus = {
  coverage: AppetiteSupplyCoverage
  canMeasureGaps: boolean
  observedCount: number
  taggedCount: number
  totalKnown: number | null
  observations: AppetiteCensusObservation[]
  sources: AppetiteSupplySourceSummary[]
}

function resolveCoverage(batches: readonly AppetiteSupplySourceBatch[]): AppetiteSupplyCoverage {
  if (batches.length === 0 || batches.every((batch) => batch.status === 'failed')) {
    return 'unavailable'
  }
  if (batches.some((batch) => batch.status === 'failed')) return 'partial'
  if (batches.some((batch) => batch.status === 'capped')) return 'capped'
  return 'complete'
}

export function buildAppetiteSupplyCensus(
  batches: readonly AppetiteSupplySourceBatch[]
): AppetiteSupplyCensus {
  const coverage = resolveCoverage(batches)
  const observedCount = batches.reduce((sum, batch) => sum + batch.records.length, 0)
  const hasUnknownTotal = batches.some((batch) => batch.totalKnown === null)
  const totalKnown = hasUnknownTotal
    ? null
    : batches.reduce((sum, batch) => sum + (batch.totalKnown ?? 0), 0)

  const observations = batches.flatMap((batch) =>
    batch.records.map((record) => ({
      id: record.id,
      sourceType: record.sourceType,
      tagIds: inferAppetiteTagIds(record.texts),
      availabilityWeight: Math.max(0, record.availabilityWeight ?? 1),
    }))
  )

  return {
    coverage,
    canMeasureGaps: coverage === 'complete',
    observedCount,
    taggedCount: observations.filter((observation) => observation.tagIds.length > 0).length,
    totalKnown,
    observations,
    sources: batches.map((batch) => ({
      source: batch.source,
      status: batch.status,
      observedCount: batch.records.length,
      totalKnown: batch.totalKnown,
    })),
  }
}
