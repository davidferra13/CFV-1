import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldRefreshForLiveRouteMutation } from '../../lib/realtime/live-route-invalidation'

test('refreshes for unknown events and unknown entities', () => {
  assert.equal(
    shouldRefreshForLiveRouteMutation('/vendors', {
      event: 'custom_event',
      data: { entity: 'vendors' },
    }),
    true
  )

  assert.equal(
    shouldRefreshForLiveRouteMutation('/vendors', {
      event: 'live_mutation',
      data: { entity: 'new_entity_family' },
    }),
    true
  )
})

test('refreshes current routes that plausibly depend on the mutated entity', () => {
  assert.equal(
    shouldRefreshForLiveRouteMutation('/vendors/items', {
      event: 'live_mutation',
      data: { entity: 'vendor_items' },
    }),
    true
  )

  assert.equal(
    shouldRefreshForLiveRouteMutation('/events/evt_1', {
      event: 'live_mutation',
      data: { entity: 'tickets' },
    }),
    true
  )
})

test('refreshes profile, public, and Remy surfaces for chef profile-context mutations', () => {
  assert.equal(
    shouldRefreshForLiveRouteMutation('/settings/public-profile', {
      event: 'live_mutation',
      data: { entity: 'chef_culinary_profile' },
    }),
    true
  )

  assert.equal(
    shouldRefreshForLiveRouteMutation('/chef/chef-bob', {
      event: 'live_mutation',
      data: { entity: 'remy_profile_context' },
    }),
    true
  )

  assert.equal(
    shouldRefreshForLiveRouteMutation('/remy', {
      event: 'live_mutation',
      data: { entity: 'remy_memories' },
    }),
    true
  )

  assert.equal(
    shouldRefreshForLiveRouteMutation('/vendors', {
      event: 'live_mutation',
      data: { entity: 'remy_profile_context' },
    }),
    false
  )
})

test('skips known live mutations for unrelated route families', () => {
  assert.equal(
    shouldRefreshForLiveRouteMutation('/clients', {
      event: 'live_mutation',
      data: { entity: 'vendor_items' },
    }),
    false
  )

  assert.equal(
    shouldRefreshForLiveRouteMutation('/vendors', {
      event: 'live_mutation',
      data: { entity: 'payments' },
    }),
    false
  )
})

test('keeps overview routes conservative', () => {
  assert.equal(
    shouldRefreshForLiveRouteMutation('/dashboard', {
      event: 'live_mutation',
      data: { entity: 'vendor_items' },
    }),
    true
  )
})

test('skips notification mutations because the notification provider owns that channel', () => {
  assert.equal(
    shouldRefreshForLiveRouteMutation('/dashboard', {
      event: 'live_mutation',
      data: { entity: 'notifications' },
    }),
    false
  )
})
