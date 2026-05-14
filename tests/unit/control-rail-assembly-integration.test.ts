import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assembleDiscoveryRailItems,
  classifyDiscoveryRailSlot,
  evaluateDiscoveryRailSlotPolicy,
  normalizeDiscoveryRailCooldownKey,
  type DiscoveryRailAssemblyItem,
} from '@/lib/discovery/control-rail-contracts'

function makeItem(
  overrides: Partial<DiscoveryRailAssemblyItem> & { type: DiscoveryRailAssemblyItem['type'] }
): DiscoveryRailAssemblyItem {
  return { label: 'Test', href: '/eat', ...overrides }
}

test('assembleDiscoveryRailItems filters hidden items', () => {
  const items = [
    makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' }),
    makeItem({ type: 'cuisine', label: 'French', href: '/eat?cuisine=french' }),
  ]
  const hiddenKey = normalizeDiscoveryRailCooldownKey(items[1])
  const result = assembleDiscoveryRailItems(items, {
    hiddenKeys: [hiddenKey],
  })
  assert.equal(result.length, 1)
  assert.equal(result[0].label, 'Italian')
})

test('assembleDiscoveryRailItems puts pinned items first', () => {
  const items = [
    makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' }),
    makeItem({ type: 'cuisine', label: 'French', href: '/eat?cuisine=french' }),
    makeItem({ type: 'cuisine', label: 'Thai', href: '/eat?cuisine=thai' }),
  ]
  const pinnedKey = normalizeDiscoveryRailCooldownKey(items[2])
  const result = assembleDiscoveryRailItems(items, {
    pinnedKeys: [pinnedKey],
    seed: '42',
  })
  assert.equal(result[0].label, 'Thai')
})

test('classifyDiscoveryRailSlot: cuisine => practical', () => {
  assert.equal(classifyDiscoveryRailSlot(makeItem({ type: 'cuisine' })), 'practical')
})

test('classifyDiscoveryRailSlot: featured_chef => editorial', () => {
  assert.equal(classifyDiscoveryRailSlot(makeItem({ type: 'featured_chef' })), 'editorial')
})

test('classifyDiscoveryRailSlot: story => ambient', () => {
  assert.equal(classifyDiscoveryRailSlot(makeItem({ type: 'story' })), 'ambient')
})

test('evaluateDiscoveryRailSlotPolicy passes for practical-heavy rail', () => {
  const items = Array.from({ length: 10 }, (_, i) =>
    makeItem({ type: 'cuisine', label: `Cuisine ${i}` })
  )
  const report = evaluateDiscoveryRailSlotPolicy(items)
  assert.equal(report.passed, true)
})

test('evaluateDiscoveryRailSlotPolicy flags first slot not practical', () => {
  const items: DiscoveryRailAssemblyItem[] = [
    makeItem({ type: 'story', label: 'A story' }),
    ...Array.from({ length: 5 }, (_, i) => makeItem({ type: 'cuisine', label: `C${i}` })),
  ]
  const report = evaluateDiscoveryRailSlotPolicy(items)
  assert.ok(report.violations.length > 0)
})
