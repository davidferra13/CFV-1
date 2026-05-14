import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyRemyFilterOperations,
  translateCasualDiningIntent,
} from '@/lib/remy/intent-discovery-parser'

const now = new Date('2026-05-13T01:30:08.000Z')

test('Remy translates casual dining intent into editable rail filters', () => {
  const translation = translateCasualDiningIntent('show me Sichuan for 8 Friday within 20 miles', {
    surface: 'eat',
    sessionId: 'session-1',
    now,
  })

  assert.equal(translation.filterState.cuisines[0], 'sichuan')
  assert.equal(translation.filterState.partySize, 8)
  assert.equal(translation.filterState.dateWindow, 'friday')
  assert.equal(translation.filterState.radiusMiles, 20)
  assert.equal(translation.clarification.needed, false)
  assert.ok(translation.confidence >= 0.7)
  assert.equal(translation.proposal?.type, 'change_radius')
  assert.equal(translation.proposal?.durability, 'temporary')
  assert.equal(translation.proposal?.confirmation.required, false)
})

test('Remy asks one concise clarification when casual intent is too vague', () => {
  const translation = translateCasualDiningIntent('something good', { now })

  assert.equal(translation.operations.length, 0)
  assert.equal(translation.proposal, null)
  assert.equal(translation.clarification.needed, true)
  assert.match(translation.clarification.question ?? '', /cuisine|craving|occasion/i)
})

test('Remy follow-up refinements adjust existing state without starting over', () => {
  const translation = translateCasualDiningIntent('less spicy and not too fancy', {
    currentFilters: {
      cravings: ['spicy', 'noodles'],
      cuisines: ['thai'],
      partySize: 4,
    },
    now,
  })

  assert.deepEqual(translation.filterState.cravings, ['noodles'])
  assert.deepEqual(translation.filterState.moods, ['mild'])
  assert.equal(translation.filterState.budget, 'budget_friendly')
  assert.equal(translation.filterState.cuisines[0], 'thai')
  assert.equal(
    translation.proposal?.payload.filterOperations?.some((op) => op.op === 'remove'),
    true
  )
})

test('Remy filter operations are pure and reusable by the rail/session executor', () => {
  const next = applyRemyFilterOperations({ cuisines: ['thai'], dietary: ['vegetarian'] }, [
    { field: 'cuisines', op: 'add', value: 'Sichuan' },
    { field: 'dietary', op: 'remove', value: 'vegetarian' },
    { field: 'partySize', op: 'set', value: 6 },
  ])

  assert.deepEqual(next.cuisines, ['thai', 'sichuan'])
  assert.deepEqual(next.dietary, [])
  assert.equal(next.partySize, 6)
})
