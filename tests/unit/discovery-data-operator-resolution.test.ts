import assert from 'node:assert/strict'
import test from 'node:test'

import {
  collectOperatorResolutionSignals,
  resolveOperatorSourceIdentity,
  type OperatorSourceIdentity,
} from '@/lib/discovery/operator-entity-resolution'

const websiteRecord: OperatorSourceIdentity = {
  sourceRecordId: 'website-1',
  sourceType: 'direct_operator_website',
  name: 'Harbor Table Restaurant',
  address: '10 Pier St',
  city: 'Boston',
  state: 'MA',
  postalCode: '02110',
  latitude: 42.359,
  longitude: -71.051,
  phone: '+1 (617) 555-0100',
  websiteUrl: 'https://www.harbor-table.example/menu',
}

test('operator resolution auto-links strongly corroborated source records', () => {
  const result = resolveOperatorSourceIdentity(websiteRecord, {
    sourceRecordId: 'osm-1',
    sourceType: 'open_street_map',
    name: 'Harbor Table',
    address: '10 Pier St.',
    city: 'Boston',
    state: 'MA',
    postalCode: '02110',
    latitude: 42.3592,
    longitude: -71.0511,
    phone: '6175550100',
    websiteUrl: 'http://harbor-table.example',
  })

  assert.equal(result.decision, 'auto_link')
  assert.ok(result.confidence >= 0.86)
  assert.ok(result.signals.includes('phone_exact'))
  assert.ok(result.signals.includes('website_host_exact'))
})

test('operator resolution sends weak name/location matches to review instead of unsafe merge', () => {
  const result = resolveOperatorSourceIdentity(websiteRecord, {
    sourceRecordId: 'event-1',
    sourceType: 'event_platform',
    name: 'Harbor Table',
    address: '10 Pier St',
    city: 'Boston',
    state: 'MA',
    postalCode: '02110',
  })

  assert.equal(result.decision, 'review_required')
  assert.ok(result.confidence < 0.86)
  assert.ok(result.signals.includes('address_exact'))
  assert.ok(result.signals.includes('name_exact'))
})

test('operator resolution rejects claimed account conflicts', () => {
  const result = resolveOperatorSourceIdentity(
    { ...websiteRecord, claimedAccountId: 'chef-1' },
    { ...websiteRecord, sourceRecordId: 'claimed-2', claimedAccountId: 'chef-2' }
  )

  assert.equal(result.decision, 'reject')
  assert.equal(result.confidence, 0)
  assert.ok(result.signals.includes('claimed_account_conflict'))
})

test('operator resolution exposes audit signals without mutating source records', () => {
  const signals = collectOperatorResolutionSignals(websiteRecord, {
    sourceRecordId: 'social-1',
    sourceType: 'social_page',
    name: 'Harbor Table',
    city: 'Miami',
    state: 'FL',
    socialUrls: ['instagram.com/harbortable'],
  })

  assert.ok(signals.includes('location_conflict'))
  assert.ok(signals.includes('name_exact'))
})
