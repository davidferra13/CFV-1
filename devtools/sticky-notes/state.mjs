#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureOutputRoot,
  nowStamp,
  outputPaths,
  readJson,
  relativePath,
  stickyColorForState,
  stickyColorTaxonomy,
  writeJson,
} from './config.mjs'

const STATE_ORDER = ['unprocessed', 'queued', 'in_progress', 'blocked', 'complete']

const PROCESSED_STATUS_TO_STATE = {
  activated: 'in_progress',
  queued: 'queued',
  needs_planner: 'queued',
  security_review: 'blocked',
  developer_escalation: 'blocked',
  duplicate: 'complete',
  rejected: 'complete',
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function stateFromClass(classification) {
  if (!classification) return 'unprocessed'
  if (classification.class === 'needsReview') return 'blocked'
  if (classification.class.startsWith('archive.')) return 'complete'
  if (classification.class.startsWith('personal.')) return 'complete'
  if (classification.class.startsWith('restricted.')) return 'complete'
  if (classification.class.startsWith('chefFlow.')) return 'queued'
  return 'blocked'
}

function processedStateFor(action) {
  if (!action) return null
  return PROCESSED_STATUS_TO_STATE[action.status] || null
}

function latestProcessedByNoteRef(processed) {
  const byRef = new Map()
  for (const action of processed?.actions || []) {
    if (action.noteRef) byRef.set(action.noteRef, action)
  }
  return byRef
}

function latestAttachmentsByNoteRef(attached) {
  const byRef = new Map()
  for (const attachment of attached?.attachments || []) {
    if (attachment.noteRef) byRef.set(attachment.noteRef, attachment)
  }
  return byRef
}

function compactNote(note) {
  return {
    noteRef: note.noteRef,
    sourceRowId: note.sourceRowId || null,
    noteId: note.noteId,
    title: note.title || '',
    sourceColorName: note.sourceColorName || 'unknown',
    sourceColorValue: note.sourceColorValue ?? null,
    updatedAt: note.updatedAt || null,
  }
}

function extractionVerificationFor(classification, attachment, processedAction) {
  const attachmentExtracted = Boolean(attachment?.destination)
  const processedExtracted = Boolean(processedAction?.packet || processedAction?.actionId)
  const classificationVerified =
    classification?.status === 'classified' &&
    Number(classification.confidence ?? 0) >= 0.65 &&
    Array.isArray(classification.reasons) &&
    classification.reasons.length > 0
  const attachmentVerified =
    attachmentExtracted && attachment?.mayMutateProject === false && attachment?.requiresReview === true
  const processedVerified =
    processedExtracted && processedAction?.mayMutateProject === false && processedAction?.requiresReview === true

  return {
    extracted: attachmentExtracted || processedExtracted,
    verified: Boolean((classificationVerified && attachmentVerified) || processedVerified),
    attachment: attachment?.destination || null,
    processedActionId: processedAction?.actionId || null,
  }
}

function itemFor(note, classification, attachment, processedAction) {
  const baseState = stateFromClass(classification)
  const requestedState = processedStateFor(processedAction) || baseState
  const extraction = extractionVerificationFor(classification, attachment, processedAction)
  const pipelineState = requestedState === 'complete' && !extraction.verified ? 'blocked' : requestedState
  const expected = stickyColorForState(pipelineState)
  const sourceColorValue = Number(note.sourceColorValue ?? stickyColorTaxonomy.unprocessed.value)
  const sourceIsWhite = sourceColorValue === stickyColorTaxonomy.unprocessed.value
  const unprocessed = sourceIsWhite || !classification

  return {
    ...compactNote(note),
    class: classification?.class || null,
    confidence: classification?.confidence ?? null,
    pipelineState,
    requestedState,
    extracted: extraction.extracted,
    verified: extraction.verified,
    extractionAttachment: extraction.attachment,
    processedActionId: extraction.processedActionId,
    sourceState: sourceIsWhite ? 'unprocessed' : 'colored',
    targetColorName: expected.color,
    targetColorValue: expected.value,
    colorMismatch: sourceColorValue !== expected.value,
    unprocessed,
    active: pipelineState !== 'complete',
    finished: pipelineState === 'complete',
    blockedReason:
      requestedState === 'complete' && !extraction.verified
        ? 'missing_extraction_verification'
        : pipelineState === 'blocked'
          ? classification?.nextAction || processedAction?.nextAction || null
          : null,
    nextAction: processedAction?.nextAction || classification?.nextAction || 'classify_note',
  }
}

function renderUnprocessedMarkdown(payload) {
  const lines = [
    '# Sticky Notes Unprocessed Input',
    '',
    `- Generated: ${payload.generatedAt}`,
    `- Unprocessed: ${payload.unprocessed.length}`,
    '',
  ]

  if (!payload.unprocessed.length) {
    lines.push('_None._', '')
    return lines.join('\n')
  }

  for (const item of payload.unprocessed) {
    lines.push(`- Note ${item.noteId}: ${item.title || 'Untitled'}`)
    lines.push(`  - Source color: ${item.sourceColorName} (${item.sourceColorValue})`)
    lines.push(`  - Target state: ${item.pipelineState}`)
    lines.push(`  - Target color: ${item.targetColorName} (${item.targetColorValue})`)
    lines.push(`  - Next: ${item.nextAction}`)
  }
  lines.push('')
  return lines.join('\n')
}

export function buildStickyNoteState(options = {}) {
  ensureOutputRoot()
  const snapshot = readJson(options.snapshotFile || outputPaths.normalizedLatest, null)
  const classified = readJson(options.classificationFile || outputPaths.classificationsLatest, null)
  const attached = readJson(options.attachmentFile || outputPaths.attachmentsLatest, { attachments: [] })
  const processed = readJson(options.processedFile || outputPaths.processedLatest, { actions: [] })
  if (!snapshot?.records) throw new Error(`No normalized Sticky Notes snapshot found: ${outputPaths.normalizedLatest}`)

  const classificationsByRef = new Map((classified?.classifications || []).map((item) => [item.noteRef, item]))
  const attachmentsByRef = latestAttachmentsByNoteRef(attached)
  const processedByRef = latestProcessedByNoteRef(processed)
  const items = snapshot.records.map((note) =>
    itemFor(
      note,
      classificationsByRef.get(note.noteRef),
      attachmentsByRef.get(note.noteRef),
      processedByRef.get(note.noteRef),
    ),
  )

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceSnapshot: relativePath(options.snapshotFile || outputPaths.normalizedLatest),
    sourceClassifications: classified?.classifications
      ? relativePath(options.classificationFile || outputPaths.classificationsLatest)
      : null,
    sourceAttachments: attached?.attachments ? relativePath(options.attachmentFile || outputPaths.attachmentsLatest) : null,
    taxonomy: stickyColorTaxonomy,
    counts: countBy(items, 'pipelineState'),
    colorMismatches: items.filter((item) => item.colorMismatch).length,
    unprocessed: items.filter((item) => item.unprocessed),
    active: items.filter((item) => item.active),
    finished: items.filter((item) => item.finished),
    items,
  }

  for (const state of STATE_ORDER) {
    payload.counts[state] ||= 0
  }

  const stamp = options.stamp || nowStamp()
  const stateFile = path.join(outputPaths.state, `${stamp}-state.json`)
  const unprocessedFile = path.join(outputPaths.unprocessed, `${stamp}-unprocessed.md`)
  const activeFile = path.join(outputPaths.active, `${stamp}-active.json`)
  const finishedFile = path.join(outputPaths.finished, `${stamp}-finished.json`)

  writeJson(stateFile, payload)
  writeJson(outputPaths.stateLatest, { ...payload, stateFile: relativePath(stateFile) })
  fs.writeFileSync(unprocessedFile, renderUnprocessedMarkdown(payload))
  writeJson(outputPaths.unprocessedLatest, {
    generatedAt: payload.generatedAt,
    count: payload.unprocessed.length,
    items: payload.unprocessed,
    mdFile: relativePath(unprocessedFile),
  })
  writeJson(activeFile, {
    generatedAt: payload.generatedAt,
    count: payload.active.length,
    items: payload.active,
  })
  writeJson(outputPaths.activeLatest, {
    generatedAt: payload.generatedAt,
    count: payload.active.length,
    items: payload.active,
    jsonFile: relativePath(activeFile),
  })
  writeJson(finishedFile, {
    generatedAt: payload.generatedAt,
    count: payload.finished.length,
    items: payload.finished,
  })
  writeJson(outputPaths.finishedLatest, {
    generatedAt: payload.generatedAt,
    count: payload.finished.length,
    items: payload.finished,
    jsonFile: relativePath(finishedFile),
  })

  return { ...payload, stateFile, unprocessedFile, activeFile, finishedFile }
}

function main() {
  const result = buildStickyNoteState()
  console.log(`Unprocessed: ${result.unprocessed.length}`)
  console.log(`Queued: ${result.counts.queued || 0}`)
  console.log(`In progress: ${result.counts.in_progress || 0}`)
  console.log(`Blocked: ${result.counts.blocked || 0}`)
  console.log(`Complete: ${result.counts.complete || 0}`)
  console.log(`Color mismatches: ${result.colorMismatches}`)
  console.log(`State index: ${relativePath(result.stateFile)}`)
  console.log(`Unprocessed report: ${relativePath(result.unprocessedFile)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
