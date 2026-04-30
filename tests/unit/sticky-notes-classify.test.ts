import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyNote, classifyRecords } from '../../devtools/sticky-notes/classify.mjs'

function note(overrides: Record<string, unknown>) {
  return {
    noteRef: 'simple-sticky-notes:1:abc',
    noteId: 1,
    rowKey: '1:1:abc',
    title: 'Untitled',
    text: '',
    textLength: 0,
    hasRichData: false,
    deletedAt: null,
    deletedRaw: 0,
    contentHash: 'abc',
    ...overrides,
  }
}

describe('sticky notes classifier', () => {
  it('routes durable Codex behavior to skill-garden candidates', () => {
    const result = classifyNote(
      note({
        text: 'Codex should always use Sticky Notes as external guidance for ChefFlow.',
        textLength: 72,
      })
    )

    assert.equal(result.class, 'chefFlow.directive')
    assert.equal(result.canonicalOwner, 'skill-garden')
    assert.equal(result.mayMutateProject, undefined)
  })

  it('routes private secrets away from ChefFlow queues', () => {
    const result = classifyNote(
      note({
        text: 'Bank account routing number and password go here.',
        textLength: 48,
      })
    )

    assert.equal(result.class, 'restricted.private')
    assert.equal(result.sensitivity, 'restricted')
  })

  it('routes recipe IP to read-only restricted preservation', () => {
    const result = classifyNote(
      note({
        text: 'Recipe: pasta. Ingredients: flour, eggs. Directions: simmer sauce. Yield 4.',
        textLength: 75,
      })
    )

    assert.equal(result.class, 'restricted.recipeIp')
    assert.equal(result.nextAction, 'preserve_recipe_ip_read_only')
  })

  it('routes rich-text-only notes to review instead of discarding them', () => {
    const result = classifyNote(
      note({
        hasRichData: true,
        text: '',
        textLength: 0,
      })
    )

    assert.equal(result.class, 'needsReview')
    assert.equal(result.nextAction, 'manual_review')
  })

  it('marks exact duplicate content as an archive duplicate', () => {
    const records = [
      note({
        noteRef: 'simple-sticky-notes:1:a',
        text: 'ChefFlow context for client event pricing.',
        textLength: 41,
        contentHash: 'same',
      }),
      note({
        noteRef: 'simple-sticky-notes:2:a',
        noteId: 2,
        rowKey: '2:1:a',
        text: 'ChefFlow context for client event pricing.',
        textLength: 41,
        contentHash: 'same',
      }),
    ]

    const classifications = classifyRecords(records)
    assert.equal(classifications[1]?.class, 'archive.duplicate')
    assert.equal(classifications[1]?.duplicateOf, 'simple-sticky-notes:1:a')
  })
})
