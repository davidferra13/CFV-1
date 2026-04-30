#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  destinationByClass,
  ensureDir,
  ensureOutputRoot,
  nowStamp,
  outputPaths,
  readJson,
  relativePath,
  slugify,
  stickyConfig,
  writeJson,
} from './config.mjs'
import { shortHash } from './hash.mjs'

function markdownFor(note, classification) {
  return `---
source: simple-sticky-notes
noteRef: ${note.noteRef}
noteId: ${note.noteId}
rowKey: ${note.rowKey}
classification: ${classification.class}
confidence: ${classification.confidence}
status: deferred
requiresReview: true
mayMutateProject: false
canonicalOwner: ${classification.canonicalOwner || ''}
nextAction: ${classification.nextAction}
updatedAt: ${note.updatedAt || ''}
---

# ${note.title || `Sticky Note ${note.noteId}`}

- Notebook: ${note.notebook || 'unknown'}
- Source updated: ${note.updatedAt || 'unknown'}
- Reasons: ${classification.reasons.join('; ')}

## Review Guidance

This is a local Sticky Notes intake candidate. Do not mutate project files from this note until it has been reviewed through the appropriate skill or spec gate.

## Original Text

${note.text || '_No plain text captured. Review rich-text data in Simple Sticky Notes._'}
`
}

export function attachClassifications(options = {}) {
  ensureOutputRoot()
  const snapshot = readJson(options.snapshotFile || outputPaths.normalizedLatest, null)
  const classified = readJson(options.classificationFile || outputPaths.classificationsLatest, null)
  if (!snapshot?.records) throw new Error(`No normalized Sticky Notes snapshot found: ${outputPaths.normalizedLatest}`)
  if (!classified?.classifications) {
    throw new Error(`No Sticky Notes classifications found: ${outputPaths.classificationsLatest}`)
  }

  const notesByRef = new Map(snapshot.records.map((note) => [note.noteRef, note]))
  const attachments = []

  for (const classification of classified.classifications) {
    const note = notesByRef.get(classification.noteRef)
    if (!note) continue
    const relativeDir = destinationByClass[classification.class] || destinationByClass.needsReview
    const outDir = path.join(stickyConfig.outputRoot, relativeDir)
    ensureDir(outDir)
    const fileName = `${String(note.noteId).padStart(4, '0')}-${slugify(note.title)}-${shortHash(note.rowKey)}.md`
    const destination = path.join(outDir, fileName)
    fs.writeFileSync(destination, markdownFor(note, classification))
    attachments.push({
      noteRef: note.noteRef,
      noteId: note.noteId,
      classification: classification.class,
      destination: relativePath(destination),
      status: classification.class.startsWith('archive.')
        ? 'archived'
        : classification.class.startsWith('personal.')
          ? 'personal'
          : classification.class.startsWith('restricted.')
            ? 'restricted'
            : 'deferred',
      requiresReview: true,
      mayMutateProject: false,
    })
  }

  const stamp = options.stamp || nowStamp()
  const payload = {
    generatedAt: new Date().toISOString(),
    attachments,
  }
  const outFile = path.join(outputPaths.attachments, `${stamp}-attached.json`)
  writeJson(outFile, payload)
  writeJson(outputPaths.attachmentsLatest, payload)
  return { ...payload, outFile }
}

function main() {
  const result = attachClassifications()
  console.log(`Attached notes: ${result.attachments.length}`)
  console.log(`Attachment index: ${relativePath(result.outFile)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
