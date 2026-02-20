import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeActivityByCreatedAt, parseTimeRangeDays } from '@/lib/activity/merge'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'
import type { ActivityEvent } from '@/lib/activity/types'

test('mergeActivityByCreatedAt orders chef and client entries by newest first', () => {
  const chef: ChefActivityEntry[] = [
    {
      id: 'chef-1',
      tenant_id: 't',
      actor_id: 'a',
      action: 'event_created',
      domain: 'event',
      entity_type: 'event',
      entity_id: 'e1',
      summary: 'Created event',
      context: {},
      client_id: null,
      created_at: '2026-02-01T10:00:00.000Z',
    },
  ]

  const client: ActivityEvent[] = [
    {
      id: 'client-1',
      tenant_id: 't',
      actor_type: 'client',
      actor_id: 'u',
      client_id: 'c1',
      event_type: 'portal_login',
      entity_type: null,
      entity_id: null,
      metadata: {},
      created_at: '2026-02-02T10:00:00.000Z',
    },
  ]

  const merged = mergeActivityByCreatedAt(chef, client)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].source, 'client')
  assert.equal(merged[1].source, 'chef')
})

test('parseTimeRangeDays supports all configured ranges', () => {
  assert.equal(parseTimeRangeDays('1'), 1)
  assert.equal(parseTimeRangeDays('7'), 7)
  assert.equal(parseTimeRangeDays('30'), 30)
  assert.equal(parseTimeRangeDays('90'), 90)
})
