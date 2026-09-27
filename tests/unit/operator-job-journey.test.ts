import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChefOperatorJob } from '@/lib/operator-job/journey'

test('new chef starts with one obvious first action and no fake history', () => {
  const journey = buildChefOperatorJob({ title: 'First chef job' })

  assert.equal(journey.currentStep.key, 'inquiry')
  assert.equal(journey.currentStep.actionLabel, 'Capture first inquiry')
  assert.equal(journey.record.clientId, null)
  assert.equal(journey.record.eventId, null)
  assert.equal(journey.complete, false)
  assert.equal(journey.steps.filter((step) => step.status === 'current').length, 1)
})

test('direct-created onboarding event does not send the chef back to inquiry intake', () => {
  const journey = buildChefOperatorJob({
    title: 'First dinner',
    clientName: 'First Client',
    event: {
      id: 'event-1',
      status: 'draft',
      clientId: 'client-1',
      menuId: 'menu-1',
      timelineReady: false,
      groceryListReady: false,
      prepListReady: false,
      packingListReady: false,
      financialAvailable: true,
    },
    menu: { id: 'menu-1' },
  })

  assert.equal(journey.connectionKey, 'event:event-1')
  assert.equal(journey.currentStep.key, 'event_plan')
  assert.equal(journey.currentStep.href, '/events/event-1/schedule')
})

test('DF Private Chef inquiry keeps one client record and pre-fills the proposal from it', () => {
  const journey = buildChefOperatorJob({
    title: '70th birthday dinner',
    clientName: 'Whitney',
    inquiry: {
      id: '11111111-1111-4111-8111-111111111111',
      status: 'qualified',
      clientId: '22222222-2222-4222-8222-222222222222',
    },
    client: { id: '22222222-2222-4222-8222-222222222222' },
  })

  assert.equal(journey.currentStep.key, 'quote_menu')
  assert.equal(journey.record.clientId, '22222222-2222-4222-8222-222222222222')
  assert.match(journey.currentStep.href, /client_id=22222222-2222-4222-8222-222222222222/)
  assert.match(journey.currentStep.href, /inquiry_id=11111111-1111-4111-8111-111111111111/)
})

test('sent quote and selected menu stay on proposal until acceptance', () => {
  const journey = buildChefOperatorJob({
    inquiry: {
      id: 'inquiry-1',
      status: 'quoted',
      clientId: 'client-1',
    },
    quote: { id: 'quote-1', status: 'sent' },
    selectedMenuId: 'menu-source-1',
  })

  assert.equal(journey.currentStep.key, 'quote_menu')
  assert.equal(journey.complete, false)
})

test('accepted quote and selected menu advance to booking without re-entry', () => {
  const journey = buildChefOperatorJob({
    inquiry: {
      id: 'inquiry-1',
      status: 'confirmed',
      clientId: 'client-1',
    },
    quote: { id: 'quote-1', status: 'accepted' },
    selectedMenuId: 'menu-source-1',
  })

  assert.equal(journey.currentStep.key, 'booking')
  assert.equal(journey.currentStep.href, '/inquiries/inquiry-1')
  assert.equal(journey.record.selectedMenuId, 'menu-source-1')
  assert.equal(journey.record.menuId, null)
})

test('booked event preserves selected menu lineage into event planning and production', () => {
  const base = {
    inquiry: {
      id: 'inquiry-1',
      status: 'confirmed',
      clientId: 'client-1',
      convertedEventId: 'event-1',
    },
    quote: { id: 'quote-1', status: 'accepted' },
    selectedMenuId: 'menu-source-1',
    menu: { id: 'menu-event-1', forkedFromId: 'menu-source-1' },
  } as const

  const plan = buildChefOperatorJob({
    ...base,
    event: {
      id: 'event-1',
      status: 'confirmed',
      clientId: 'client-1',
      menuId: 'menu-event-1',
      timelineReady: false,
    },
  })
  assert.equal(plan.connectionKey, 'event:event-1')
  assert.equal(plan.currentStep.key, 'event_plan')
  assert.equal(plan.currentStep.href, '/events/event-1/schedule')

  const shopping = buildChefOperatorJob({
    ...base,
    event: {
      id: 'event-1',
      status: 'confirmed',
      clientId: 'client-1',
      menuId: 'menu-event-1',
      timelineReady: true,
      groceryListReady: false,
      prepListReady: false,
      packingListReady: false,
    },
  })
  assert.equal(shopping.currentStep.key, 'production')
  assert.equal(shopping.currentStep.href, '/events/event-1/grocery-run')
})

test('booked event with no operational menu stays at quote and menu continuity', () => {
  const journey = buildChefOperatorJob({
    inquiry: {
      id: 'inquiry-1',
      status: 'confirmed',
      clientId: 'client-1',
      convertedEventId: 'event-1',
    },
    quote: { id: 'quote-1', status: 'accepted' },
    selectedMenuId: 'menu-source-1',
    event: {
      id: 'event-1',
      status: 'draft',
      clientId: 'client-1',
      menuId: null,
      timelineReady: false,
      financialAvailable: true,
    },
  })

  assert.equal(journey.currentStep.key, 'quote_menu')
  assert.equal(journey.record.menuId, null)
})

