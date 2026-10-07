import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'

// Execute the actual snapshot builder. Replace only external dependency boundaries;
// no database, provider call, incident email or background job runs in this fixture.
const key = '__chefFlowCoreHealthFixture'
const stubs = {
  '@/lib/observability/request-id': 'export const getRequestId = () => "core-health-test"',
  '@/lib/cron/definitions': 'export const CRON_MONITOR_DEFINITIONS = [{cronName:"db-backup"}]',
  '@/lib/cron/monitor': `export const buildCronHealthReport = async () => globalThis.${key}.cron`,
  '@/lib/resilience/circuit-breaker': `export const getCircuitBreakerHealth = () => globalThis.${key}.breakers`,
  '@/lib/ai/dispatch/routing-table': `export const getAiRuntimePolicy = () => globalThis.${key}.ai; export const isLocalOllamaUrl = url => /localhost|127\\.0\\.0\\.1/.test(url)`,
  '@/lib/db/boot-contract': `export const inspectLiveDbBootContract = async () => globalThis.${key}.db`,
}
const aliases = Object.fromEntries(
  Object.entries(stubs).map(([name, code]) => [
    name,
    'data:text/javascript,' + encodeURIComponent(code),
  ])
)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return aliases[specifier]
      ? { url: aliases[specifier], shortCircuit: true }
      : nextResolve(specifier, context)
  },
})
test.after(() => {
  hooks.deregister()
  delete globalThis[key]
})
const source = readFileSync(new URL('../../lib/health/public-health.ts', import.meta.url), 'utf8')
const actual = await import(
  'data:text/javascript,' + encodeURIComponent(stripTypeScriptTypes(source))
)
const envKeys = [
  'DATABASE_URL',
  'NEXT_PUBLIC_APP_ENV',
  'APP_ENV',
  'PUBLIC_HEALTH_REQUIRED_CRONS',
  'READINESS_REQUIRED_CRONS',
  'PUBLIC_HEALTH_SKIP_DB_BOOT_CONTRACT',
]

async function withFixture(change, run) {
  const original = Object.fromEntries(envKeys.map((name) => [name, process.env[name]]))
  for (const name of envKeys) delete process.env[name]
  process.env.DATABASE_URL = 'postgresql://fixture-only'
  process.env.NEXT_PUBLIC_APP_ENV = 'production'
  globalThis[key] = {
    ai: {
      mode: 'local',
      endpoints: [
        { name: 'local', enabled: true, location: 'local', baseUrl: 'http://localhost:11434' },
      ],
    },
    breakers: {},
    db: {
      status: 'ok',
      checkedAt: '2026-10-07T00:00:00Z',
      contractVersion: 'db-boot-contract.v1',
      missingObjects: [],
      missingReadinessObjects: [],
    },
    cron: {
      healthy: true,
      crons: [{ lastRunAt: '2026-10-07T00:00:00Z' }],
      missingCrons: [],
      staleCrons: [],
    },
  }
  try {
    change(globalThis[key])
    await run()
  } finally {
    for (const name of envKeys) {
      if (original[name] === undefined) delete process.env[name]
      else process.env[name] = original[name]
    }
  }
}
const snapshot = (options) =>
  actual.buildPublicHealthSnapshot({
    requiredEnvVars: ['DATABASE_URL'],
    includeBackgroundJobs: true,
    ...options,
  })

test('core readiness remains available with local-only AI while reporting its degradation', async () => {
  await withFixture(
    () => {},
    async () => {
      const result = await snapshot()
      assert.equal(result.status, 'ok')
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 200)
      assert.equal(result.body.checks.aiRuntime, 'degraded')
      assert.equal(result.body.details.aiRuntime.reason, 'local_only_in_production')
      assert.equal(result.body.details.aiRuntime.required, false)
    }
  )
})
test('core readiness remains available with no AI endpoint', async () => {
  await withFixture(
    (f) => {
      f.ai = { mode: 'local', endpoints: [] }
    },
    async () => {
      const result = await snapshot()
      assert.equal(result.status, 'ok')
      assert.equal(result.body.details.aiRuntime.reason, 'not_configured')
    }
  )
})
test('an explicitly AI-dependent snapshot fails readiness without a production AI endpoint', async () => {
  await withFixture(
    () => {},
    async () => {
      const result = await snapshot({ requireAiRuntime: true })
      assert.equal(result.status, 'degraded')
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
      assert.equal(result.body.details.aiRuntime.required, true)
    }
  )
})
test('missing database environment still fails strict core readiness', async () => {
  await withFixture(
    () => {
      delete process.env.DATABASE_URL
    },
    async () => {
      const result = await snapshot()
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
      assert.equal(result.body.checks.db, 'missing_env')
    }
  )
})
test('an unreachable database still fails strict core readiness', async () => {
  await withFixture(
    (f) => {
      f.db.status = 'unreachable'
      f.db.errorMessage = 'fixture connection refused'
    },
    async () => {
      const result = await snapshot()
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
      assert.equal(result.body.checks.db, 'unreachable')
      assert.equal(result.body.details.dbContractError, 'fixture connection refused')
    }
  )
})
test('an incomplete database boot contract still fails strict core readiness', async () => {
  await withFixture(
    (f) => {
      f.db.status = 'missing_objects'
      f.db.missingReadinessObjects = [{ id: 'booking-records' }]
    },
    async () => {
      const result = await snapshot()
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
      assert.deepEqual(result.body.details.dbMissingReadinessObjects, ['booking-records'])
    }
  )
})
test('a stale required background job still fails strict core readiness', async () => {
  await withFixture(
    (f) => {
      process.env.PUBLIC_HEALTH_REQUIRED_CRONS = 'db-backup'
      f.cron.healthy = false
      f.cron.staleCrons = ['db-backup']
    },
    async () => {
      const result = await snapshot()
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
      assert.equal(result.body.checks.backgroundJobs, 'degraded')
      assert.equal(result.body.details.backgroundJobs.stale, 1)
    }
  )
})
test('a failed payment service still fails strict core readiness', async () => {
  await withFixture(
    (f) => {
      f.breakers = { stripe: { state: 'OPEN', failures: 3 } }
    },
    async () => {
      const result = await snapshot()
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
      assert.equal(result.body.checks.circuitBreakers, 'degraded')
    }
  )
})
test('an unknown degraded service remains required', async () => {
  await withFixture(
    (f) => {
      f.breakers = { unknown: { state: 'HALF_OPEN', failures: 1 } }
    },
    async () => {
      const result = await snapshot()
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
    }
  )
})
test('the known optional model breaker is visible without failing core readiness', async () => {
  await withFixture(
    (f) => {
      f.breakers = { gemini: { state: 'OPEN', failures: 5 } }
    },
    async () => {
      const result = await snapshot()
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 200)
      assert.deepEqual(result.body.details.circuitBreakers, [
        { name: 'gemini', state: 'OPEN', failures: 5, required: false },
      ])
    }
  )
})
test('the same model breaker fails readiness when AI is explicitly required', async () => {
  await withFixture(
    (f) => {
      f.ai.endpoints = [
        { name: 'cloud', enabled: true, location: 'cloud', baseUrl: 'https://fixture.invalid' },
      ]
      f.breakers = { gemini: { state: 'OPEN', failures: 5 } }
    },
    async () => {
      const result = await snapshot({ requireAiRuntime: true })
      assert.equal(actual.getPublicHealthResponseStatus(true, result.status), 503)
      assert.equal(result.body.details.circuitBreakers[0].required, true)
    }
  )
})
