import assert from 'node:assert/strict'
import test from 'node:test'
import { assessClientDataFreshness } from '../../lib/clients/client-data-freshness'
import {
  inspectClientKnowledge,
  type ClientKnowledgeFactValues,
} from '../../lib/clients/client-knowledge-inspector'

const NOW = new Date('2026-04-29T12:00:00.000Z')

function rowFor(
  projection: ReturnType<typeof inspectClientKnowledge>,
  key: keyof ClientKnowledgeFactValues
) {
  const row = projection.rows.find((candidate) => candidate.key === key)
  assert.ok(row, `Expected inspector row for ${String(key)}`)
  return row
}

test('keeps private chef notes out of client and Remy client visibility', () => {
  const projection = inspectClientKnowledge({
    values: {
      private_chef_notes: 'Do not share surprise party details.',
    },
  })
  const privateNotes = rowFor(projection, 'private_chef_notes')

  assert.equal(privateNotes.valueState, 'present')
  assert.equal(privateNotes.canClientSee, false)
  assert.equal(privateNotes.canRemyClientSee, false)
  assert.equal(privateNotes.visibleAudiences.includes('client'), false)
  assert.equal(privateNotes.visibleAudiences.includes('remy_client'), false)
})

test('flags allergies for review when safety data has not been confirmed', () => {
  const freshnessReport = assessClientDataFreshness(
    {
      allergies: {
        value: ['peanut'],
        updatedAt: '2026-04-28T12:00:00.000Z',
      },
    },
    { now: NOW }
  )

  const projection = inspectClientKnowledge({
    values: {
      allergies: ['peanut'],
    },
    freshnessReport,
  })
  const allergies = rowFor(projection, 'allergies')

  assert.equal(allergies.isSafetyCritical, true)
  assert.equal(allergies.valueState, 'present')
  assert.equal(allergies.freshnessStatus, 'unconfirmed')
  assert.equal(allergies.needsReview, true)
  assert.equal(projection.summary.safetyCriticalNeedsReview, 4)
})

test('counts missing facts from blank, empty, null, undefined, and absent values', () => {
  const projection = inspectClientKnowledge({
    values: {
      full_name: 'Ada Client',
      email: 'ada@example.com',
      phone: '   ',
      allergies: [],
      dietary_restrictions: null,
      private_chef_notes: undefined,
    },
  })

  assert.equal(projection.summary.totalFacts, 21)
  assert.equal(projection.summary.missingFacts, 19)
  assert.equal(rowFor(projection, 'full_name').valueState, 'present')
  assert.equal(rowFor(projection, 'email').valueState, 'present')
  assert.equal(rowFor(projection, 'phone').valueState, 'missing')
  assert.equal(rowFor(projection, 'allergies').valueState, 'missing')
})

test('counts only client-side Remy visible facts and excludes private chef notes', () => {
  const projection = inspectClientKnowledge({
    values: {
      full_name: 'Ada Client',
      private_chef_notes: 'Chef-only relationship context.',
    },
  })

  assert.equal(projection.summary.clientVisibleFacts, 20)
  assert.equal(projection.summary.remyClientVisibleFacts, 20)
  assert.equal(rowFor(projection, 'event_history').canRemyClientSee, true)
  assert.equal(rowFor(projection, 'private_chef_notes').canRemyClientSee, false)
})

test('integrates freshness status into inspector rows', () => {
  const freshnessReport = assessClientDataFreshness(
    {
      email: {
        value: 'ada@example.com',
        updatedAt: '2026-04-28T12:00:00.000Z',
      },
      allergies: {
        value: ['shellfish'],
        updatedAt: '2026-04-28T12:00:00.000Z',
        confirmedAt: '2026-04-28T12:00:00.000Z',
      },
      address: {
        value: '1 Market St',
        updatedAt: '2025-01-01T12:00:00.000Z',
      },
    },
    { now: NOW }
  )

  const projection = inspectClientKnowledge({
    values: {
      email: 'ada@example.com',
      allergies: ['shellfish'],
      address: '1 Market St',
    },
    freshnessReport,
  })

  assert.equal(rowFor(projection, 'email').freshnessStatus, 'current')
  assert.equal(rowFor(projection, 'email').needsReview, false)
  assert.equal(rowFor(projection, 'allergies').freshnessStatus, 'current')
  assert.equal(rowFor(projection, 'allergies').needsReview, false)
  assert.equal(rowFor(projection, 'address').freshnessStatus, 'stale')
  assert.equal(rowFor(projection, 'address').needsReview, true)
})
