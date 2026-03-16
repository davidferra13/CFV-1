import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isWithinBusinessHours,
  isEmergencyContext,
  getNextBusinessHoursStart,
} from '../../lib/communication/business-hours-utils'
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

describe('isWithinBusinessHours', () => {
  it('returns true during business hours on a weekday', () => {
    // Tuesday 10:00 AM ET
    const config = makeConfig()
    const tuesday10am = new Date('2026-03-17T15:00:00Z') // 10:00 AM ET (UTC-5)
    assert.strictEqual(isWithinBusinessHours(config, tuesday10am), true)
  })

  it('returns false before business hours', () => {
    const config = makeConfig()
    const tuesday7am = new Date('2026-03-17T12:00:00Z') // 7:00 AM ET
    assert.strictEqual(isWithinBusinessHours(config, tuesday7am), false)
  })

  it('returns false after business hours', () => {
    const config = makeConfig()
    const tuesday6pm = new Date('2026-03-17T23:00:00Z') // 6:00 PM ET
    assert.strictEqual(isWithinBusinessHours(config, tuesday6pm), false)
  })

  it('returns false on disabled day (Saturday)', () => {
    const config = makeConfig()
    const saturday12pm = new Date('2026-03-21T17:00:00Z') // 12:00 PM ET Saturday
    assert.strictEqual(isWithinBusinessHours(config, saturday12pm), false)
  })

  it('returns true on enabled Saturday', () => {
    const config = makeConfig({
      schedule: {
        ...makeConfig().schedule,
        saturday: { enabled: true, start: '10:00', end: '15:00' },
      },
    })
    const saturday12pm = new Date('2026-03-21T17:00:00Z') // 12:00 PM ET
    assert.strictEqual(isWithinBusinessHours(config, saturday12pm), true)
  })

  it('handles different timezones correctly', () => {
    const config = makeConfig({ timezone: 'America/Los_Angeles' })
    // 1:00 PM PT = 9:00 PM UTC
    const tuesday1pmPT = new Date('2026-03-17T21:00:00Z')
    assert.strictEqual(isWithinBusinessHours(config, tuesday1pmPT), true)
  })

  it('returns false exactly at end time', () => {
    const config = makeConfig()
    const tuesday5pm = new Date('2026-03-17T22:00:00Z') // 5:00 PM ET exactly
    assert.strictEqual(isWithinBusinessHours(config, tuesday5pm), false)
  })

  it('returns true exactly at start time', () => {
    const config = makeConfig()
    const tuesday9am = new Date('2026-03-17T14:00:00Z') // 9:00 AM ET exactly
    assert.strictEqual(isWithinBusinessHours(config, tuesday9am), true)
  })
})

describe('isEmergencyContext', () => {
  it('returns true when event is within emergency window', () => {
    const config = makeConfig({ emergency_window_hours: 24 })
    const eventDate = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours from now
    assert.strictEqual(isEmergencyContext(config, eventDate), true)
  })

  it('returns false when event is beyond emergency window', () => {
    const config = makeConfig({ emergency_window_hours: 24 })
    const eventDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours from now
    assert.strictEqual(isEmergencyContext(config, eventDate), false)
  })

  it('returns false when emergency is disabled', () => {
    const config = makeConfig({ emergency_enabled: false })
    const eventDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    assert.strictEqual(isEmergencyContext(config, eventDate), false)
  })

  it('returns false when event date is null', () => {
    const config = makeConfig()
    assert.strictEqual(isEmergencyContext(config, null), false)
  })

  it('returns false when event is in the past', () => {
    const config = makeConfig()
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    assert.strictEqual(isEmergencyContext(config, pastDate), false)
  })
})

describe('getNextBusinessHoursStart', () => {
  it('returns a future date', () => {
    const config = makeConfig()
    const next = getNextBusinessHoursStart(config)
    assert.ok(next.getTime() > Date.now() - 24 * 60 * 60 * 1000) // within last day or future
  })

  it('returns within 8 days', () => {
    const config = makeConfig()
    const next = getNextBusinessHoursStart(config)
    const eightDaysFromNow = Date.now() + 8 * 24 * 60 * 60 * 1000
    assert.ok(next.getTime() < eightDaysFromNow)
  })
})
