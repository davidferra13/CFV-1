import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
  outputPaths,
  readJson,
  stickyConfig,
  writeJson,
} from '../../devtools/sticky-notes/config.mjs'
import { promoteStickyNotes } from '../../devtools/sticky-notes/promote.mjs'
import { buildReviewCockpit } from '../../devtools/sticky-notes/review.mjs'

function writeFixture() {
  fs.mkdirSync(stickyConfig.outputRoot, { recursive: true })
  const snapshotFile = path.join(stickyConfig.outputRoot, 'review-test-snapshot.json')
  const classificationFile = path.join(stickyConfig.outputRoot, 'review-test-classification.json')

  writeJson(snapshotFile, {
    records: [
      {
        noteRef: 'simple-sticky-notes:100:a',
        noteId: 100,
        rowKey: '100:1:a',
        title: 'Codex rule',
        text: 'Codex should route this through skill-garden.',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
      {
        noteRef: 'simple-sticky-notes:101:b',
        noteId: 101,
        rowKey: '101:1:b',
        title: 'Private',
        text: 'password belongs nowhere near a queue',
        updatedAt: '2026-04-30T12:01:00.000Z',
      },
    ],
  })
  writeJson(classificationFile, {
    classifications: [
      {
        noteRef: 'simple-sticky-notes:100:a',
        noteId: 100,
        rowKey: '100:1:a',
        title: 'Codex rule',
        class: 'chefFlow.directive',
        confidence: 0.9,
        reasons: ['durable project or agent behavior markers'],
        canonicalOwner: 'skill-garden',
        nextAction: 'review_for_skill_patch',
      },
      {
        noteRef: 'simple-sticky-notes:101:b',
        noteId: 101,
        rowKey: '101:1:b',
        title: 'Private',
        class: 'restricted.private',
        confidence: 0.98,
        reasons: ['sensitive credential or identity marker'],
        canonicalOwner: null,
        nextAction: 'preserve_restricted_private',
      },
    ],
  })
  return { snapshotFile, classificationFile }
}

describe('sticky notes review and promotion', () => {
  it('builds a review cockpit that separates promotable and restricted notes', () => {
    const fixture = writeFixture()
    const result = buildReviewCockpit({ ...fixture, stamp: 'review-test' })

    assert.equal(result.total, 2)
    assert.equal(result.statusCounts.promotable, 1)
    assert.equal(result.statusCounts.restricted, 1)
    assert.equal(readJson(outputPaths.reviewLatest)?.statusCounts?.promotable, 1)
  })

  it('promotes only eligible ChefFlow notes into review packets', () => {
    const fixture = writeFixture()
    const review = buildReviewCockpit({ ...fixture, stamp: 'promote-review-test' })
    const result = promoteStickyNotes({ ...fixture, review, stamp: 'promote-test' })

    assert.equal(result.promoted.length, 1)
    assert.equal(result.promoted[0]?.route, 'skill-garden')
    assert.equal(result.promoted[0]?.mayMutateProject, false)
    assert.match(
      result.promoted[0]?.packet || '',
      /^system\/sticky-notes\/promotions\/skill-garden-candidates\//
    )
    assert.equal(
      fs.existsSync(path.join(process.cwd(), result.promoted[0]?.packet || 'missing')),
      true
    )
  })
})
