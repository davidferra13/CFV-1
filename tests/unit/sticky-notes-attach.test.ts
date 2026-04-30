import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { attachClassifications } from '../../devtools/sticky-notes/attach.mjs'
import {
  outputPaths,
  readJson,
  stickyConfig,
  writeJson,
} from '../../devtools/sticky-notes/config.mjs'

describe('sticky notes attachment writer', () => {
  it('writes review candidates only under system/sticky-notes and marks them non-mutating', () => {
    fs.mkdirSync(stickyConfig.outputRoot, { recursive: true })
    const snapshotFile = path.join(stickyConfig.outputRoot, 'test-snapshot.json')
    const classificationFile = path.join(stickyConfig.outputRoot, 'test-classification.json')

    writeJson(snapshotFile, {
      records: [
        {
          noteRef: 'simple-sticky-notes:999:test',
          noteId: 999,
          rowKey: '999:1:test',
          notebook: 'Test',
          title: 'Codex rule',
          text: 'Codex should review this before changing any skill.',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
    })
    writeJson(classificationFile, {
      classifications: [
        {
          noteRef: 'simple-sticky-notes:999:test',
          noteId: 999,
          rowKey: '999:1:test',
          title: 'Codex rule',
          class: 'chefFlow.directive',
          confidence: 0.9,
          reasons: ['durable project or agent behavior markers'],
          canonicalOwner: 'skill-garden',
          nextAction: 'review_for_skill_patch',
        },
      ],
    })

    const result = attachClassifications({ snapshotFile, classificationFile, stamp: 'test' })
    const attachment = result.attachments[0]

    assert.ok(attachment)
    assert.equal(attachment.mayMutateProject, false)
    assert.equal(attachment.requiresReview, true)
    assert.match(
      attachment.destination,
      /^system\/sticky-notes\/actions\/skill-garden-candidates\//
    )
    assert.equal(fs.existsSync(path.join(process.cwd(), attachment.destination)), true)
    assert.equal(readJson(outputPaths.attachmentsLatest)?.attachments?.[0]?.mayMutateProject, false)
  })
})
