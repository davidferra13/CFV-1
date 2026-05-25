import test from 'node:test'
import assert from 'node:assert/strict'
import { SECTION_ORDER, SECTION_IDS, getSectionEntry } from '@/lib/dashboard/section-types'
import type { SectionMode, AttentionChip, SectionWeight } from '@/lib/dashboard/section-types'

test('SECTION_ORDER has 19 entries', () => {
  assert.equal(SECTION_ORDER.length, 19)
})

test('SECTION_ORDER positions are unique and sequential starting at 1', () => {
  const positions = SECTION_ORDER.map((s) => s.position)
  const expected = Array.from({ length: 19 }, (_, i) => i + 1)
  assert.deepEqual(positions, expected)
})

test('SECTION_IDS contains all expected section ids', () => {
  assert.ok(SECTION_IDS.includes('command-center'))
  assert.ok(SECTION_IDS.includes('daily-plan'))
  assert.ok(SECTION_IDS.includes('this-week'))
  assert.ok(SECTION_IDS.includes('feature-suggestions'))
})

test('SECTION_IDS length matches SECTION_ORDER length', () => {
  assert.equal(SECTION_IDS.length, SECTION_ORDER.length)
})

test('getSectionEntry returns entry for valid id', () => {
  const entry = getSectionEntry('command-center')
  assert.ok(entry)
  assert.equal(entry!.id, 'command-center')
  assert.equal(entry!.position, 1)
  assert.equal(entry!.layer, 'urgent')
})

test('getSectionEntry returns undefined for unknown id', () => {
  assert.equal(getSectionEntry('nonexistent'), undefined)
})

test('SectionWeight shape compiles and is valid', () => {
  const weight: SectionWeight = {
    sectionId: 'command-center',
    mode: 'expanded',
    chips: [],
    whisperText: null,
    compactSummary: null,
  }
  assert.equal(weight.sectionId, 'command-center')
  assert.equal(weight.mode, 'expanded')
})

test('AttentionChip shape compiles and is valid', () => {
  const chip: AttentionChip = {
    id: 'msg-1',
    icon: 'mail',
    label: '3 unanswered messages',
    age: '2d',
    urgencyScore: 92,
    action: { label: 'View Messages', href: '/messages' },
    sectionId: 'command-center',
    dismissable: true,
  }
  assert.ok(chip.urgencyScore >= 0)
  assert.ok(chip.urgencyScore <= 100)
})

test('all section ids are unique', () => {
  const unique = new Set(SECTION_IDS)
  assert.equal(unique.size, SECTION_IDS.length)
})

test('every layer value is one of the expected layers', () => {
  const validLayers = ['urgent', 'tactical', 'safety', 'strategic', 'intelligence', 'activity', 'utility']
  for (const entry of SECTION_ORDER) {
    assert.ok(validLayers.includes(entry.layer), `Invalid layer "${entry.layer}" for section "${entry.id}"`)
  }
})
