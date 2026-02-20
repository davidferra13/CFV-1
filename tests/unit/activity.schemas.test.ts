import test from 'node:test'
import assert from 'node:assert/strict'
import { activityTrackPayloadSchema } from '@/lib/activity/schemas'

test('activity payload accepts valid event type', () => {
  const result = activityTrackPayloadSchema.safeParse({
    event_type: 'portal_login',
    metadata: { page_path: '/client' },
  })

  assert.equal(result.success, true)
})

test('activity payload rejects unknown event type', () => {
  const result = activityTrackPayloadSchema.safeParse({
    event_type: 'unknown_event',
  })

  assert.equal(result.success, false)
})

test('activity payload rejects invalid entity id', () => {
  const result = activityTrackPayloadSchema.safeParse({
    event_type: 'event_viewed',
    entity_id: 'not-a-uuid',
  })

  assert.equal(result.success, false)
})
