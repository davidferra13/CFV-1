import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { outputPaths, stickyConfig, writeJson } from '../../devtools/sticky-notes/config.mjs'
import { processPromotedStickyNotes } from '../../devtools/sticky-notes/process.mjs'

function writePacket(relativeFile: string, title: string, text: string) {
  const file = path.join(process.cwd(), relativeFile)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `---
source: simple-sticky-notes
---

# ${title}

## Original Text

${text}
`
  )
  return relativeFile.replace(/\\/g, '/')
}

function writeManifest() {
  fs.mkdirSync(stickyConfig.outputRoot, { recursive: true })
  const base = 'system/sticky-notes/process-test'
  const plannerPacket = writePacket(
    `${base}/planner.md`,
    'Planner',
    'PLANNER START You are a planner agent. Follow the Planner Gate.'
  )
  const plannerDuplicate = writePacket(
    `${base}/planner-copy.md`,
    'Planner Copy',
    'PLANNER START You are a planner agent. Follow the Planner Gate.'
  )
  const securityPacket = writePacket(
    `${base}/security.md`,
    'Visibility',
    'Audit unauthorized visibility, access control, privilege escalation, and cross-tenant data leakage.'
  )
  const legalPacket = writePacket(
    `${base}/legal.md`,
    'Legal',
    'Can ChefFlow be sued by TAC? Is any of this illegal?'
  )
  const featurePacket = writePacket(
    `${base}/feature.md`,
    'Nearby',
    'Improve Nearby search relevance and metadata indexability for high quality listings.'
  )

  const manifestFile = path.join(stickyConfig.outputRoot, 'process-test-promotions.json')
  writeJson(manifestFile, {
    generatedAt: '2026-04-30T17:00:00.000Z',
    promoted: [
      {
        reviewId: 'sticky-0001',
        noteRef: 'ref-1',
        noteId: 1,
        class: 'chefFlow.directive',
        route: 'skill-garden',
        action: 'review_for_skill_patch',
        packet: plannerPacket,
      },
      {
        reviewId: 'sticky-0002',
        noteRef: 'ref-2',
        noteId: 2,
        class: 'chefFlow.directive',
        route: 'skill-garden',
        action: 'review_for_skill_patch',
        packet: plannerDuplicate,
      },
      {
        reviewId: 'sticky-0003',
        noteRef: 'ref-3',
        noteId: 3,
        class: 'chefFlow.bug',
        route: 'findings-triage',
        action: 'review_for_bug_triage',
        packet: securityPacket,
      },
      {
        reviewId: 'sticky-0004',
        noteRef: 'ref-4',
        noteId: 4,
        class: 'chefFlow.context',
        route: 'context-continuity',
        action: 'review_for_memory_packet',
        packet: legalPacket,
      },
      {
        reviewId: 'sticky-0005',
        noteRef: 'ref-5',
        noteId: 5,
        class: 'chefFlow.feature',
        route: 'v1-governor',
        action: 'review_for_v1_classification',
        packet: featurePacket,
      },
    ],
  })
  return manifestFile
}

describe('sticky notes promoted packet processing', () => {
  it('writes a safe action manifest with routing statuses and duplicate detection', () => {
    const manifestFile = writeManifest()
    const result = processPromotedStickyNotes({ manifestFile, stamp: 'process-test' })

    assert.equal(result.total, 5)
    assert.equal(result.statusCounts.activated, 1)
    assert.equal(result.statusCounts.duplicate, 1)
    assert.equal(result.statusCounts.security_review, 1)
    assert.equal(result.statusCounts.developer_escalation, 1)
    assert.equal(result.statusCounts.queued, 1)
    assert.equal(result.actions.every((action) => action.mayMutateProject === false), true)
    assert.equal(fs.existsSync(result.jsonFile), true)
    assert.equal(fs.existsSync(result.mdFile), true)

    const report = fs.readFileSync(result.mdFile, 'utf8')
    assert.match(report, /This report is safe routing output/)
    assert.doesNotMatch(report, /Follow the Planner Gate/)
    assert.equal(fs.existsSync(outputPaths.processedLatest), true)
  })
})
