import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pgClient } from '@/lib/db'
import {
  OPENCLAW_DEFAULT_CADENCE_POLICY,
  type BuildOpenClawHealthContractInput,
  type OpenClawHealthStage,
  type OpenClawHealthStageId,
  type OpenClawStageStatus,
} from '@/lib/openclaw/health-contract'

type PersistedStepStatus = 'success' | 'failed' | 'skipped'

type PersistedSyncSummaryStep = {
  completedAt?: string | null
  durationSeconds?: number | null
  error?: string | null
  name?: string | null
  startedAt?: string | null
  status?: PersistedStepStatus | null
}

type PersistedSyncSummary = {
  failedStepNames?: string[]
  partialSuccess?: boolean
  steps?: PersistedSyncSummaryStep[]
  syncType?: 'delta' | 'full' | null
}

type PersistedSyncStatus = {
  completed_at?: string | null
  consecutive_failures?: number | null
  interval_hours?: number | null
  last_error?: string | null
  last_failure_at?: string | null
  last_success_at?: string | null
  last_sync?: string | null
  last_sync_type?: 'delta' | 'full' | null
  next_sync?: string | null
  started_at?: string | null
  status?: 'success' | 'partial' | 'failed' | 'unknown' | string | null
  summary?: PersistedSyncSummary | null
}

type NumericRow = Record<string, number | string | Date | null>

const STATUS_SOURCE = 'docs/sync-status.json'
const AUTO_SYNC_SOURCE = 'scripts/auto-sync-openclaw.mjs'
const PRICE_FRESHNESS_SECONDS = OPENCLAW_DEFAULT_CADENCE_POLICY.priceFreshnessMaxAgeSeconds ?? 0

function toIso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const text = String(value).trim()
  if (!text || text === 'null' || text === 'undefined') return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString()
}

function toInt(value: unknown): number {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

function secondsSince(iso: string | null, generatedAt: string): number | null {
  if (!iso) return null
  const checkedAt = new Date(iso).getTime()
  const now = new Date(generatedAt).getTime()
  if (Number.isNaN(checkedAt) || Number.isNaN(now)) return null
  return Math.max(0, Math.floor((now - checkedAt) / 1000))
}

function freshnessStatus(
  rowCount: number,
  freshnessSeconds: number | null,
  maxAgeSeconds: number
): OpenClawStageStatus {
  if (rowCount <= 0) return 'unknown'
  if (freshnessSeconds === null) return 'unknown'
  return freshnessSeconds <= maxAgeSeconds ? 'success' : 'stale'
}

async function readPersistedStatus(): Promise<
  { kind: 'ok'; status: PersistedSyncStatus | null } | { kind: 'error'; message: string }
> {
  try {
    const raw = await readFile(path.join(process.cwd(), STATUS_SOURCE), 'utf8')
    return { kind: 'ok', status: JSON.parse(raw) as PersistedSyncStatus }
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return { kind: 'ok', status: null }
    }

    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Could not read persisted sync status',
    }
  }
}

function syncStatusToStageStatus(status: PersistedSyncStatus | null): OpenClawStageStatus {
  if (
    status?.status === 'success' ||
    status?.status === 'partial' ||
    status?.status === 'failed' ||
    status?.status === 'unknown'
  ) {
    return status.status
  }

  return 'unknown'
}

function buildDaemonStage(
  persisted: PersistedSyncStatus | null,
  generatedAt: string
): OpenClawHealthStage {
  const checkedAt = toIso(persisted?.completed_at ?? persisted?.last_sync)
  const status = syncStatusToStageStatus(persisted)
  const freshnessSeconds = secondsSince(checkedAt, generatedAt)
  const lastError = persisted?.last_error ? ` Last error: ${persisted.last_error}` : ''

  return {
    id: 'daemon_or_wrapper',
    label: 'Daemon or wrapper',
    status,
    checkedAt,
    source: STATUS_SOURCE,
    freshnessSeconds,
    successCount: persisted?.last_success_at ? 1 : 0,
    failureCount: toInt(persisted?.consecutive_failures),
    message: persisted
      ? `Persisted wrapper status is ${status}.${lastError}`
      : 'No persisted OpenClaw wrapper status file is present.',
  }
}

function buildHostStage(generatedAt: string): OpenClawHealthStage {
  return {
    id: 'scheduled_task_or_host',
    label: 'Scheduled task or host',
    status: 'unknown',
    checkedAt: generatedAt,
    source: 'host scheduled-task state',
    message:
      'Host scheduled-task state is intentionally not probed in this slice; no safe repo-local helper exists.',
  }
}

