import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateProductionSafetyEnv } from '@/lib/environment/production-safety'

// The production boot gate must not take the whole app offline for a missing
// email key when outbound email is deliberately off, and must still block
// boot when outbound email is on without a key (2026-09-29 outage).

const base = {
  DATABASE_URL: 'postgres://example',
  CRON_SECRET: 'x',
  NEXT_PUBLIC_SITE_URL: 'https://app.cheflowhq.com',
  NEXT_PUBLIC_APP_URL: 'https://app.cheflowhq.com',
} as NodeJS.ProcessEnv

describe('production safety email gate', () => {
  let savedEnv: string | undefined
  beforeEach(() => {
    savedEnv = process.env.APP_ENV
    process.env.APP_ENV = 'production'
  })
  afterEach(() => {
    if (savedEnv === undefined) delete process.env.APP_ENV
    else process.env.APP_ENV = savedEnv
  })

  it('blocks boot without RESEND_API_KEY when outbound email is on', () => {
    const report = evaluateProductionSafetyEnv({ ...base })
    assert.ok(report.errors.some((e) => e.includes('RESEND_API_KEY')))
  })

  it('blocks boot without RESEND_API_KEY when the outbound flag is anything but false', () => {
    const report = evaluateProductionSafetyEnv({ ...base, NOTIFICATIONS_OUTBOUND_ENABLED: 'true' })
    assert.ok(report.errors.some((e) => e.includes('RESEND_API_KEY')))
  })

  it('boots with a warning when outbound email is explicitly off', () => {
    const report = evaluateProductionSafetyEnv({ ...base, NOTIFICATIONS_OUTBOUND_ENABLED: 'false' })
    assert.equal(report.errors.length, 0)
    assert.ok(report.warnings.some((w) => w.includes('RESEND_API_KEY')))
  })

  it('still requires DATABASE_URL and CRON_SECRET when outbound email is off', () => {
    const report = evaluateProductionSafetyEnv({
      NEXT_PUBLIC_SITE_URL: base.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_APP_URL: base.NEXT_PUBLIC_APP_URL,
      NOTIFICATIONS_OUTBOUND_ENABLED: 'false',
    } as NodeJS.ProcessEnv)
    const joined = report.errors.join(' ')
    assert.ok(joined.includes('DATABASE_URL'))
    assert.ok(joined.includes('CRON_SECRET'))
    assert.ok(!joined.includes('RESEND_API_KEY'))
  })
})
