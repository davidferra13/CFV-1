import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildChefEventOperatingSpine,
  buildClientEventProgress,
  getEventMissingDetails,
} from '@/lib/events/operating-spine'
import {
  actionBarItems,
  mobileTabItems,
  navGroups,
  standaloneTop,
} from '@/components/navigation/nav-config'

const baseEvent = {
  id: 'event-1',
  status: 'accepted',
  event_date: '2026-05-10',
  serve_time: '18:00',
  guest_count: 12,
  client_id: 'client-1',
  client: { full_name: 'Joy Client', email: 'joy@example.com' },
  location_address: '123 Main St',
  quoted_price_cents: 240000,
  deposit_amount_cents: 60000,
  dietary_restrictions: ['vegetarian'],
  allergies: [],
}

test('chef event spine prioritizes confirmed payment blockers without inventing success', () => {
  const spine = buildChefEventOperatingSpine({
    event: baseEvent,
    eventMenus: ['menu-1'],
    totalPaidCents: 20000,
    outstandingBalanceCents: 220000,
    financialAvailable: true,
    prepTimelineReady: false,
  })

  assert.equal(spine.nextAction.label, 'Record payment')
  assert.equal(spine.nextAction.owner, 'Client')
  assert.equal(spine.lanes.find((lane) => lane.key === 'finance')?.severity, 'attention')
  assert.equal(spine.missingDetails.length, 0)
})

test('chef event spine fails closed when financial summary is unavailable', () => {
  const spine = buildChefEventOperatingSpine({
    event: baseEvent,
    eventMenus: ['menu-1'],
    totalPaidCents: 0,
    outstandingBalanceCents: 0,
    financialAvailable: false,
  })

  const financeLane = spine.lanes.find((lane) => lane.key === 'finance')
  assert.equal(financeLane?.status, 'Payment status unavailable')
  assert.equal(financeLane?.severity, 'blocked')
})

test('client booking progress keeps proposal, menu, and payment obligations distinct', () => {
  const spine = buildClientEventProgress({
    event: {
      ...baseEvent,
      status: 'proposed',
      menus: [],
      dietary_restrictions: [],
      special_requests: null,
      hasContract: true,
      contractSignedAt: null,
    },
    currentAction: {
      actionLabel: 'Review proposal',
      actionHref: '/my-events/event-1/proposal',
      key: 'proposal_review',
    },
    outstandingBalanceCents: 0,
    financialAvailable: true,
  })

  assert.equal(spine.nextAction.href, '/my-events/event-1/proposal')
  assert.equal(
    spine.lanes.find((lane) => lane.key === 'menu')?.missing?.[0],
    'dietary and allergy details'
  )
  assert.equal(spine.lanes.find((lane) => lane.key === 'payment')?.status, 'No balance due')
})

test('event missing detail helper reports only operational blockers', () => {
  assert.deepEqual(
    getEventMissingDetails({
      id: 'event-2',
      status: 'draft',
      event_date: '2026-05-10',
      guest_count: 1,
      location_address: '',
      quoted_price_cents: null,
    }),
    ['client', 'location', 'serve time', 'confirmed guest count', 'price']
  )
})

test('chef primary navigation follows the six-domain contract', () => {
  assert.deepEqual(
    actionBarItems.map((item) => item.label),
    ['Today', 'Inbox', 'Events', 'Clients', 'Culinary', 'Finance']
  )
  assert.equal(
    actionBarItems.some((item) => item.href === '/inquiries'),
    false
  )
  assert.equal(
    standaloneTop.some((item) => item.href === '/inquiries'),
    false
  )
  assert.equal(
    mobileTabItems.some((item) => item.label === 'Pipeline'),
    false
  )
  assert.equal(
    navGroups.some((group) => group.id === 'pipeline'),
    true
  )
})