test('booked event blocks when operational menu loses selected-menu lineage', () => {
  const journey = buildChefOperatorJob({
    inquiry: {
      id: 'inquiry-1',
      status: 'confirmed',
      clientId: 'client-1',
      convertedEventId: 'event-1',
    },
    quote: { id: 'quote-1', status: 'accepted' },
    selectedMenuId: 'menu-source-1',
    menu: { id: 'menu-event-1', forkedFromId: 'different-menu' },
    event: {
      id: 'event-1',
      status: 'draft',
      clientId: 'client-1',
      menuId: 'menu-event-1',
      timelineReady: false,
      financialAvailable: true,
    },
  })

  assert.equal(journey.currentStep.key, 'quote_menu')
  assert.equal(journey.currentStep.status, 'blocked')
  assert.equal(journey.currentStep.actionLabel, 'Reconcile event menu')
})

test('production readiness advances into service on the same event', () => {
  const journey = buildChefOperatorJob({
    inquiry: { id: 'inquiry-1', status: 'confirmed', clientId: 'client-1' },
    quote: { id: 'quote-1', status: 'accepted' },
    menu: { id: 'menu-1' },
    event: {
      id: 'event-1',
      status: 'in_progress',
      clientId: 'client-1',
      menuId: 'menu-1',
      timelineReady: true,
      groceryListReady: true,
      prepListReady: true,
      packingListReady: true,
      serviceStartedAt: '2026-09-27T18:00:00Z',
      paymentStatus: 'partial',
      outstandingBalanceCents: 50000,
      financialAvailable: true,
    },
  })

  assert.equal(journey.currentStep.key, 'service')
  assert.equal(journey.currentStep.href, '/events/event-1/service')
})

test('completed service advances to final payment before follow-up', () => {
  const journey = buildChefOperatorJob({
    inquiry: { id: 'inquiry-1', status: 'confirmed', clientId: 'client-1' },
    quote: { id: 'quote-1', status: 'accepted' },
    menu: { id: 'menu-1' },
    event: {
      id: 'event-1',
      status: 'completed',
      clientId: 'client-1',
      menuId: 'menu-1',
      timelineReady: true,
      groceryListReady: true,
      prepListReady: true,
      packingListReady: true,
      serviceCompletedAt: '2026-09-27T22:00:00Z',
      paymentStatus: 'partial',
      outstandingBalanceCents: 50000,
      financialAvailable: true,
      followUpSent: false,
    },
  })

  assert.equal(journey.currentStep.key, 'payment')
  assert.equal(journey.currentStep.actionLabel, 'Record final payment')
})

test('unknown payment state blocks truthfully instead of assuming zero balance', () => {
  const journey = buildChefOperatorJob({
    inquiry: { id: 'inquiry-1', status: 'confirmed', clientId: 'client-1' },
    quote: { id: 'quote-1', status: 'accepted' },
    menu: { id: 'menu-1' },
    event: {
      id: 'event-1',
      status: 'completed',
      clientId: 'client-1',
      menuId: 'menu-1',
      timelineReady: true,
      groceryListReady: true,
      prepListReady: true,
      packingListReady: true,
      serviceCompletedAt: '2026-09-27T22:00:00Z',
      financialAvailable: false,
      followUpSent: false,
    },
  })

  assert.equal(journey.currentStep.key, 'payment')
  assert.equal(journey.currentStep.status, 'blocked')
  assert.match(journey.currentStep.summary, /could not be verified/i)
})

test('paid completed job advances to follow-up, then becomes complete', () => {
  const base = {
    inquiry: { id: 'inquiry-1', status: 'confirmed', clientId: 'client-1' },
    quote: { id: 'quote-1', status: 'accepted' },
    menu: { id: 'menu-1' },
    event: {
      id: 'event-1',
      status: 'completed',
      clientId: 'client-1',
      menuId: 'menu-1',
      timelineReady: true,
      groceryListReady: true,
      prepListReady: true,
      packingListReady: true,
      serviceCompletedAt: '2026-09-27T22:00:00Z',
      paymentStatus: 'paid',
      outstandingBalanceCents: 0,
      financialAvailable: true,
      followUpSent: false,
    },
  } as const

  const followUp = buildChefOperatorJob(base)
  assert.equal(followUp.currentStep.key, 'follow_up')
  assert.equal(followUp.currentStep.href, '/events/event-1/follow-up')

  const closed = buildChefOperatorJob({
    ...base,
    event: { ...base.event, followUpSent: true },
  })
  assert.equal(closed.complete, true)
  assert.equal(closed.steps.every((step) => step.status === 'complete'), true)
})
