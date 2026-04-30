#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureDir,
  ensureOutputRoot,
  nowStamp,
  outputPaths,
  promotionDestinationByClass,
  readJson,
  relativePath,
  slugify,
  writeJson,
} from './config.mjs'
import { shortHash } from './hash.mjs'
import { buildReviewCockpit } from './review.mjs'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { limit: null, class: null, dryRun: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') args.dryRun = true
    if (arg === '--limit') args.limit = Number(argv[++index])
    if (arg === '--class') args.class = argv[++index]
  }
  return args
}

function promotionMarkdown(note, classification, destination) {
  return `---
source: simple-sticky-notes
noteRef: ${note.noteRef}
noteId: ${note.noteId}
classification: ${classification.class}
route: ${destination.route}
status: promoted_for_review
mayMutateProject: false
requiresReview: true
---

# ${note.title || `Sticky Note ${note.noteId}`}

- Route: ${destination.route}
- Required action: ${destination.action}
- Confidence: ${classification.confidence}
- Source updated: ${note.updatedAt || 'unknown'}
- Reasons: ${(classification.reasons || []).join('; ')}

## Promotion Boundary

This packet was promoted on the developer's behalf as a review artifact. It must pass the destination skill, spec, or governor gate before changing project files or queues.

## Original Text

${note.text || '_No plain text captured. Review source note manually._'}
`
}

export function promoteStickyNotes(options = {}) {
  ensureOutputRoot()
  const review = options.review || buildReviewCockpit(options)
  const snapshot = readJson(options.snapshotFile || outputPaths.normalizedLatest, null)
  const classified = readJson(options.classificationFile || outputPaths.classificationsLatest, null)
  if (!snapshot?.records) throw new Error(`No normalized Sticky Notes snapshot found: ${outputPaths.normalizedLatest}`)
  if (!classified?.classifications) {
    throw new Error(`No Sticky Notes classifications found: ${outputPaths.classificationsLatest}`)
  }

  const notesByRef = new Map(snapshot.records.map((note) => [note.noteRef, note]))
  const classificationsByRef = new Map(classified.classifications.map((item) => [item.noteRef, item]))
  let candidates = review.items.filter((item) => item.reviewStatus === 'promotable')
  if (options.class) candidates = candidates.filter((item) => item.class === options.class)
  if (Number.isFinite(options.limit) && options.limit >= 0) candidates = candidates.slice(0, options.limit)

  const promoted = []
  for (const item of candidates) {
    const note = notesByRef.get(item.noteRef)
    const classification = classificationsByRef.get(item.noteRef)
    const destination = promotionDestinationByClass[item.class]
    if (!note || !classification || !destination) continue
    const outDir = path.join(outputPaths.promotions, destination.directory)
    ensureDir(outDir)
    const outFile = path.join(
      outDir,
      `${String(note.noteId).padStart(4, '0')}-${slugify(note.title)}-${shortHash(note.rowKey)}.md`,
    )
    if (!options.dryRun) fs.writeFileSync(outFile, promotionMarkdown(note, classification, destination))
    promoted.push({
      reviewId: item.reviewId,
      noteRef: item.noteRef,
      noteId: item.noteId,
      class: item.class,
      route: destination.route,
      action: destination.action,
      packet: relativePath(outFile),
      status: options.dryRun ? 'would_promote' : 'promoted_for_review',
      mayMutateProject: false,
      requiresReview: true,
    })
  }

  const stamp = options.stamp || nowStamp()
  const payload = {
    generatedAt: new Date().toISOString(),
    dryRun: Boolean(options.dryRun),
    promoted,
    skipped: review.total - promoted.length,
  }
  const outFile = path.join(outputPaths.promotions, `${stamp}-promotions.json`)
  writeJson(outFile, payload)
  if (options.writeLatest !== false) {
    writeJson(outputPaths.promotionsLatest, { ...payload, outFile: relativePath(outFile) })
  }
  return { ...payload, outFile }
}

function main() {
  const args = parseArgs()
  const result = promoteStickyNotes(args)
  console.log(`Promoted for review: ${result.promoted.length}`)
  console.log(`Dry run: ${result.dryRun}`)
  console.log(`Promotion manifest: ${relativePath(result.outFile)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
