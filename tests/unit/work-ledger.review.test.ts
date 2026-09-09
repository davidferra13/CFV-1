import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeSessionWindows, splitSessionWindow } from '@/lib/work-ledger/review'

const base = {
  actor_type: 'david_active',
  activity_type: 'website_code',
  event_id: null,
  client_id: null,
  project_key: 'chefflow',
  duration_kind: 'observed_window',
  confidence_tier: 'observed',
  summary: 'Build work',
}

describe('work ledger review planning', () => {
  it('splits a bounded session without losing minutes', () => {
    const parts = splitSessionWindow(
      {
        ...base,
        started_at: '2026-09-08T10:00:00.000Z',
        ended_at: '2026-09-08T11:00:00.000Z',
      },
      '2026-09-08T10:30:00.000Z'
    )
    assert.deepEqual(
      parts.map((part) => part.duration_minutes),
      [30, 30]
    )
  })

  it('merges matching actor sessions and marks the bridged window inferred', () => {
    const merged = mergeSessionWindows([
      { ...base, started_at: '2026-09-08T10:00:00.000Z', ended_at: '2026-09-08T10:20:00.000Z' },
      { ...base, started_at: '2026-09-08T10:25:00.000Z', ended_at: '2026-09-08T11:00:00.000Z' },
    ])
    assert.equal(merged.duration_minutes, 60)
    assert.equal(merged.duration_kind, 'inferred')
    assert.match(merged.boundary_gap, /5 minute gap/)
  })
})
