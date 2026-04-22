import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildQuoteDraftHref,
  buildQuoteDraftPrefillSearchParams,
  mergeQuoteDraftPrefill,
  readQuoteDraftPrefillFromSearchParams,
} from '@/lib/quotes/quote-prefill'

test('parses canonical quote prefill params and round-trips them through the shared builder', () => {
  const params = new URLSearchParams({
    source: 'consulting',
    client_id: '11111111-1111-4111-8111-111111111111',
    inquiry_id: '22222222-2222-4222-8222-222222222222',
    event_id: '33333333-3333-4333-8333-333333333333',
    guest_count: '12',
    total_cents: '420000',
    quote_name: 'Tasting Menu Proposal',
    pricing_model: 'flat_rate',
    price_per_person_cents: '35000',
    deposit_required: 'true',
    deposit_amount_cents: '105000',
    deposit_percentage: '25',
    valid_until: '2026-05-01',
    pricing_notes: 'Four-course service proposal.',
    internal_notes: 'Keep staffing flexible.',
  })

  const parsed = readQuoteDraftPrefillFromSearchParams(params)

  assert.deepEqual(parsed, {
    source: 'consulting',
    client_id: '11111111-1111-4111-8111-111111111111',
    inquiry_id: '22222222-2222-4222-8222-222222222222',
    event_id: '33333333-3333-4333-8333-333333333333',
    guest_count: 12,
    total_cents: 420000,
    quote_name: 'Tasting Menu Proposal',
    pricing_model: 'flat_rate',
    price_per_person_cents: 35000,
    deposit_required: true,
    deposit_amount_cents: 105000,
    deposit_percentage: 25,
    valid_until: '2026-05-01',
    pricing_notes: 'Four-course service proposal.',
    internal_notes: 'Keep staffing flexible.',
  })

  const roundTripParams = buildQuoteDraftPrefillSearchParams(parsed)
  assert.equal(roundTripParams.get('event_id'), '33333333-3333-4333-8333-333333333333')
  assert.equal(roundTripParams.get('from_event'), null)
  assert.equal(buildQuoteDraftHref(parsed), `/quotes/new?${roundTripParams.toString()}`)
})

test('accepts the legacy from_event alias but normalizes to canonical event_id output', () => {
  const parsed = readQuoteDraftPrefillFromSearchParams(
    new URLSearchParams({
      source: 'change_order',
      from_event: '44444444-4444-4444-8444-444444444444',
    })
  )

  assert.equal(parsed.source, 'change_order')
  assert.equal(parsed.event_id, '44444444-4444-4444-8444-444444444444')

  const serialized = buildQuoteDraftPrefillSearchParams(parsed)
  assert.equal(serialized.get('event_id'), '44444444-4444-4444-8444-444444444444')
  assert.equal(serialized.get('from_event'), null)
})

test('drops invalid values and lets explicit later prefills override earlier ones', () => {
  const parsed = readQuoteDraftPrefillFromSearchParams(
    new URLSearchParams({
      source: 'not-real',
      client_id: 'also-not-a-uuid',
      event_id: 'bad-event-id',
      guest_count: '0',
      total_cents: '-1',
      valid_until: '05/01/2026',
      pricing_notes: '   ',
    })
  )

  assert.deepEqual(parsed, {})

  const merged = mergeQuoteDraftPrefill(
    { source: 'event', event_id: '55555555-5555-4555-8555-555555555555', guest_count: 8 },
    { source: 'change_order', guest_count: 14, total_cents: 560000 }
  )

  assert.deepEqual(merged, {
    source: 'change_order',
    event_id: '55555555-5555-4555-8555-555555555555',
    guest_count: 14,
    total_cents: 560000,
  })
})
