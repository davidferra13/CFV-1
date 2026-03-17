import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildActivityTrackPayload } from '@/lib/activity/client-payload'

describe('activity client payload', () => {
  it('preserves UUID entity identifiers in the API payload', () => {
    const payload = buildActivityTrackPayload({
      eventType: 'page_viewed',
      entityType: 'event',
      entityId: '184c86f7-69bf-4654-97f9-b3b923193301',
      metadata: { source: 'dashboard' },
    })

    assert.equal(payload.entity_id, '184c86f7-69bf-4654-97f9-b3b923193301')
    assert.deepEqual(payload.metadata, { source: 'dashboard' })
  })

  it('moves non-UUID entity identifiers into metadata to avoid API 400s', () => {
    const payload = buildActivityTrackPayload({
      eventType: 'page_viewed',
      entityType: 'client_dashboard_widget',
      entityId: 'action_required',
      metadata: { source: 'my_events_dashboard' },
    })

    assert.equal('entity_id' in payload, false)
    assert.deepEqual(payload.metadata, {
      source: 'my_events_dashboard',
      entity_key: 'action_required',
    })
  })
})