function normalizeStepStatus(status: PersistedStepStatus | null | undefined): OpenClawStageStatus {
  if (status === 'failed') return 'failed'
  if (status === 'skipped') return 'partial'
  if (status === 'success') return 'success'
  return 'unknown'
}

function mostSevereStepStatus(steps: PersistedSyncSummaryStep[]): OpenClawStageStatus {
  const statuses = steps.map((step) => normalizeStepStatus(step.status))
  if (statuses.includes('failed')) return 'failed'
  if (statuses.includes('partial')) return 'partial'
  if (statuses.includes('unknown')) return 'unknown'
  return statuses.length > 0 ? 'success' : 'unknown'
}

function buildStepStage(input: {
  id: OpenClawHealthStageId
  label: string
  persisted: PersistedSyncStatus | null
  patterns: RegExp[]
}): OpenClawHealthStage {
  const steps = input.persisted?.summary?.steps ?? []
  const matchingSteps = steps.filter((step) => {
    const name = step.name ?? ''
    return input.patterns.some((pattern) => pattern.test(name))
  })
  const status = mostSevereStepStatus(matchingSteps)
  const checkedAt = toIso(
    matchingSteps
      .map((step) => step.completedAt ?? step.startedAt ?? null)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
  )
  const failureCount = matchingSteps.filter((step) => step.status === 'failed').length
  const successCount = matchingSteps.filter((step) => step.status === 'success').length

  return {
    id: input.id,
    label: input.label,
    status,
    checkedAt,
    source: STATUS_SOURCE,
    successCount,
    failureCount,
    message:
      matchingSteps.length > 0
        ? `${input.label} is ${status} across ${matchingSteps.length} persisted step(s).`
        : `${input.label} has no matching persisted step in the latest wrapper summary.`,
  }
}

function failedDbStage(input: {
  id: OpenClawHealthStageId
  label: string
  source: string
  generatedAt: string
  error: unknown
}): OpenClawHealthStage {
  const message = input.error instanceof Error ? input.error.message : 'Unknown query failure'

  return {
    id: input.id,
    label: input.label,
    status: 'failed',
    checkedAt: input.generatedAt,
    source: input.source,
    failureCount: 1,
    message: `Source read failed closed: ${message}`,
  }
}

async function buildPriceHistoryStage(generatedAt: string): Promise<OpenClawHealthStage> {
  const source = 'ingredient_price_history'

  try {
    const rows = await pgClient<NumericRow[]>`
      SELECT
        MAX(purchase_date) AS last_price_history_at,
        COUNT(*)::int AS price_history_rows,
        COUNT(*) FILTER (WHERE purchase_date >= CURRENT_DATE - INTERVAL '2 days')::int
          AS fresh_price_history_rows
      FROM ingredient_price_history
      WHERE source LIKE 'openclaw_%'
    `
    const row = rows[0] ?? {}
    const count = toInt(row.price_history_rows)
    const checkedAt = toIso(row.last_price_history_at)
    const freshnessSeconds = secondsSince(checkedAt, generatedAt)
    const status = freshnessStatus(count, freshnessSeconds, PRICE_FRESHNESS_SECONDS)

    return {
      id: 'price_history_write',
      label: 'Price history write',
      status,
      checkedAt,
      source,
      freshnessSeconds,
      successCount: toInt(row.fresh_price_history_rows),
      message:
        count > 0
          ? `Found ${count} OpenClaw-sourced price history row(s); latest write is ${checkedAt ?? 'unknown'}.`
          : 'No OpenClaw-sourced price history rows were found.',
    }
  } catch (err) {
    return failedDbStage({
      id: 'price_history_write',
      label: 'Price history write',
      source,
      generatedAt,
      error: err,
    })
  }
}

