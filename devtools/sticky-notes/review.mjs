#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureOutputRoot,
  nowStamp,
  outputPaths,
  promotionDestinationByClass,
  readJson,
  relativePath,
  writeJson,
} from './config.mjs'

function classifyReviewStatus(classification) {
  if (classification.class.startsWith('restricted.')) return 'restricted'
  if (classification.class.startsWith('personal.')) return 'personal'
  if (classification.class.startsWith('archive.')) return 'archived'
  if (classification.class === 'needsReview') return 'needs_review'
  if (promotionDestinationByClass[classification.class]) return 'promotable'
  return 'needs_review'
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function renderMarkdown(payload) {
  const lines = [
    '# Sticky Notes Review Cockpit',
    '',
    `- Generated: ${payload.generatedAt}`,
    `- Total notes: ${payload.total}`,
    '',
    '## Status Counts',
    '',
    ...Object.entries(payload.statusCounts).map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Promotable Items',
    '',
  ]

  const promotable = payload.items.filter((item) => item.reviewStatus === 'promotable')
  if (!promotable.length) {
    lines.push('_None._', '')
  } else {
    for (const item of promotable) {
      lines.push(`- ${item.reviewId}: Note ${item.noteId}, ${item.title || 'Untitled'}`)
      lines.push(`  - Class: ${item.class}`)
      lines.push(`  - Route: ${item.route}`)
      lines.push(`  - Confidence: ${item.confidence}`)
      lines.push(`  - Next: ${item.nextAction}`)
    }
    lines.push('')
  }

  lines.push('## Held Back')
  lines.push('')
  for (const status of ['needs_review', 'personal', 'restricted', 'archived']) {
    const count = payload.statusCounts[status] || 0
    lines.push(`- ${status}: ${count}`)
  }
  lines.push('')
  lines.push('## Promotion Rule')
  lines.push('')
  lines.push('Run `npm run sticky:promote` to create local promotion packets for promotable ChefFlow items.')
  lines.push('Promotion packets are review artifacts only. They do not mutate skills, specs, queues, or project rules.')
  lines.push('')
  return lines.join('\n')
}

export function buildReviewCockpit(options = {}) {
  ensureOutputRoot()
  const snapshot = readJson(options.snapshotFile || outputPaths.normalizedLatest, null)
  const classified = readJson(options.classificationFile || outputPaths.classificationsLatest, null)
  if (!snapshot?.records) throw new Error(`No normalized Sticky Notes snapshot found: ${outputPaths.normalizedLatest}`)
  if (!classified?.classifications) {
    throw new Error(`No Sticky Notes classifications found: ${outputPaths.classificationsLatest}`)
  }

  const notesByRef = new Map(snapshot.records.map((note) => [note.noteRef, note]))
  const items = classified.classifications.map((classification) => {
    const note = notesByRef.get(classification.noteRef)
    const promotionDestination = promotionDestinationByClass[classification.class] || null
    return {
      reviewId: `sticky-${String(classification.noteId).padStart(4, '0')}`,
      noteRef: classification.noteRef,
      noteId: classification.noteId,
      title: note?.title || classification.title || '',
      class: classification.class,
      confidence: classification.confidence,
      reviewStatus: classifyReviewStatus(classification),
      route: promotionDestination?.route || classification.canonicalOwner || null,
      nextAction: promotionDestination?.action || classification.nextAction || 'manual_review',
      reasons: classification.reasons || [],
      sourceUpdatedAt: note?.updatedAt || null,
    }
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    total: items.length,
    statusCounts: countBy(items, 'reviewStatus'),
    classCounts: countBy(items, 'class'),
    items,
  }

  const stamp = options.stamp || nowStamp()
  const jsonFile = path.join(outputPaths.review, `${stamp}-review.json`)
  const mdFile = path.join(outputPaths.review, `${stamp}-review.md`)
  writeJson(jsonFile, payload)
  fs.writeFileSync(mdFile, renderMarkdown(payload))
  if (options.writeLatest !== false) {
    writeJson(outputPaths.reviewLatest, { ...payload, jsonFile: relativePath(jsonFile), mdFile: relativePath(mdFile) })
  }
  return { ...payload, jsonFile, mdFile }
}

function main() {
  const result = buildReviewCockpit()
  console.log(`Review items: ${result.total}`)
  console.log(`Promotable: ${result.statusCounts.promotable || 0}`)
  console.log(`Needs review: ${result.statusCounts.needs_review || 0}`)
  console.log(`Personal: ${result.statusCounts.personal || 0}`)
  console.log(`Restricted: ${result.statusCounts.restricted || 0}`)
  console.log(`Review cockpit: ${relativePath(result.mdFile)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
