import test from 'node:test'
import assert from 'node:assert/strict'

import {
  OPENCLAW_REQUIRED_HEALTH_STAGES,
  buildOpenClawHealthContract,
  buildOpenClawWarnings,
  deriveOpenClawOverallStatus,
  normalizePersistedSyncStatus,
  reduceOpenClawOverallStatus,
  type OpenClawBridgeHealth,
  type OpenClawHealthStage,
  type OpenClawHealthStageId,
  type OpenClawMirrorHealth,
  type OpenClawPiHealth,
  type OpenClawStageStatus,
} from '@/lib/openclaw/health-contract'

const GENERATED_AT = '2026-04-24T16:30:00.000Z'

function buildMirror(overrides: Partial<OpenClawMirrorHealth> = {}): OpenClawMirrorHealth {
  return {
    freshPricePct: 100,
    greenDaysLast7: 7,
    isFresh: true,
    lastHealthySyncAt: '2026-04-21T10:00:00.000Z',
    lastRunFinishedAt: '2026-04-21T10:00:00.000Z',
    lastRunStartedAt: '2026-04-21T09:30:00.000Z',
    latestStoreCatalogedAt: '2026-04-21T09:55:00.000Z',
    latestStorePriceSeenAt: '2026-04-21T09:58:00.000Z',
    priceRecords: 1200,
    statesCovered: 12,
    status: 'ok',
    storeZipCount: 200,
    stores: 45,
    zipCentroidsLoaded: true,
    ...overrides,
  }
}

function buildBridge(overrides: Partial<OpenClawBridgeHealth> = {}): OpenClawBridgeHealth {
  return {
    ingredientsUpdatedToday: 140,
    isFresh: true,
    lastPriceHistoryAt: '2026-04-21T00:00:00.000Z',
    priceHistoryRows: 5000,
    status: 'ok',
    ...overrides,
  }
}

function buildPi(overrides: Partial<OpenClawPiHealth> = {}): OpenClawPiHealth {
  return {
    isFresh: true,
    lastScrapeAt: '2026-04-21T09:45:00.000Z',
    reachable: true,
    status: 'ok',
    ...overrides,
  }
}

function stage(
  id: OpenClawHealthStageId,
  status: OpenClawStageStatus = 'success'
): OpenClawHealthStage {
  const required = OPENCLAW_REQUIRED_HEALTH_STAGES.find((candidate) => candidate.id === id)

  return {
    id,
    label: required?.label ?? id,
    status,
    checkedAt: GENERATED_AT,
    source: `test:${id}`,
    message: `${id} is ${status}`,
  }
}

function allStages(
  overrides: Partial<Record<OpenClawHealthStageId, OpenClawStageStatus>>
): OpenClawHealthStage[] {
  return OPENCLAW_REQUIRED_HEALTH_STAGES.map((required) =>
    stage(required.id, overrides[required.id] ?? 'success')
  )
}

test('normalizePersistedSyncStatus preserves partial runs and failed step names', () => {
  const wrapper = normalizePersistedSyncStatus({
    completed_at: '2026-04-21T10:00:00.000Z',
    consecutive_failures: 0,
    interval_hours: 2,
    last_success_at: '2026-04-21T10:00:00.000Z',
    last_sync: '2026-04-21T10:00:00.000Z',
    last_sync_type: 'full',
    next_sync: '2026-04-21T12:00:00.000Z',
    started_at: '2026-04-21T09:30:00.000Z',
    status: 'partial',
    summary: {
      failedStepNames: ['Sync prices from Pi API'],
      partialSuccess: true,
      runId: 'openclaw-full-1',
      steps: [
        {
          completedAt: '2026-04-21T09:45:00.000Z',
          durationSeconds: 900,
          name: 'Pull catalog from Pi',
          startedAt: '2026-04-21T09:30:00.000Z',
          status: 'success',
        },
        {
          completedAt: '2026-04-21T09:55:00.000Z',
          durationSeconds: 600,
          error: 'Pi API unreachable',
          name: 'Sync prices from Pi API',
          startedAt: '2026-04-21T09:45:00.000Z',
          status: 'failed',
        },
      ],
      syncType: 'full',
    },
  })

  assert.equal(wrapper.status, 'partial')
  assert.equal(wrapper.partialSuccess, true)
  assert.deepEqual(wrapper.failedStepNames, ['Sync prices from Pi API'])
  assert.equal(wrapper.steps[1]?.status, 'failed')
  assert.equal(wrapper.steps[1]?.error, 'Pi API unreachable')
  assert.equal(wrapper.syncType, 'full')
})

