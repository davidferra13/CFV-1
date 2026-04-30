import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateProfessionalReadiness,
  parseBuildState,
  summarizeMobileAudit,
  summarizeSync,
} from '../../scripts/lib/professional-readiness-core.mjs'

const GENERATED_AT = '2026-04-30T12:00:00.000Z'

function passingFacts() {
  return {
    generatedAt: GENERATED_AT,
    runtime: {
      beta: { checked: true, ok: true, status: 200 },
      production: { checked: true, ok: true, status: 200 },
    },
    build: {
      typecheckGreen: true,
      buildGreen: true,
      lastVerified: '2026-04-30T10:00:00.000Z',
      commit: 'abc1234',
    },
    sync: {
      status: 'success',
      lastSuccessAt: '2026-04-30T11:00:00.000Z',
      failedStepNames: [],
    },
    mobile: {
      present: true,
      generatedAt: '2026-04-30T09:00:00.000Z',
      executions: 80,
      failures: 0,
    },
    load: {
      present: true,
      generatedAt: '2026-04-30T08:00:00.000Z',
      profile: 'load',
      thresholdsPassed: true,
    },
    environment: {
      separateDatabases: true,
      productionDataProtected: true,
    },
    topology: {
      betaIngressPresent: true,
      productionIngressPresent: true,
    },
    observability: {
      healthRoutes: true,
      sentryDependency: true,
      releaseReports: true,
    },
    release: {
      scripts: ['typecheck', 'verify:release', 'test:mobile:audit', 'test:load', 'test:e2e:smoke'],
    },
  }
}

test('professional readiness passes only with fresh complete evidence', () => {
  const report = evaluateProfessionalReadiness(passingFacts())

  assert.equal(report.status, 'ready')
  assert.equal(report.counts.fail, 0)
  assert.equal(report.score, 100)
})

test('professional readiness blocks missing runtime, mobile, load, sync, and environment proof', () => {
  const facts = passingFacts()
  facts.runtime.production = { checked: true, ok: false, status: 503 }
  facts.sync = summarizeSync({
    status: 'failed',
    last_success_at: null,
    summary: { failedStepNames: ['Refresh materialized views'] },
  })
  facts.mobile = summarizeMobileAudit(null)
  facts.load = { present: false }
  facts.environment = { separateDatabases: false, productionDataProtected: false }

  const report = evaluateProfessionalReadiness(facts)
  const failedKeys = report.gates.filter((gate) => gate.status === 'fail').map((gate) => gate.key)

  assert.equal(report.status, 'blocked')
  assert.ok(failedKeys.includes('runtime_health'))
  assert.ok(failedKeys.includes('pricing_freshness'))
  assert.ok(failedKeys.includes('mobile_proof'))
  assert.ok(failedKeys.includes('load_proof'))
  assert.ok(failedKeys.includes('environment_separation'))
})

test('parseBuildState treats dirty historical build state as unfit for launch proof', () => {
  const state = parseBuildState(`
| Check | Status | Last Verified | Commit | Agent |
| --- | --- | --- | --- | --- |
| \`npx tsc --noEmit --skipLibCheck\` | green | 2026-04-27 | dirty | Agent |
| \`npm run build -- --no-lint\` (16GB heap) | green | 2026-04-27 | dirty | Agent |
`)
  const facts = passingFacts()
  facts.build = state

  const report = evaluateProfessionalReadiness(facts)
  const buildGate = report.gates.find((gate) => gate.key === 'build_integrity')

  assert.equal(buildGate?.status, 'fail')
  assert.equal(report.status, 'blocked')
})
