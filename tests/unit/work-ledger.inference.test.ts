import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inferWorkSessions } from '@/lib/work-ledger/inference'

describe('work ledger inference', () => {
  it('keeps one email timestamp as an unknown-duration activity anchor', () => {
    const [session] = inferWorkSessions([
      {
        id: 'email-1',
        sourceType: 'gmail',
        sourceRecordId: 'message-1',
        actorType: 'david_active',
        signalType: 'activity_anchor',
        activityHint: 'client_communication',
        sourceCreatedAt: '2026-09-08T14:00:00.000Z',
      },
    ])

    assert.equal(session.durationMinutes, null)
    assert.equal(session.durationKind, 'unknown')
    assert.equal(session.status, 'review_required')
    assert.deepEqual(session.evidenceIds, ['email-1'])
  })

  it('keeps location-only travel evidence in review', () => {
    const [session] = inferWorkSessions([
      {
        id: 'location-1',
        sourceType: 'google_location',
        sourceRecordId: 'visit-1',
        actorType: 'david_active',
        signalType: 'location_visit',
        activityHint: 'travel',
        intervalStart: '2026-09-08T16:00:00.000Z',
        intervalEnd: '2026-09-08T16:30:00.000Z',
      },
    ])

    assert.equal(session.status, 'review_required')
    assert.equal(session.confidenceTier, 'observed')
    assert.match(session.boundaryGap ?? '', /independent signal/i)
  })

  it('allows independent location and device signals to propose travel', () => {
    const sessions = inferWorkSessions([
      {
        id: 'location-2',
        sourceType: 'google_location',
        sourceRecordId: 'visit-2',
        actorType: 'david_active',
        signalType: 'location_visit',
        activityHint: 'travel',
        intervalStart: '2026-09-08T16:00:00.000Z',
        intervalEnd: '2026-09-08T16:30:00.000Z',
      },
      {
        id: 'device-1',
        sourceType: 'android_route',
        sourceRecordId: 'route-1',
        actorType: 'david_active',
        signalType: 'route_window',
        activityHint: 'travel',
        intervalStart: '2026-09-08T16:00:00.000Z',
        intervalEnd: '2026-09-08T16:30:00.000Z',
      },
    ])
    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].status, 'proposed')
    assert.equal(sessions[0].confidenceTier, 'corroborated')
  })

  it('merges matching observed windows separated by ten minutes or less', () => {
    const sessions = inferWorkSessions([
      {
        id: 'desktop-1',
        sourceType: 'windows',
        sourceRecordId: 'window-1',
        actorType: 'david_active',
        signalType: 'observed_window',
        activityHint: 'website_code',
        intervalStart: '2026-09-08T10:00:00.000Z',
        intervalEnd: '2026-09-08T10:05:00.000Z',
      },
      {
        id: 'desktop-2',
        sourceType: 'windows',
        sourceRecordId: 'window-2',
        actorType: 'david_active',
        signalType: 'observed_window',
        activityHint: 'website_code',
        intervalStart: '2026-09-08T10:12:00.000Z',
        intervalEnd: '2026-09-08T10:20:00.000Z',
      },
    ])

    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].durationMinutes, 20)
    assert.equal(sessions[0].durationKind, 'inferred')
    assert.equal(sessions[0].status, 'proposed')
    assert.deepEqual(sessions[0].evidenceIds, ['desktop-1', 'desktop-2'])
  })
})
