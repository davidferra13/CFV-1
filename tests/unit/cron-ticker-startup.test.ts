import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const TICKER_SOURCE = 'lib/cron/ticker.ts'
const INSTRUMENTATION_SOURCE = 'instrumentation.ts'

test('cron ticker does not treat every job as overdue on server startup', () => {
  const source = readFileSync(TICKER_SOURCE, 'utf8')

  assert.match(
    source,
    /const startedAt = Date\.now\(\)[\s\S]*lastRun\.set\(def\.cronName, startedAt\)/,
    'startCronTicker must seed lastRun for every job when the server starts'
  )

  assert.match(
    source,
    /CRON_TICKER_RUN_MISSED_ON_STARTUP/,
    'startup catch-up jobs must be opt-in so the web server is not stampede-loaded after restart'
  )
})

test('production background jobs require explicit opt-in', () => {
  const source = readFileSync(INSTRUMENTATION_SOURCE, 'utf8')

  assert.match(
    source,
    /function areBackgroundJobsEnabled\(\)[\s\S]*ENABLE_BACKGROUND_JOBS[\s\S]*ENABLE_SELF_HOSTED_BACKGROUND_JOBS/,
    'instrumentation must define an explicit opt-in for self-hosted background jobs'
  )

  assert.match(
    source,
    /process\.env\.NODE_ENV === 'production' && !areBackgroundJobsEnabled\(\)/,
    'production web processes must not start cron and simulation workers unless explicitly enabled'
  )
})
