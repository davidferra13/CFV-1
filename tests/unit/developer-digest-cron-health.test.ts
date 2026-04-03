import test from 'node:test'
import assert from 'node:assert/strict'
import { toDigestCronHealthEntry } from '../../lib/email/developer-alerts'
import type { CronHealthEntry as MonitoredCronHealthEntry } from '../../lib/cron/monitor'

function makeCronEntry(
  overrides: Partial<MonitoredCronHealthEntry> = {}
): MonitoredCronHealthEntry {
  return {
    cronName: 'example-cron',
    routePath: '/api/scheduled/example',
    cadence: 'hourly',
    description: 'Example monitored cron',
    status: 'ok',
    alertLevel: 'info',
    lastRunAt: '2026-04-03T10:00:00.000Z',
    lastStatus: 'success',
    lastSuccessAt: '2026-04-03T10:00:00.000Z',
    lastErrorAt: null,
    minutesSinceLastRun: 5,
    maxExpectedMinutes: 60,
    runsLast24h: 24,
    successesLast24h: 24,
    errorsLast24h: 0,
    errorRateLast24h: 0,
    issueRunsLast24h: 0,
    issueRateLast24h: 0,
    latestIssueCount: 0,
    avgDurationMsLast24h: 1200,
    p95DurationMsLast24h: 1800,
    latestErrorText: null,
    message: 'Last run 5 minutes ago.',
    ...overrides,
  }
}

test('digest preserves stale cron status from the shared monitor report', () => {
  const digestEntry = toDigestCronHealthEntry(
    makeCronEntry({
      status: 'stale',
      alertLevel: 'critical',
      minutesSinceLastRun: 185,
      message: 'Last run 185 minutes ago; expected within 120 minutes.',
    })
  )

  assert.equal(digestEntry.status, 'stale')
  assert.match(digestEntry.message ?? '', /expected within 120 minutes/i)
})

test('digest surfaces warning state for non-stale cron health degradations', () => {
  const digestEntry = toDigestCronHealthEntry(
    makeCronEntry({
      status: 'ok',
      alertLevel: 'warning',
      message: '24h issue rate 33.3% across 12 runs.',
    })
  )

  assert.equal(digestEntry.status, 'warning')
  assert.match(digestEntry.message ?? '', /issue rate/i)
})

test('digest still marks latest hard failures as error', () => {
  const digestEntry = toDigestCronHealthEntry(
    makeCronEntry({
      status: 'ok',
      alertLevel: 'warning',
      lastStatus: 'error',
      lastErrorAt: '2026-04-03T10:03:00.000Z',
      errorsLast24h: 1,
      errorRateLast24h: 4.2,
      latestErrorText: 'SMTP timeout',
      message: 'Latest error: SMTP timeout',
    })
  )

  assert.equal(digestEntry.status, 'error')
  assert.match(digestEntry.message ?? '', /SMTP timeout/)
})
