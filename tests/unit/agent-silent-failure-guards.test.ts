import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('reactive hooks record durable failures when enqueueTask returns an error result', () => {
  const source = read('lib/ai/reactive/hooks.ts')

  assert.match(source, /recordSideEffectFailure/)
  assert.match(source, /if \('error' in result\)/)
  assert.match(source, /source:\s*'reactive-hooks'/)
  assert.match(source, /operation:\s*`enqueue:\$\{input\.taskType\}`/)
})

test('scheduled task seeding records job failures and does not permanently seed on tenant load failure', () => {
  const source = read('lib/ai/scheduled/scheduler.ts')

  assert.match(source, /tenantsError/)
  assert.match(source, /operation:\s*'load_tenants'/)
  assert.doesNotMatch(
    source,
    /if \(tenantsError\) \{\s*_seeded = true/s,
    'tenant load failure must remain retryable'
  )
  assert.match(source, /operation:\s*'seed_job'/)
  assert.match(source, /operation:\s*'reschedule_job'/)
})

test('proactive alerts replace empty catch fallbacks with structured failure capture', () => {
  const source = read('lib/ai/remy-proactive-alerts.ts')

  assert.match(source, /runRuleSafely/)
  assert.match(source, /operation:\s*'insert_alert'/)
  assert.doesNotMatch(source, /\.catch\(\(\) => \[\]\)/)
})

test('generic integration webhook records failed async processing, not just thrown rejections', () => {
  const routeSource = read('app/api/webhooks/[provider]/route.ts')
  const pipelineSource = read('lib/integrations/core/pipeline.ts')

  assert.match(routeSource, /\.then\(async \(result\) =>/)
  assert.match(routeSource, /result\.status !== 'failed'/)
  assert.match(routeSource, /source:\s*'generic-integration-webhook'/)
  assert.match(pipelineSource, /markProcessingError/)
  assert.match(pipelineSource, /completeError/)
  assert.match(pipelineSource, /failUpdateError/)
})

test('cron monitor supports strict unhealthy status for external alerting', () => {
  const source = read('app/api/scheduled/monitor/route.ts')

  assert.match(source, /const strict = request\.nextUrl\.searchParams\.get\('strict'\) === '1'/)
  assert.match(source, /status:\s*strict && !overallHealthy \? 503 : 200/)
})
