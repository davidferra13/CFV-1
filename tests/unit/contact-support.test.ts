import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildContactSupportInfo, summarizeBusinessHours } from '../../lib/contact/public-support'
import type { BusinessHoursConfig } from '../../lib/communication/business-hours-utils'

const makeConfig = (overrides?: Partial<BusinessHoursConfig>): BusinessHoursConfig => ({
  id: 'test',
  chef_id: 'test-chef',
  timezone: 'America/New_York',
  schedule: {
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '10:00', end: '15:00' },
    sunday: { enabled: false, start: '10:00', end: '15:00' },
  },
  outside_hours_message: 'Outside hours',
  emergency_enabled: true,
  emergency_window_hours: 24,
  ...overrides,
})

describe('summarizeBusinessHours', () => {
  it('groups consecutive days with matching hours into a compact summary', () => {
    const summary = summarizeBusinessHours(makeConfig().schedule)

    assert.deepStrictEqual(summary, [
      { dayLabel: 'Monday - Friday', hoursLabel: '9:00 AM - 5:00 PM' },
      { dayLabel: 'Saturday - Sunday', hoursLabel: 'Closed' },
    ])
  })

  it('breaks groups when hours differ', () => {
    const config = makeConfig({
      schedule: {
        ...makeConfig().schedule,
        friday: { enabled: true, start: '10:00', end: '16:00' },
      },
    })

    const summary = summarizeBusinessHours(config.schedule)

    assert.deepStrictEqual(summary, [
      { dayLabel: 'Monday - Thursday', hoursLabel: '9:00 AM - 5:00 PM' },
      { dayLabel: 'Friday', hoursLabel: '10:00 AM - 4:00 PM' },
      { dayLabel: 'Saturday - Sunday', hoursLabel: 'Closed' },
    ])
  })
})

describe('buildContactSupportInfo', () => {
  it('returns dynamic support status when business hours are configured', () => {
    const info = buildContactSupportInfo({
      supportEmail: 'support@cheflowhq.com',
      businessHoursConfig: makeConfig(),
      now: new Date('2026-03-17T15:00:00Z'),
    })

    assert.strictEqual(info.supportEmail, 'support@cheflowhq.com')
    assert.strictEqual(info.isConfigured, true)
    assert.strictEqual(info.isOpen, true)
    assert.strictEqual(info.statusLabel, 'Open now')
    assert.match(info.currentTimeLabel ?? '', /Tuesday/)
    assert.deepStrictEqual(info.hoursSummary[0], {
      dayLabel: 'Monday - Friday',
      hoursLabel: '9:00 AM - 5:00 PM',
    })
  })

  it('falls back to static public support defaults when business hours are unavailable', () => {
    const info = buildContactSupportInfo({
      supportEmail: 'support@cheflowhq.com',
    })

    assert.strictEqual(info.isConfigured, false)
    assert.strictEqual(info.isOpen, null)
    assert.strictEqual(info.statusLabel, null)
    assert.strictEqual(info.currentTimeLabel, null)
    assert.deepStrictEqual(info.hoursSummary, [
      { dayLabel: 'Monday - Friday', hoursLabel: '9:00 AM - 5:00 PM PST' },
      { dayLabel: 'Saturday - Sunday', hoursLabel: 'Closed' },
    ])
  })
})
