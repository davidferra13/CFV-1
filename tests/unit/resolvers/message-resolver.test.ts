import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignMessageTier,
  buildMessageLabel,
  type ConversationRow,
} from '@/lib/discovery/resolvers/chef/message-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseConvo: ConversationRow = {
  id: 'conv-1',
  unread_count: 2,
  other_participant_name: 'Maria',
  context_type: 'event',
  event_id: 'evt-1',
  event_date: '2026-05-17',
  last_message_at: '2026-05-14T11:00:00.000Z',
  last_message_preview: 'Updated allergy info',
}

test('unread with event this week is P0', () => {
  assert.equal(assignMessageTier(baseConvo, now), 'p0')
})

test('unread with event next month is P1', () => {
  const farEvent = { ...baseConvo, event_date: '2026-06-20' }
  assert.equal(assignMessageTier(farEvent, now), 'p1')
})

test('unread with no event is P1', () => {
  const noEvent = { ...baseConvo, event_id: null, event_date: null }
  assert.equal(assignMessageTier(noEvent, now), 'p1')
})

test('zero unread returns null', () => {
  const read = { ...baseConvo, unread_count: 0 }
  assert.equal(assignMessageTier(read, now), null)
})

test('buildMessageLabel includes count and name', () => {
  const label = buildMessageLabel(baseConvo)
  assert.ok(label.includes('2'))
  assert.ok(label.includes('Maria'))
})

test('buildMessageLabel includes preview snippet', () => {
  const label = buildMessageLabel(baseConvo)
  assert.ok(label.includes('allergy'))
})
