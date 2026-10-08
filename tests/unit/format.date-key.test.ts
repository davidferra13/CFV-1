import test from 'node:test'
import assert from 'node:assert/strict'
import { dateToDateString } from '@/lib/utils/format'

for (const [zone, instantDay] of [
  ['UTC', '2026-04-12'],
  ['America/New_York', '2026-04-11'],
  ['Asia/Tokyo', '2026-04-12'],
] as const) {
  test(`date-only calendar keys retain their day in ${zone}`, () => {
    const previous = process.env.TZ
    process.env.TZ = zone
    try {
      assert.equal(dateToDateString('2026-04-12'), '2026-04-12')
      assert.equal(dateToDateString('2026-11-01'), '2026-11-01')
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  })
  test(`timestamps and Date objects retain local-day behavior in ${zone}`, () => {
    const previous = process.env.TZ
    process.env.TZ = zone
    try {
      assert.equal(dateToDateString('2026-04-12T00:30:00.000Z'), instantDay)
      assert.equal(dateToDateString(new Date('2026-04-12T00:30:00.000Z')), instantDay)
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  })
}
