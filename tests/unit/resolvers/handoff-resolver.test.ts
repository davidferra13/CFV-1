import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assignHandoffTier,
  buildHandoffContext,
  buildHandoffDestination,
  buildHandoffLabel,
  resolveHandoffRow,
  type IncomingCollabHandoff,
  type OutgoingCollabHandoff,
} from '@/lib/discovery/resolvers/chef/handoff-resolver'

const now = new Date('2026-05-15T12:00:00.000Z')

const chef = {
  chef_id: 'chef-2',
  display_name: 'Maria Chen',
  business_name: 'Maria Kitchen',
  profile_image_url: null,
  city: 'Boston',
  state: 'MA',
}

const baseIncoming: IncomingCollabHandoff = {
  recipient_row_id: 'recipient-1',
  handoff_id: 'handoff-in',
  title: 'Graduation dinner lead',
  handoff_type: 'lead',
  source_entity_type: 'inquiry',
  source_entity_id: 'inquiry-1',
  status: 'open',
  recipient_status: 'sent',
  response_note: null,
  event_date: '2026-05-18',
  occasion: 'Graduation Dinner',
  guest_count: 24,
  location_text: 'Cambridge',
  budget_cents: 480000,
  private_note: 'Client prefers family style.',
  client_context: {},
  expires_at: '2026-05-16T10:00:00.000Z',
  created_at: '2026-05-15T08:00:00.000Z',
  viewed_at: null,
  responded_at: null,
  from_chef: chef,
}

const baseOutgoing: OutgoingCollabHandoff = {
  handoff_id: 'handoff-out',
  title: 'Backup chef needed',
  handoff_type: 'event_backup',
  source_entity_type: 'event',
  source_entity_id: 'event-1',
  status: 'open',
  event_date: '2026-05-30',
  occasion: 'Corporate Lunch',
  guest_count: 60,
  location_text: 'Somerville',
  budget_cents: null,
  private_note: null,
  client_context: {},
  expires_at: '2026-05-25T12:00:00.000Z',
  visibility_scope: 'selected_chefs',
  created_at: '2026-05-15T08:00:00.000Z',
  recipients: [
    {
      recipient_row_id: 'recipient-2',
      recipient_status: 'sent',
      response_note: null,
      viewed_at: null,
      responded_at: null,
      chef,
    },
  ],
}

test('pending incoming handoff resolves as urgent with accept action', () => {
  assert.equal(assignHandoffTier(baseIncoming, now), 'p0')

  const item = resolveHandoffRow(baseIncoming, now)
  assert.ok(item)
  assert.equal(item.definitionId, 'chef.network_referral_received')
  assert.equal(item.destination, '/network?tab=collab&handoff=handoff-in')
  assert.equal(item.inlineActions?.[0]?.action, 'respond_collab_handoff')
  assert.equal(item.inlineActions?.[0]?.params.handoffId, 'handoff-in')
  assert.equal(item.inlineActions?.[0]?.params.action, 'accepted')
})

test('outgoing handoff awaiting response resolves with pending context', () => {
  assert.equal(assignHandoffTier(baseOutgoing, now), 'p3')

  const item = resolveHandoffRow(baseOutgoing, now)
  assert.ok(item)
  assert.equal(item.definitionId, 'chef.network_handoff_waiting')
  assert.ok(item.label.includes('1 awaiting'))
  assert.equal(item.inlineActions?.[0]?.action, 'navigate')
})

test('expired and declined handoffs are suppressed', () => {
  assert.equal(
    resolveHandoffRow({ ...baseIncoming, expires_at: '2026-05-15T11:00:00.000Z' }, now),
    null
  )
  assert.equal(resolveHandoffRow({ ...baseIncoming, recipient_status: 'rejected' }, now), null)
  assert.equal(resolveHandoffRow({ ...baseIncoming, status: 'expired' }, now), null)
})

test('destination points to network collab tab with focused handoff id', () => {
  assert.equal(
    buildHandoffDestination({ ...baseIncoming, handoff_id: 'handoff/id with space' }),
    '/network?tab=collab&handoff=handoff%2Fid%20with%20space'
  )
})

test('label and context include handoff details', () => {
  const label = buildHandoffLabel(baseIncoming)
  const context = buildHandoffContext(baseIncoming)

  assert.ok(label.includes('Graduation dinner lead'))
  assert.ok(label.includes('24g'))
  assert.ok(label.includes('from Maria Kitchen'))
  assert.ok(context.includes('Graduation Dinner'))
  assert.ok(context.includes('Cambridge'))
})
