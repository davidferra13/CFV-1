import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergeChips, filterActiveChips } from '@/lib/dashboard/chip-providers'
import type { AttentionChip } from '@/lib/dashboard/section-types'

const chips: AttentionChip[] = [
  {
    id: 'a',
    icon: 'mail',
    label: 'Test A',
    urgencyScore: 90,
    action: { label: 'Go', href: '/a' },
    sectionId: 'command-center',
    dismissable: true,
  },
  {
    id: 'b',
    icon: 'calendar',
    label: 'Test B',
    urgencyScore: 45,
    action: { label: 'Go', href: '/b' },
    sectionId: 'schedule',
    dismissable: false,
  },
  {
    id: 'c',
    icon: 'alert',
    label: 'Test C',
    urgencyScore: 72,
    action: { label: 'Go', href: '/c' },
    sectionId: 'tiered-rail',
    dismissable: true,
  },
]

describe('mergeChips', () => {
  it('concatenates and deduplicates by id', () => {
    const batch1 = [chips[0], chips[1]]
    const batch2 = [chips[1], chips[2]]
    const merged = mergeChips(batch1, batch2)
    assert.equal(merged.length, 3)
    assert.deepEqual(
      merged.map((c) => c.id),
      ['a', 'b', 'c']
    )
  })

  it('returns empty array with empty batches', () => {
    const merged = mergeChips([], [], [])
    assert.equal(merged.length, 0)
    assert.deepEqual(merged, [])
  })
})

describe('filterActiveChips', () => {
  it('removes chips below score 50', () => {
    const active = filterActiveChips(chips)
    assert.equal(active.length, 2)
    assert.deepEqual(
      active.map((c) => c.id),
      ['a', 'c']
    )
  })

  it('keeps chips with score exactly 50', () => {
    const borderline: AttentionChip = {
      id: 'd',
      icon: 'check',
      label: 'Test D',
      urgencyScore: 50,
      action: { label: 'Go', href: '/d' },
      sectionId: 'schedule',
      dismissable: false,
    }
    const active = filterActiveChips([...chips, borderline])
    assert.equal(active.length, 3)
    assert.ok(active.some((c) => c.id === 'd'))
  })
})
