import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pgClient } from '@/lib/db'
import { getOpenClawStatsInternal, type OpenClawStats } from '@/lib/openclaw/pi-stats'
import { getCoverageSummary } from '@/lib/pricing/coverage-report'

export const OPENCLAW_HEALTH_FRESHNESS_WINDOWS = {
  bridgeHours: 48,
  mirrorHours: 48,
  piHours: 48,
} as const

export type OpenClawOverallStatus = 'ok' | 'partial' | 'degraded' | 'failed' | 'unknown'
export type OpenClawLayerStatus = 'ok' | 'degraded' | 'failed' | 'unknown'
export type OpenClawWrapperStatus = 'success' | 'partial' | 'failed' | 'unknown'

type PersistedStepStatus = 'success' | 'failed' | 'skipped'

type PersistedSyncSummaryStep = {
  completedAt?: string | null
  details?: Record<string, unknown>
  durationSeconds?: number | null
  error?: string | null
  name?: string | null
  startedAt?: string | null
  status?: PersistedStepStatus | null
}

type PersistedSyncSummary = {
  completedAt?: string | null
  durationSeconds?: number | null
  failedStepNames?: string[]
  partialSuccess?: boolean
  runId?: string | null
  startedAt?: string | null
  status?: OpenClawWrapperStatus | null
  steps?: PersistedSyncSummaryStep[]
  syncType?: 'delta' | 'full' | null
}

type PersistedSyncStatus = {
  completed_at?: string | null
  consecutive_failures?: number | null
  error_kind?: 'timeout' | 'exit_code' | 'runtime' | 'unknown' | null
  exit_code?: number | null
  interval_hours?: number | null
  last_error?: string | null
  last_failure_at?: string | null
  last_success_at?: string | null
  last_sync?: string | null
  last_sync_type?: 'delta' | 'full' | null
  next_sync?: string | null
  started_at?: string | null
  status?: OpenClawWrapperStatus | null
  summary?: PersistedSyncSummary | null
}

type SyncRunsLatestRow = {
  errors: number | null
  finished_at: Date | string | null
  started_at: Date | string | null
}

type SyncRunsAggregateRow = {
  green_days_last_7: number | string | null
  last_healthy_sync_at: Date | string | null
}

type StoreAggregateRow = {
  last_cataloged_at: Date | string | null
  states_covered: number | string | null
  store_zip_count: number | string | null
  stores: number | string | null
}

type StoreProductAggregateRow = {
  fresh_price_records: number | string | null
  last_price_seen_at: Date | string | null
  price_records: number | string | null
}

type ZipCentroidAggregateRow = {
  zip_centroid_count: number | string | null
}

type FoodProductAggregateRow = {
  food_products: number | string | null
}

type BridgeAggregateRow = {
  ingredients_updated_today: number | string | null
  last_price_history_at: Date | string | null
  price_history_rows: number | string | null
}

type CoverageSummaryRow = {
  estimation_models: number
  farmers_markets: number
  states_with_stores: number
  total_chains: number
  total_prices: number
  usda_baselines: number
}

export type OpenClawSyncStep = {
  details: Record<string, unknown>
  durationSeconds: number | null
  error: string | null
  name: string
  startedAt: string | null
  status: PersistedStepStatus
  completedAt: string | null
}

export type OpenClawWrapperHealth = {
  completedAt: string | null
  consecutiveFailures: number
  errorKind: 'timeout' | 'exit_code' | 'runtime' | 'unknown' | null
  exitCode: number | null
  failedStepNames: string[]
  intervalHours: number | null
  lastError: string | null
  lastFailureAt: string | null
  lastRunAt: string | null
  lastSuccessAt: string | null
  nextSyncAt: string | null
  partialSuccess: boolean
  runId: string | null
  startedAt: string | null
  status: OpenClawWrapperStatus
  steps: OpenClawSyncStep[]
  syncType: 'delta' | 'full' | null
}

export type OpenClawMirrorHealth = {
  freshPricePct: number | null
  greenDaysLast7: number
  lastHealthySyncAt: string | null
  lastRunFinishedAt: string | null
  lastRunStartedAt: string | null
  latestStoreCatalogedAt: string | null
  latestStorePriceSeenAt: string | null
  priceRecords: number
  statesCovered: number
  status: OpenClawLayerStatus
  storeZipCount: number
  stores: number
  zipCentroidsLoaded: boolean
  isFresh: boolean
}

export type OpenClawBridgeHealth = {
  ingredientsUpdatedToday: number
  lastPriceHistoryAt: string | null
  priceHistoryRows: number
  status: OpenClawLayerStatus
  isFresh: boolean
}

export type OpenClawPiHealth = {
  lastScrapeAt: string | null
  reachable: boolean
  status: OpenClawLayerStatus
  isFresh: boolean
}

