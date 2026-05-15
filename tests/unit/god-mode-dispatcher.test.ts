import test from 'node:test'
import assert from 'node:assert/strict'
import type { GodModeResolvedItem, GodModeResolverContext } from '@/lib/discovery/god-mode-types'
import { dispatchResolvers, type ResolverEntry } from '@/lib/discovery/god-mode-dispatcher'

const ctx: GodModeResolverContext = {
  userId: 'u-1',
  tenantId: 't-1',
  role: 'chef',
  now: new Date('2026-05-14T12:00:00.000Z'),
}

const item1: GodModeResolvedItem = {
  definitionId: 'chef.inquiry_new',
  tier: 'p0',
  label: 'Sarah B. 12g Jun 14 3d waiting',
  context: 'Birthday Dinner',
  destination: '/chef/inquiries/1',
}

const item2: GodModeResolvedItem = {
  definitionId: 'chef.message_new',
  tier: 'p1',
  label: '2 unread Maria',
  context: 'Allergy update',
  destination: '/chef/messages/1',
}

test('dispatcher merges results from multiple resolvers', async () => {
  const resolvers: ResolverEntry[] = [
    { name: 'inquiries', resolve: async () => [item1] },
    { name: 'messages', resolve: async () => [item2] },
  ]
  const result = await dispatchResolvers(resolvers, ctx)
  assert.equal(result.length, 2)
  assert.equal(result[0].definitionId, 'chef.inquiry_new')
  assert.equal(result[1].definitionId, 'chef.message_new')
})

test('dispatcher isolates resolver failures', async () => {
  const resolvers: ResolverEntry[] = [
    { name: 'inquiries', resolve: async () => [item1] },
    {
      name: 'broken',
      resolve: async () => {
        throw new Error('DB down')
      },
    },
    { name: 'messages', resolve: async () => [item2] },
  ]
  const result = await dispatchResolvers(resolvers, ctx)
  assert.equal(result.length, 2)
})

test('dispatcher returns empty array when all fail', async () => {
  const resolvers: ResolverEntry[] = [
    {
      name: 'broken1',
      resolve: async () => {
        throw new Error('fail')
      },
    },
  ]
  const result = await dispatchResolvers(resolvers, ctx)
  assert.equal(result.length, 0)
})

test('dispatchHotResolvers and dispatchAllResolvers are exported functions', async () => {
  const mod = await import('@/lib/discovery/god-mode-dispatcher')
  assert.equal(typeof mod.dispatchHotResolvers, 'function')
  assert.equal(typeof mod.dispatchAllResolvers, 'function')
})