async function buildMirrorStage(generatedAt: string): Promise<OpenClawHealthStage> {
  const source = 'openclaw.store_products'

  try {
    const rows = await pgClient<NumericRow[]>`
      SELECT
        COUNT(*)::int AS price_records,
        COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '2 days')::int AS fresh_price_records,
        MAX(last_seen_at) AS last_price_seen_at
      FROM openclaw.store_products
    `
    const row = rows[0] ?? {}
    const count = toInt(row.price_records)
    const checkedAt = toIso(row.last_price_seen_at)
    const freshnessSeconds = secondsSince(checkedAt, generatedAt)
    const status = freshnessStatus(count, freshnessSeconds, PRICE_FRESHNESS_SECONDS)

    return {
      id: 'chefflow_mirror_read',
      label: 'ChefFlow mirror read',
      status,
      checkedAt,
      source,
      freshnessSeconds,
      successCount: toInt(row.fresh_price_records),
      message:
        count > 0
          ? `ChefFlow can read ${count} OpenClaw mirror price record(s).`
          : 'ChefFlow did not find readable OpenClaw mirror price records.',
    }
  } catch (err) {
    return failedDbStage({
      id: 'chefflow_mirror_read',
      label: 'ChefFlow mirror read',
      source,
      generatedAt,
      error: err,
    })
  }
}

async function buildCostingConsumptionStage(generatedAt: string): Promise<OpenClawHealthStage> {
  const source = 'ingredients.last_price_source'

  try {
    const rows = await pgClient<NumericRow[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE last_price_source LIKE 'openclaw_%'
            AND last_price_cents IS NOT NULL
            AND last_price_cents > 0
        )::int AS consumed_openclaw_prices,
        COUNT(*) FILTER (
          WHERE last_price_source LIKE 'openclaw_%'
            AND last_price_date >= CURRENT_DATE - INTERVAL '2 days'
        )::int AS fresh_consumed_openclaw_prices,
        MAX(last_price_date) FILTER (WHERE last_price_source LIKE 'openclaw_%')
          AS last_consumed_price_at
      FROM ingredients
    `
    const row = rows[0] ?? {}
    const count = toInt(row.consumed_openclaw_prices)
    const checkedAt = toIso(row.last_consumed_price_at)
    const freshnessSeconds = secondsSince(checkedAt, generatedAt)
    const status = freshnessStatus(count, freshnessSeconds, PRICE_FRESHNESS_SECONDS)

    return {
      id: 'chef_costing_consumption',
      label: 'Chef costing consumption',
      status,
      checkedAt,
      source,
      freshnessSeconds,
      successCount: toInt(row.fresh_consumed_openclaw_prices),
      message:
        count > 0
          ? `Chef costing can consume ${count} ingredient price(s) sourced from OpenClaw.`
          : 'No ingredient price currently records OpenClaw as its costing source.',
    }
  } catch (err) {
    return failedDbStage({
      id: 'chef_costing_consumption',
      label: 'Chef costing consumption',
      source,
      generatedAt,
      error: err,
    })
  }
}

export async function readOpenClawHealthSources(
  generatedAt = new Date().toISOString()
): Promise<BuildOpenClawHealthContractInput> {
  const persistedResult = await readPersistedStatus()

  if (persistedResult.kind === 'error') {
    return {
      generatedAt,
      stages: [buildHostStage(generatedAt)],
      cadencePolicy: OPENCLAW_DEFAULT_CADENCE_POLICY,
      sourceReadErrors: [
        {
          source: STATUS_SOURCE,
          message: persistedResult.message,
          stageIds: ['daemon_or_wrapper', 'capture_or_pull', 'normalization'],
        },
      ],
    }
  }

  const persisted = persistedResult.status
  const [priceHistoryStage, mirrorStage, costingConsumptionStage] = await Promise.all([
    buildPriceHistoryStage(generatedAt),
    buildMirrorStage(generatedAt),
    buildCostingConsumptionStage(generatedAt),
  ])

  return {
    generatedAt,
    cadencePolicy: {
      ...OPENCLAW_DEFAULT_CADENCE_POLICY,
      source: 'code',
    },
    stages: [
      buildDaemonStage(persisted, generatedAt),
      buildHostStage(generatedAt),
      buildStepStage({
        id: 'capture_or_pull',
        label: 'Capture or pull',
        persisted,
        patterns: [/pull/i, /capture/i, /catalog/i],
      }),
      buildStepStage({
        id: 'normalization',
        label: 'Normalization',
        persisted,
        patterns: [/normal/i, /alias/i, /canonical/i, /promote/i],
      }),
      priceHistoryStage,
      mirrorStage,
      costingConsumptionStage,
    ],
    contradictions: [
      {
        id: 'cadence-policy-from-daemon-code',
        severity: 'info',
        message:
          'Cadence policy is read from repository daemon code constants, not from a host scheduler.',
        sources: [AUTO_SYNC_SOURCE],
      },
    ],
  }
}
