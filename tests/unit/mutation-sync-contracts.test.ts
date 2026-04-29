import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getMutationSyncContract,
  getMutationSyncPlan,
  hasMutationSyncContract,
  listMutationSyncEntities,
  mergeMutationSyncPlan,
} from '../../lib/sync/mutation-sync-contracts'

test('chef culinary profile contract encodes cache, live, and Remy invalidation needs', () => {
  const plan = getMutationSyncPlan('chef_culinary_profiles')

  assert.deepEqual(plan.paths, [
    { path: '/settings/culinary-profile' },
    { path: '/chef/[slug]', type: 'page' },
    { path: '/chef/[slug]/inquire', type: 'page' },
    { path: '/book/[chefSlug]', type: 'page' },
    { path: '/remy' },
  ])
  assert.deepEqual(plan.tags, ['chef-booking-profile', 'chef-layout-{chefId}'])
  assert.deepEqual(plan.liveEntities, ['chef_culinary_profiles', 'chef_culinary_profile'])
  assert.deepEqual(plan.remyContext?.entities, ['chef_culinary_profiles', 'remy_profile_context'])
  assert.deepEqual(plan.patch, { source: 'mutation' })
  assert.match(plan.reason, /booking pages/)
})

test('plan merge adds extra paths, tags, live entities, patch values, and reason once', () => {
  const plan = getMutationSyncPlan('chef_culinary_profiles', {
    paths: [{ path: '/remy' }, { path: '/settings/public-profile' }],
    tags: ['chef-booking-profile', 'remy-context-{chefId}'],
    liveEntities: ['chef_culinary_profiles', 'remy_profile_context'],
    remyContext: {
      entities: ['remy_profile_context', 'remy_memories'],
      reason: 'Derived Remy facts changed.',
    },
    patch: { answerId: 'answer_1' },
    reason: 'Single answer saved.',
  })

  assert.deepEqual(plan.paths, [
    { path: '/settings/culinary-profile' },
    { path: '/chef/[slug]', type: 'page' },
    { path: '/chef/[slug]/inquire', type: 'page' },
    { path: '/book/[chefSlug]', type: 'page' },
    { path: '/remy' },
    { path: '/settings/public-profile' },
  ])
  assert.deepEqual(plan.tags, [
    'chef-booking-profile',
    'chef-layout-{chefId}',
    'remy-context-{chefId}',
  ])
  assert.deepEqual(plan.liveEntities, [
    'chef_culinary_profiles',
    'chef_culinary_profile',
    'remy_profile_context',
  ])
  assert.deepEqual(plan.remyContext?.entities, [
    'chef_culinary_profiles',
    'remy_profile_context',
    'remy_memories',
  ])
  assert.deepEqual(plan.patch, { source: 'mutation', answerId: 'answer_1' })
  assert.match(plan.reason, /Single answer saved\./)
})

test('contract reads and plan merges do not mutate registry state', () => {
  const contract = getMutationSyncContract('chef_culinary_profiles')
  const merged = mergeMutationSyncPlan(getMutationSyncPlan('chef_culinary_profiles'), {
    tags: ['temporary-tag'],
    patch: { temporary: true },
  })
  const fresh = getMutationSyncPlan('chef_culinary_profiles')

  assert.notDeepEqual(merged.tags, fresh.tags)
  assert.deepEqual(fresh.tags, contract.tags)
  assert.deepEqual(fresh.patch, { source: 'mutation' })
})

test('entity helpers expose known contracts without inventing unknown plans', () => {
  assert.equal(hasMutationSyncContract('chef_culinary_profiles'), true)
  assert.equal(hasMutationSyncContract('missing_entity'), false)
  assert.deepEqual(listMutationSyncEntities(), ['chef_culinary_profiles', 'chef_profile_contexts'])
})
