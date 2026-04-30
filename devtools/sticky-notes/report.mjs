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
  writeJson,
} from './config.mjs'

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function section(title, items, notesByRef) {
  const lines = [`## ${title}`, '']
  if (!items.length) {
    lines.push('_None._', '')
    return lines.join('\n')
  }
  for (const item of items.slice(0, 25)) {
    const note = notesByRef.get(item.noteRef)
    lines.push(`- Note ${item.noteId}: ${note?.title || 'Untitled'} (${item.class})`)
    lines.push(`  - Next: ${item.nextAction}`)
    lines.push(`  - Confidence: ${item.confidence}`)
  }
  lines.push('')
  return lines.join('\n')
}

export function generateStickyNotesReport(options = {}) {
  ensureOutputRoot()
  const snapshot = readJson(options.snapshotFile || outputPaths.normalizedLatest, null)
  const classified = readJson(options.classificationFile || outputPaths.classificationsLatest, null)
  const attached = readJson(options.attachmentFile || outputPaths.attachmentsLatest, { attachments: [] })
  const state = readJson(options.stateFile || outputPaths.stateLatest, { unprocessed: [], active: [], finished: [] })
  if (!snapshot?.records) throw new Error(`No normalized Sticky Notes snapshot found: ${outputPaths.normalizedLatest}`)
  if (!classified?.classifications) {
    throw new Error(`No Sticky Notes classifications found: ${outputPaths.classificationsLatest}`)
  }

  const notesByRef = new Map(snapshot.records.map((note) => [note.noteRef, note]))
  const classifications = classified.classifications
  const counts = countBy(classifications, 'class')
  const stamp = options.stamp || nowStamp()

  const markdown = [
    '# Sticky Notes Organize Report',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Source: ${snapshot.sourcePath || 'unknown'}`,
    `- Notes discovered: ${snapshot.records.length}`,
    `- New: ${snapshot.changes?.new ?? 0}`,
    `- Changed: ${snapshot.changes?.changed ?? 0}`,
    `- Unchanged: ${snapshot.changes?.unchanged ?? 0}`,
    `- Attachments written: ${attached.attachments?.length ?? 0}`,
    `- Unprocessed right now: ${state.unprocessed?.length ?? 0}`,
    `- Active categorized notes: ${state.active?.length ?? 0}`,
    `- Finished notes: ${state.finished?.length ?? 0}`,
    '',
    '## Color State Counts',
    '',
    ...Object.entries(state.counts || {}).map(([stateName, count]) => `- ${stateName}: ${count}`),
    '',
    '## Classification Counts',
    '',
    ...Object.entries(counts).map(([classification, count]) => `- ${classification}: ${count}`),
    '',
    section(
      'High-Value ChefFlow Directives',
      classifications.filter((item) => item.class === 'chefFlow.directive'),
      notesByRef,
    ),
    section(
      'Feature and Spec Candidates',
      classifications.filter((item) => item.class === 'chefFlow.feature' || item.class === 'chefFlow.specFragment'),
      notesByRef,
    ),
    section(
      'Bugs and Regressions',
      classifications.filter((item) => item.class === 'chefFlow.bug'),
      notesByRef,
    ),
    section(
      'Personal Notes Separated',
      classifications.filter((item) => item.class.startsWith('personal.')),
      notesByRef,
    ),
    section(
      'Restricted or Sensitive Notes',
      classifications.filter((item) => item.class.startsWith('restricted.')),
      notesByRef,
    ),
    section(
      'Duplicates and Stale Notes',
      classifications.filter((item) => item.class.startsWith('archive.')),
      notesByRef,
    ),
    section(
      'Needs Review',
      classifications.filter((item) => item.class === 'needsReview'),
      notesByRef,
    ),
    '## Proposed Next Actions',
    '',
    '1. Review `chefFlow.directive` candidates through skill-garden before patching skills.',
    '2. Review `chefFlow.feature` candidates through the V1 governor before adding build work.',
    '3. Keep personal and restricted outputs out of ChefFlow queues.',
    '',
  ].join('\n')

  const mdFile = path.join(outputPaths.reports, `${stamp}-organize.md`)
  const jsonFile = path.join(outputPaths.reports, `${stamp}-organize.json`)
  fs.writeFileSync(mdFile, markdown)
  writeJson(jsonFile, {
    generatedAt: new Date().toISOString(),
    sourcePath: snapshot.sourcePath,
    counts,
    stateCounts: state.counts || {},
    unprocessedCount: state.unprocessed?.length ?? 0,
    changes: snapshot.changes,
    attachments: attached.attachments || [],
  })
  return { mdFile, jsonFile, counts }
}

function main() {
  const result = generateStickyNotesReport()
  console.log(`Report: ${relativePath(result.mdFile)}`)
  console.log(`Report JSON: ${relativePath(result.jsonFile)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
