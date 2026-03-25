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

test('queue actions durably record state-transition failures instead of ignoring writes', () => {
  const source = read('lib/ai/queue/actions.ts')

  assert.match(source, /async function recordQueueFailure/)
  assert.match(source, /operation:\s*'queue_depth_check'/)
  assert.match(source, /operation:\s*'dedupe_check'/)
  assert.match(source, /operation:\s*'complete_task'/)
  assert.match(source, /operation:\s*'schedule_retry'/)
  assert.match(source, /operation:\s*'recover_hung_tasks'/)
  assert.match(source, /releaseClaimAfterIncrementFailure/)
  assert.doesNotMatch(
    source,
    /completeTask[\s\S]*await db\s*\.from\('ai_task_queue'\)\s*\.update\([\s\S]*?\)\s*\.eq\('id', taskId\)\s*\n\s*\n\s*\/\/ If recurring/s,
    'completeTask should not leave queue updates unchecked'
  )
})

test('lifecycle and follow-up crons record marker-write failures instead of treating sends as success', () => {
  const lifecycleSource = read('app/api/scheduled/lifecycle/route.ts')
  const followUpsSource = read('app/api/scheduled/follow-ups/route.ts')

  assert.match(lifecycleSource, /async function throwLifecycleFailure/)
  assert.match(lifecycleSource, /operation:\s*'mark_payment_reminder_sent'/)
  assert.match(lifecycleSource, /operation:\s*'mark_pre_event_reminder_sent'/)
  assert.match(lifecycleSource, /operation:\s*'mark_quote_expiry_warning_sent'/)
  assert.match(lifecycleSource, /operation:\s*'mark_review_request_sent'/)
  assert.match(followUpsSource, /operation:\s*'reschedule_follow_up'/)
  assert.match(followUpsSource, /operation:\s*'process_follow_up'/)
})

test('remy context records degraded fallbacks instead of collapsing failures into hidden nulls', () => {
  const source = read('lib/ai/remy-context.ts')

  assert.match(source, /async function withContextFallback/)
  assert.match(source, /async function reportContextQueryErrors/)
  assert.match(source, /source:\s*'remy-context'/)
  assert.match(source, /withContextFallback\(\s*tenantId,\s*'load_email_digest'/)
  assert.match(source, /withContextFallback\(\s*tenantId,\s*'load_page_entity_context'/)
  assert.match(source, /withContextFallback\(\s*tenantId,\s*'load_client_intelligence'/)
  assert.doesNotMatch(source, /\.catch\(\(\) => null\)/)
  assert.doesNotMatch(source, /\.catch\(\(\) => undefined\)/)
})
