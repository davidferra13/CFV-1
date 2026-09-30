import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChefOperatorJob, type ChefOperatorJobInput } from '@/lib/operator-job/journey'

type Event = NonNullable<ChefOperatorJobInput['event']>
const completedEvent: Event = {
  id: 'synthetic-event',
  clientId: 'synthetic-client',
  menuId: 'synthetic-menu',
  status: 'completed',
  timelineReady: true,
  groceryListReady: true,
  prepListReady: true,
  packingListReady: true,
  financialAvailable: true,
  outstandingBalanceCents: 0,
  totalPaidCents: 120000,
  depositAmountCents: 30000,
  followUpSent: false,
}
const journeyFor = (overrides: Partial<Event>) =>
  buildChefOperatorJob({
    menu: { id: 'synthetic-menu' },
    event: { ...completedEvent, ...overrides },
  })

for (const flags of [
  { paymentStatus: 'paid' },
  { paymentStatus: 'settled' },
  { financiallyClosed: true },
]) {
  test(`an outstanding ledger balance overrides stale completion flags ${JSON.stringify(flags)}`, () => {
    const journey = journeyFor({ ...flags, outstandingBalanceCents: 50000 })
    assert.equal(journey.currentStep.key, 'payment')
    assert.equal(journey.currentStep.status, 'current')
    assert.equal(journey.complete, false)
  })
}

for (const outstandingBalanceCents of [undefined, null, NaN, Infinity, -1]) {
  test(`an invalid or absent ledger balance blocks closeout (${String(outstandingBalanceCents)})`, () => {
    const journey = journeyFor({ outstandingBalanceCents, paymentStatus: 'paid' })
    assert.equal(journey.currentStep.key, 'payment')
    assert.equal(journey.currentStep.status, 'blocked')
    assert.equal(journey.complete, false)
  })
}

test('an omitted financial-read status is not verified payment', () => {
  const journey = journeyFor({ depositAmountCents: 0, financialAvailable: undefined })
  assert.equal(journey.currentStep.key, 'payment')
  assert.equal(journey.currentStep.status, 'blocked')
})

test('failed deposit read cannot be overridden by stale paid amounts', () => {
  const journey = journeyFor({ financialAvailable: false })
  assert.equal(journey.currentStep.key, 'booking')
  assert.equal(journey.currentStep.status, 'blocked')
})

for (const totalPaidCents of [undefined, null, NaN, Infinity, -1]) {
  test(`an invalid or absent deposit ledger blocks booking (${String(totalPaidCents)})`, () => {
    const journey = journeyFor({ totalPaidCents })
    assert.equal(journey.currentStep.key, 'booking')
    assert.equal(journey.currentStep.status, 'blocked')
  })
}

test('verified zero outstanding advances to follow-up despite a stale unpaid label', () => {
  const journey = journeyFor({ paymentStatus: 'unpaid' })
  assert.equal(journey.currentStep.key, 'follow_up')
  assert.equal(journey.currentStep.status, 'current')
})
