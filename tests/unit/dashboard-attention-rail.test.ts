import test from 'node:test'
import assert from 'node:assert/strict'
import type { AttentionChip } from '@/lib/dashboard/section-types'

// Extract the pure sorting/filtering logic from the component for testing.
// This mirrors the visibleChips useMemo logic without React dependencies.

function makeChip(
  overrides: Partial<AttentionChip> & { id: string; urgencyScore: number }
): AttentionChip {
  return {
    icon: 'alert',
    label: `Chip ${overrides.id}`,
    action: { label: 'View', href: '/test' },
    sectionId: 'test-section',
    dismissable: false,
    ...overrides,
  }
}

function filterAndSort(
  chips: AttentionChip[],
  dismissedIds: Set<string>,
  isSnoozedFn: (id: string, urgency: number) => boolean
): AttentionChip[] {
  return chips
    .filter((c) => !dismissedIds.has(c.id))
    .filter((c) => !isSnoozedFn(c.id, c.urgencyScore))
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
}

// --- Test 1: Chips are sorted by urgencyScore descending ---

test('chips are sorted by urgencyScore descending', () => {
  const chips = [
    makeChip({ id: 'low', urgencyScore: 10 }),
    makeChip({ id: 'high', urgencyScore: 90 }),
    makeChip({ id: 'mid', urgencyScore: 50 }),
  ]

  const result = filterAndSort(chips, new Set(), () => false)

  assert.equal(result.length, 3)
  assert.equal(result[0].id, 'high')
  assert.equal(result[1].id, 'mid')
  assert.equal(result[2].id, 'low')
})

// --- Test 2: Empty chips array produces empty result ---

test('empty chips array produces empty result', () => {
  const result = filterAndSort([], new Set(), () => false)
  assert.equal(result.length, 0)
})

// --- Test 3: Dismissed chips are excluded from visible list ---

test('dismissed chips are excluded from visible list', () => {
  const chips = [
    makeChip({ id: 'a', urgencyScore: 80 }),
    makeChip({ id: 'b', urgencyScore: 60 }),
    makeChip({ id: 'c', urgencyScore: 40 }),
  ]

  const dismissed = new Set(['b'])
  const result = filterAndSort(chips, dismissed, () => false)

  assert.equal(result.length, 2)
  assert.ok(result.every((c) => c.id !== 'b'))
})

// --- Test 4: Snoozed chips are excluded from visible list ---

test('snoozed chips are excluded from visible list', () => {
  const chips = [makeChip({ id: 'x', urgencyScore: 70 }), makeChip({ id: 'y', urgencyScore: 50 })]

  const isSnoozedFn = (id: string) => id === 'x'
  const result = filterAndSort(chips, new Set(), isSnoozedFn)

  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'y')
})

// --- Test 5: Dismissable flag is preserved on chips ---

test('dismissable flag is preserved through filter and sort', () => {
  const chips = [
    makeChip({ id: 'dismiss-me', urgencyScore: 80, dismissable: true }),
    makeChip({ id: 'keep-me', urgencyScore: 60, dismissable: false }),
  ]

  const result = filterAndSort(chips, new Set(), () => false)

  assert.equal(result[0].dismissable, true)
  assert.equal(result[1].dismissable, false)
})

// --- Test 6: Age property is preserved on chips ---

test('age property is preserved when present', () => {
  const chips = [
    makeChip({ id: 'with-age', urgencyScore: 50, age: '3d' }),
    makeChip({ id: 'no-age', urgencyScore: 40 }),
  ]

  const result = filterAndSort(chips, new Set(), () => false)

  assert.equal(result[0].age, '3d')
  assert.equal(result[1].age, undefined)
})

// --- Test 7: Both dismissed and snoozed filters apply together ---

test('dismissed and snoozed filters combine correctly', () => {
  const chips = [
    makeChip({ id: 'a', urgencyScore: 90 }),
    makeChip({ id: 'b', urgencyScore: 70 }),
    makeChip({ id: 'c', urgencyScore: 50 }),
    makeChip({ id: 'd', urgencyScore: 30 }),
  ]

  const dismissed = new Set(['a'])
  const isSnoozedFn = (id: string) => id === 'c'
  const result = filterAndSort(chips, dismissed, isSnoozedFn)

  assert.equal(result.length, 2)
  assert.equal(result[0].id, 'b')
  assert.equal(result[1].id, 'd')
})

// --- Test 8: Stable sort order for equal urgency scores ---

test('chips with equal urgency maintain relative order', () => {
  const chips = [
    makeChip({ id: 'first', urgencyScore: 50 }),
    makeChip({ id: 'second', urgencyScore: 50 }),
    makeChip({ id: 'third', urgencyScore: 50 }),
  ]

  const result = filterAndSort(chips, new Set(), () => false)

  assert.equal(result.length, 3)
  // Array.sort is stable in modern JS engines; relative order preserved
  assert.equal(result[0].id, 'first')
  assert.equal(result[1].id, 'second')
  assert.equal(result[2].id, 'third')
})