export type OpenClawCoverageHealth = {
  estimationModels: number
  farmersMarkets: number
  foodProducts: number
  statesWithStores: number
  totalChains: number
  totalPrices: number
  usdaBaselines: number
}

export type OpenClawRuntimeHealth = {
  bridge: OpenClawBridgeHealth
  coverage: OpenClawCoverageHealth
  generatedAt: string
  mirror: OpenClawMirrorHealth
  overall: {
    reason: string
    status: OpenClawOverallStatus
  }
  pi: OpenClawPiHealth
  warnings: string[]
  wrapper: OpenClawWrapperHealth
}

export function toIso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const text = String(value).trim()
  return text && text !== 'null' && text !== 'undefined' ? text : null
}

function toInt(value: unknown): number {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

function hoursSince(iso: string | null): number | null {
  if (!iso) return null
  const parsed = new Date(iso).getTime()
  if (Number.isNaN(parsed)) return null
  return (Date.now() - parsed) / (1000 * 60 * 60)
}

function isFreshWithinHours(iso: string | null, maxHours: number): boolean {
  const elapsedHours = hoursSince(iso)
  return elapsedHours !== null && elapsedHours <= maxHours
}

async function readPersistedSyncStatus(): Promise<PersistedSyncStatus | null> {
  const statusPath = path.join(process.cwd(), 'docs', 'sync-status.json')

  try {
    const raw = await readFile(statusPath, 'utf8')
    return JSON.parse(raw) as PersistedSyncStatus
  } catch {
    return null
  }
}

export function normalizePersistedSyncStatus(
  persisted: PersistedSyncStatus | null
): OpenClawWrapperHealth {
  const steps = Array.isArray(persisted?.summary?.steps)
    ? persisted!.summary!.steps!
        .filter((step): step is PersistedSyncSummaryStep & { name: string } => Boolean(step?.name))
        .map((step) => ({
          completedAt: toIso(step.completedAt),
          details:
            step.details && typeof step.details === 'object'
              ? (step.details as Record<string, unknown>)
              : {},
          durationSeconds:
            typeof step.durationSeconds === 'number' && Number.isFinite(step.durationSeconds)
              ? step.durationSeconds
              : null,
          error: step.error ?? null,
          name: step.name,
          startedAt: toIso(step.startedAt),
          status:
            step.status === 'failed' || step.status === 'skipped' || step.status === 'success'
              ? step.status
              : 'success',
        }))
    : []

  const failedStepNamesFromSummary = Array.isArray(persisted?.summary?.failedStepNames)
    ? persisted!.summary!.failedStepNames!.filter((step): step is string => Boolean(step))
    : []

  const failedStepNames =
    failedStepNamesFromSummary.length > 0
      ? failedStepNamesFromSummary
      : steps.filter((step) => step.status === 'failed').map((step) => step.name)

  const status =
    persisted?.status === 'success' ||
    persisted?.status === 'partial' ||
    persisted?.status === 'failed' ||
    persisted?.status === 'unknown'
      ? persisted.status
      : 'unknown'

  return {
    completedAt: toIso(persisted?.completed_at),
    consecutiveFailures: toInt(persisted?.consecutive_failures),
    errorKind: persisted?.error_kind ?? null,
    exitCode: persisted?.exit_code ?? null,
    failedStepNames,
    intervalHours:
      typeof persisted?.interval_hours === 'number' && Number.isFinite(persisted.interval_hours)
        ? persisted.interval_hours
        : null,
    lastError: persisted?.last_error ?? null,
    lastFailureAt: toIso(persisted?.last_failure_at),
    lastRunAt: toIso(persisted?.completed_at ?? persisted?.last_sync),
    lastSuccessAt: toIso(persisted?.last_success_at),
    nextSyncAt: toIso(persisted?.next_sync),
    partialSuccess:
      Boolean(persisted?.summary?.partialSuccess) ||
      status === 'partial' ||
      failedStepNames.length > 0,
    runId: persisted?.summary?.runId ?? null,
    startedAt: toIso(persisted?.started_at),
    status,
    steps,
    syncType: persisted?.summary?.syncType ?? persisted?.last_sync_type ?? null,
  }
}

export function deriveOpenClawOverallStatus(input: {
  bridge: OpenClawBridgeHealth
  mirror: OpenClawMirrorHealth
  pi: OpenClawPiHealth
  wrapper: OpenClawWrapperHealth
}): {
  reason: string
  status: OpenClawOverallStatus
} {
  const { bridge, mirror, pi, wrapper } = input

  if (
    wrapper.status === 'failed' &&
    (bridge.isFresh || mirror.isFresh || pi.isFresh || wrapper.partialSuccess)
  ) {
    return {
      status: 'partial',
      reason: 'Wrapper failed, but downstream pricing signals still show recent data.',
    }
  }

  if (wrapper.status === 'partial' || wrapper.partialSuccess) {
    return {
      status: 'partial',
      reason: 'The sync completed with one or more failed internal steps.',
    }
  }

  if (wrapper.status === 'failed' && !bridge.isFresh && !mirror.isFresh) {
    return {
      status: 'failed',
      reason: 'Wrapper failure is not offset by any fresh downstream pricing data.',
    }
  }

  if (bridge.isFresh && mirror.isFresh) {
    return {
      status: 'ok',
      reason: 'Local mirror and downstream price history are both fresh.',
    }
  }

  if (bridge.isFresh || mirror.isFresh || pi.isFresh) {
    return {
      status: 'degraded',
      reason: 'OpenClaw still has usable fresh signals, but the layers are out of sync.',
    }
  }

  if (bridge.priceHistoryRows > 0 || mirror.priceRecords > 0 || wrapper.status !== 'unknown') {
    return {
      status: 'degraded',
      reason: 'OpenClaw has historical data, but none of the current freshness signals are recent.',
    }
  }

  return {
    status: 'unknown',
    reason: 'OpenClaw health could not be verified from the current runtime signals.',
  }
}

export function buildOpenClawWarnings(input: {
  bridge: OpenClawBridgeHealth
  mirror: OpenClawMirrorHealth
  pi: OpenClawPiHealth
  wrapper: OpenClawWrapperHealth
}): string[] {
  const warnings: string[] = []
  const { bridge, mirror, pi, wrapper } = input

  if (wrapper.status === 'failed' && (bridge.isFresh || mirror.isFresh)) {
    warnings.push(
      'Wrapper status is failed while downstream OpenClaw data still appears fresh.'
    )
  }

  if (bridge.isFresh && !mirror.isFresh) {
    warnings.push(
      'Downstream ingredient price history is fresher than the local OpenClaw mirror.'
    )
  }

  if (mirror.isFresh && !pi.reachable) {
    warnings.push('Local mirror is fresh, but the Pi status probe is currently unreachable.')
  }

  if (wrapper.failedStepNames.length > 0) {
    warnings.push(`Failed pipeline steps: ${wrapper.failedStepNames.join(', ')}.`)
  }

  return warnings
}

export async function getOpenClawRuntimeHealth(): Promise<OpenClawRuntimeHealth> {
  const generatedAt = new Date().toISOString()

  const [
    persistedStatus,
    latestSyncRows,
    syncAggregateRows,
    storeRows,
    storeProductRows,
    zipCentroidRows,
    foodProductRows,
    bridgeRows,
    coverageSummary,
    piStats,
  ] = await Promise.all([
    readPersistedSyncStatus(),
    pgClient`
      SELECT started_at, finished_at, errors
      FROM openclaw.sync_runs
      ORDER BY started_at DESC
      LIMIT 1
    `.catch(() => [] as SyncRunsLatestRow[]),
    pgClient`
      SELECT
        COUNT(DISTINCT started_at::date)::int AS green_days_last_7,
        MAX(finished_at) AS last_healthy_sync_at
      FROM openclaw.sync_runs
      WHERE started_at > NOW() - INTERVAL '7 days'
        AND finished_at IS NOT NULL
        AND COALESCE(errors, 0) = 0
    `.catch(() => [] as SyncRunsAggregateRow[]),
    pgClient`
      SELECT
        COUNT(*)::int AS stores,
        COUNT(DISTINCT state)::int AS states_covered,
        COUNT(DISTINCT zip)::int AS store_zip_count,
        MAX(last_cataloged_at) AS last_cataloged_at
      FROM openclaw.stores
      WHERE is_active = true
    `.catch(() => [] as StoreAggregateRow[]),
    pgClient`
      SELECT
        COUNT(*)::int AS price_records,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '7 days')::int AS fresh_price_records,
        MAX(last_seen_at) AS last_price_seen_at
      FROM openclaw.store_products
    `.catch(() => [] as StoreProductAggregateRow[]),
    pgClient`
      SELECT COUNT(*)::int AS zip_centroid_count
      FROM openclaw.zip_centroids
    `.catch(() => [] as ZipCentroidAggregateRow[]),
    pgClient`
      SELECT COUNT(*)::int AS food_products
      FROM openclaw.products
      WHERE is_food = true
    `.catch(() => [] as FoodProductAggregateRow[]),
    pgClient`
      SELECT
        MAX(purchase_date) AS last_price_history_at,
        COUNT(DISTINCT ingredient_id) FILTER (WHERE purchase_date = CURRENT_DATE)::int AS ingredients_updated_today,
        COUNT(*)::int AS price_history_rows
      FROM ingredient_price_history
      WHERE source LIKE 'openclaw_%'
    `.catch(() => [] as BridgeAggregateRow[]),
    getCoverageSummary().catch(() => null),
    getOpenClawStatsInternal().catch(() => null),
  ])

  const wrapper = normalizePersistedSyncStatus(persistedStatus)
  const latestSync = latestSyncRows[0]
  const syncAggregate = syncAggregateRows[0]
  const storeAggregate = storeRows[0]
  const storeProductAggregate = storeProductRows[0]
  const zipCentroidAggregate = zipCentroidRows[0]
  const foodProductAggregate = foodProductRows[0]
  const bridgeAggregate = bridgeRows[0]

  const lastRunStartedAt = toIso(latestSync?.started_at)
  const lastRunFinishedAt = toIso(latestSync?.finished_at)
  const latestStoreCatalogedAt = toIso(storeAggregate?.last_cataloged_at)
  const latestStorePriceSeenAt = toIso(storeProductAggregate?.last_price_seen_at)
  const lastPriceHistoryAt = toIso(bridgeAggregate?.last_price_history_at)
  const lastPiScrapeAt = toIso((piStats as OpenClawStats | null)?.lastScrapeAt ?? null)

  const mirrorFreshPricePct =
    toInt(storeProductAggregate?.price_records) > 0
      ? Math.round(
          (toInt(storeProductAggregate?.fresh_price_records) /
            Math.max(toInt(storeProductAggregate?.price_records), 1)) *
            100
        )
      : null

  const mirrorIsFresh =
    isFreshWithinHours(lastRunFinishedAt, OPENCLAW_HEALTH_FRESHNESS_WINDOWS.mirrorHours) ||
    isFreshWithinHours(latestStorePriceSeenAt, OPENCLAW_HEALTH_FRESHNESS_WINDOWS.mirrorHours)

  const bridgeIsFresh = isFreshWithinHours(
    lastPriceHistoryAt,
    OPENCLAW_HEALTH_FRESHNESS_WINDOWS.bridgeHours
  )

  const piIsFresh = isFreshWithinHours(lastPiScrapeAt, OPENCLAW_HEALTH_FRESHNESS_WINDOWS.piHours)

  const mirror: OpenClawMirrorHealth = {
    freshPricePct: mirrorFreshPricePct,
    greenDaysLast7: toInt(syncAggregate?.green_days_last_7),
    isFresh: mirrorIsFresh,
    lastHealthySyncAt: toIso(syncAggregate?.last_healthy_sync_at),
    lastRunFinishedAt,
    lastRunStartedAt,
    latestStoreCatalogedAt,
    latestStorePriceSeenAt,
    priceRecords: toInt(storeProductAggregate?.price_records),
    statesCovered: toInt(storeAggregate?.states_covered),
    status:
      mirrorFreshPricePct === null && !lastRunStartedAt
        ? 'unknown'
        : mirrorIsFresh
          ? 'ok'
          : 'degraded',
    storeZipCount: toInt(storeAggregate?.store_zip_count),
    stores: toInt(storeAggregate?.stores),
    zipCentroidsLoaded: toInt(zipCentroidAggregate?.zip_centroid_count) > 0,
  }

  const bridge: OpenClawBridgeHealth = {
    ingredientsUpdatedToday: toInt(bridgeAggregate?.ingredients_updated_today),
    isFresh: bridgeIsFresh,
    lastPriceHistoryAt,
    priceHistoryRows: toInt(bridgeAggregate?.price_history_rows),
    status:
      toInt(bridgeAggregate?.price_history_rows) === 0
        ? 'unknown'
        : bridgeIsFresh
          ? 'ok'
          : 'degraded',
  }

  const pi: OpenClawPiHealth = {
    isFresh: piIsFresh,
    lastScrapeAt: lastPiScrapeAt,
    reachable: Boolean(piStats),
    status: !piStats ? 'degraded' : piIsFresh ? 'ok' : 'degraded',
  }

  const coverageRow = coverageSummary as CoverageSummaryRow | null
  const coverage: OpenClawCoverageHealth = {
    estimationModels: coverageRow?.estimation_models ?? 0,
    farmersMarkets: coverageRow?.farmers_markets ?? 0,
    foodProducts: toInt(foodProductAggregate?.food_products),
    statesWithStores: coverageRow?.states_with_stores ?? 0,
    totalChains: coverageRow?.total_chains ?? 0,
    totalPrices: coverageRow?.total_prices ?? 0,
    usdaBaselines: coverageRow?.usda_baselines ?? 0,
  }

  const overall = deriveOpenClawOverallStatus({
    bridge,
    mirror,
    pi,
    wrapper,
  })

  const warnings = buildOpenClawWarnings({
    bridge,
    mirror,
    pi,
    wrapper,
  })

  return {
    bridge,
    coverage,
    generatedAt,
    mirror,
    overall,
    pi,
    warnings,
    wrapper,
  }
}