test('deriveOpenClawOverallStatus reports partial when wrapper fails but downstream data is fresh', () => {
  const overall = deriveOpenClawOverallStatus({
    bridge: buildBridge(),
    mirror: buildMirror({ isFresh: false, status: 'degraded' }),
    pi: buildPi({ reachable: false, status: 'degraded', isFresh: false, lastScrapeAt: null }),
    wrapper: normalizePersistedSyncStatus({
      completed_at: '2026-04-21T10:00:00.000Z',
      consecutive_failures: 4,
      last_error: 'timed out after 5400.0s',
      last_failure_at: '2026-04-21T10:00:00.000Z',
      last_sync_type: 'full',
      status: 'failed',
    }),
  })

  assert.equal(overall.status, 'partial')
  assert.match(overall.reason, /downstream pricing signals/i)
})

test('buildOpenClawWarnings highlights competing truths and failed steps', () => {
  const warnings = buildOpenClawWarnings({
    bridge: buildBridge(),
    mirror: buildMirror({ isFresh: false, status: 'degraded' }),
    pi: buildPi({ reachable: false, status: 'degraded', isFresh: false, lastScrapeAt: null }),
    wrapper: normalizePersistedSyncStatus({
      completed_at: '2026-04-21T10:00:00.000Z',
      consecutive_failures: 2,
      last_error: 'sync-all failed',
      last_failure_at: '2026-04-21T10:00:00.000Z',
      status: 'failed',
      summary: {
        failedStepNames: ['Pull catalog from Pi'],
        partialSuccess: false,
      },
    }),
  })

  assert.equal(
    warnings.some((warning) => warning.includes('downstream OpenClaw data still appears fresh')),
    true
  )
  assert.equal(
    warnings.some((warning) => warning.includes('local OpenClaw mirror')),
    true
  )
  assert.equal(
    warnings.some((warning) => warning.includes('Pull catalog from Pi')),
    true
  )
})

test('fresh price writes do not mask daemon failure', () => {
  const contract = buildOpenClawHealthContract({
    generatedAt: GENERATED_AT,
    stages: allStages({
      daemon_or_wrapper: 'failed',
      price_history_write: 'success',
    }),
  })

  assert.equal(contract.overall, 'failed')
  assert.ok(
    contract.contradictions.some(
      (contradiction) => contradiction.id === 'fresh-price-history-with-unhealthy-wrapper'
    )
  )
})

test('unknown host state does not become success', () => {
  assert.equal(
    reduceOpenClawOverallStatus(
      allStages({
        scheduled_task_or_host: 'unknown',
      })
    ),
    'unknown'
  )
})

test('partial stage results become overall partial unless a failure exists', () => {
  const partialContract = buildOpenClawHealthContract({
    generatedAt: GENERATED_AT,
    stages: allStages({
      normalization: 'partial',
    }),
  })
  const failedContract = buildOpenClawHealthContract({
    generatedAt: GENERATED_AT,
    stages: allStages({
      normalization: 'partial',
      capture_or_pull: 'failed',
    }),
  })

  assert.equal(partialContract.overall, 'partial')
  assert.equal(failedContract.overall, 'failed')
})

test('contradictions are preserved', () => {
  const contract = buildOpenClawHealthContract({
    generatedAt: GENERATED_AT,
    stages: allStages({}),
    contradictions: [
      {
        id: 'external-test-contradiction',
        severity: 'warning',
        message: 'preserve me',
        sources: ['test'],
      },
    ],
  })

  assert.ok(
    contract.contradictions.some(
      (contradiction) => contradiction.id === 'external-test-contradiction'
    )
  )
})

test('missing source reads fail closed', () => {
  const contract = buildOpenClawHealthContract({
    generatedAt: GENERATED_AT,
    stages: allStages({}),
    sourceReadErrors: [
      {
        source: 'test-source',
        message: 'could not read status file',
        stageIds: ['daemon_or_wrapper'],
      },
    ],
  })
  const daemon = contract.stages.find((candidate) => candidate.id === 'daemon_or_wrapper')

  assert.equal(contract.overall, 'failed')
  assert.equal(daemon?.status, 'failed')
  assert.match(daemon?.message ?? '', /Source read failed closed/)
})
