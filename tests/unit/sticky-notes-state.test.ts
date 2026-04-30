import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { applyColorUpdates, planColorUpdates } from '../../devtools/sticky-notes/colors.mjs'
import {
  outputPaths,
  readJson,
  stickyConfig,
  writeJson,
} from '../../devtools/sticky-notes/config.mjs'
import { applyStickyNoteLayout, planStickyNoteLayout } from '../../devtools/sticky-notes/layout.mjs'
import { buildStickyNoteState } from '../../devtools/sticky-notes/state.mjs'

function writeStateInputs() {
  fs.mkdirSync(stickyConfig.outputRoot, { recursive: true })
  const snapshotFile = path.join(stickyConfig.outputRoot, 'state-test-snapshot.json')
  const classificationFile = path.join(stickyConfig.outputRoot, 'state-test-classification.json')
  const attachmentFile = path.join(stickyConfig.outputRoot, 'state-test-attachments.json')
  const processedFile = path.join(stickyConfig.outputRoot, 'state-test-processed.json')

  writeJson(snapshotFile, {
    records: [
      {
        noteRef: 'simple-sticky-notes:1:feature',
        sourceRowId: 101,
        noteId: 1,
        title: 'Build queue note',
        sourceColorName: 'white',
        sourceColorValue: 16777215,
        updatedAt: '2026-04-30T17:30:00.000Z',
      },
      {
        noteRef: 'simple-sticky-notes:2:archive',
        sourceRowId: 102,
        noteId: 2,
        title: 'Old duplicate',
        sourceColorName: 'yellow',
        sourceColorValue: 16776960,
        updatedAt: '2026-04-30T17:31:00.000Z',
      },
      {
        noteRef: 'simple-sticky-notes:3:active',
        sourceRowId: 103,
        noteId: 3,
        title: 'PIN: Accepted work',
        text: 'Keep visible while this is active.',
        starred: true,
        sourceColorName: 'yellow',
        sourceColorValue: 16776960,
        updatedAt: '2026-04-30T17:32:00.000Z',
      },
    ],
  })
  writeJson(classificationFile, {
    classifications: [
      {
        noteRef: 'simple-sticky-notes:1:feature',
        noteId: 1,
        class: 'chefFlow.feature',
        confidence: 0.82,
        status: 'classified',
        reasons: ['ChefFlow product request language'],
        nextAction: 'review_for_v1_classification',
      },
      {
        noteRef: 'simple-sticky-notes:2:archive',
        noteId: 2,
        class: 'archive.duplicate',
        confidence: 0.95,
        status: 'classified',
        reasons: ['content hash matches an earlier note'],
        nextAction: 'attach_to_canonical_note',
      },
      {
        noteRef: 'simple-sticky-notes:3:active',
        noteId: 3,
        class: 'chefFlow.directive',
        confidence: 0.9,
        status: 'classified',
        reasons: ['durable project or agent behavior markers'],
        canonicalOwner: 'skill-garden',
        nextAction: 'review_for_skill_patch',
      },
    ],
  })
  writeJson(attachmentFile, {
    attachments: [
      {
        noteRef: 'simple-sticky-notes:1:feature',
        destination: 'system/sticky-notes/actions/spec-candidates/0001.md',
        mayMutateProject: false,
        requiresReview: true,
      },
      {
        noteRef: 'simple-sticky-notes:2:archive',
        destination: 'system/sticky-notes/archive/duplicates/0002.md',
        mayMutateProject: false,
        requiresReview: true,
      },
      {
        noteRef: 'simple-sticky-notes:3:active',
        destination: 'system/sticky-notes/actions/skill-garden-candidates/0003.md',
        mayMutateProject: false,
        requiresReview: true,
      },
    ],
  })
  writeJson(processedFile, {
    actions: [
      {
        noteRef: 'simple-sticky-notes:3:active',
        status: 'activated',
        nextAction: 'no_project_mutation',
      },
    ],
  })

  return { snapshotFile, classificationFile, attachmentFile, processedFile }
}

describe('sticky notes color state index', () => {
  it('answers unprocessed input and moves completed notes into the finished layer', () => {
    const files = writeStateInputs()
    const result = buildStickyNoteState({ ...files, stamp: 'state-test' })

    assert.equal(result.unprocessed.length, 1)
    assert.equal(result.unprocessed[0]?.noteId, 1)
    assert.equal(result.unprocessed[0]?.pipelineState, 'queued')
    assert.equal(result.unprocessed[0]?.targetColorName, 'yellow')
    assert.equal(result.finished.length, 1)
    assert.equal(result.finished[0]?.noteId, 2)
    assert.equal(result.finished[0]?.extracted, true)
    assert.equal(result.finished[0]?.verified, true)
    assert.equal(
      result.active.some((item) => item.noteId === 2),
      false
    )
    assert.equal(result.items.find((item) => item.noteId === 3)?.pipelineState, 'in_progress')
    assert.equal(result.pinned.length, 1)
    assert.equal(result.pinned[0]?.pinOwner, 'skill-garden')

    const latestUnprocessed = readJson(outputPaths.unprocessedLatest)
    const latestPinned = readJson(outputPaths.pinnedLatest)
    const latestFinished = readJson(outputPaths.finishedLatest)
    assert.equal(latestUnprocessed?.count, 1)
    assert.equal(latestPinned?.count, 1)
    assert.equal(latestFinished?.count, 1)
    assert.equal(fs.existsSync(result.unprocessedFile), true)
  })

  it('blocks completion when extraction verification is missing', () => {
    const files = writeStateInputs()
    const result = buildStickyNoteState({
      snapshotFile: files.snapshotFile,
      classificationFile: files.classificationFile,
      attachmentFile: path.join(stickyConfig.outputRoot, 'missing-attachments.json'),
      processedFile: files.processedFile,
      stamp: 'state-unverified-test',
    })
    const duplicate = result.items.find((item) => item.noteId === 2)

    assert.equal(duplicate?.requestedState, 'complete')
    assert.equal(duplicate?.pipelineState, 'blocked')
    assert.equal(duplicate?.blockedReason, 'missing_extraction_verification')
    assert.equal(duplicate?.finished, false)
  })

  it('plans lifecycle color updates without applying them by default', () => {
    const files = writeStateInputs()
    const state = buildStickyNoteState({ ...files, stamp: 'state-color-test' })
    const plan = planColorUpdates({ statePayload: state })
    const result = applyColorUpdates({ plan })

    assert.equal(plan.updateCount, 3)
    assert.equal(plan.updates[0]?.toColorName, 'yellow')
    assert.equal(result.applied, false)
    assert.equal(result.skipped, 3)
  })

  it('plans visual lanes and keeps completed notes minimized', () => {
    const files = writeStateInputs()
    const state = buildStickyNoteState({ ...files, stamp: 'state-layout-test' })
    const plan = planStickyNoteLayout({ statePayload: state })
    const result = applyStickyNoteLayout({ plan })

    const active = plan.positions.find((item) => item.noteId === 3)
    const finished = plan.positions.find((item) => item.noteId === 2)

    assert.equal(plan.updateCount, 3)
    assert.equal(active?.pipelineState, 'in_progress')
    assert.equal(active?.layoutState, 'pinned')
    assert.equal(active?.pinned, true)
    assert.equal(active && active.left < 0, true)
    assert.equal(active?.minimize, 0)
    assert.equal(finished?.pipelineState, 'complete')
    assert.equal(finished?.minimize, 1)
    assert.equal(result.applied, false)
  })
})
