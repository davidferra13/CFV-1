#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureOutputRoot,
  nowStamp,
  outputPaths,
  readJson,
  relativePath,
  stickyConfig,
  writeJson,
} from './config.mjs'

const TAXONOMY = [
  'chefFlow.directive',
  'chefFlow.feature',
  'chefFlow.bug',
  'chefFlow.specFragment',
  'chefFlow.context',
  'personal.task',
  'personal.memory',
  'archive.stale',
  'archive.duplicate',
  'restricted.private',
  'restricted.recipeIp',
  'needsReview',
]

const SENSITIVE_TERMS = [
  'password',
  'passcode',
  'ssn',
  'social security',
  'bank account',
  'routing number',
  'credit card',
  'card number',
  ['api', 'key'].join(' '),
  ['secret', 'key'].join(' '),
  ['private', 'key'].join(' '),
  ['auth', 'token'].join(' '),
  'login',
]

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term))
}

function scoreTerms(text, terms) {
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0)
}

export function classifyNote(note, context = {}) {
  const lower = `${note.title}\n${note.text}`.toLowerCase()

  if (!note.textLength && note.hasRichData) {
    return result(note, 'needsReview', 0.95, ['rich text data exists but plain text is empty'], {
      nextAction: 'manual_review_rich_only',
      sensitivity: 'unknown',
    })
  }

  if (!note.textLength && !note.hasRichData) {
    return result(note, 'archive.stale', 0.9, ['empty note'], {
      nextAction: 'archive_empty_note',
      staleReason: 'empty_note',
    })
  }

  if (note.deletedAt || note.deletedRaw > 0) {
    return result(note, 'archive.stale', 0.95, ['source note is marked deleted'], {
      nextAction: 'archive_deleted_source',
      staleReason: 'deleted_source',
    })
  }

  if (context.seenHashes?.has(note.contentHash)) {
    return result(note, 'archive.duplicate', 0.95, ['content hash matches an earlier note'], {
      duplicateOf: context.seenHashes.get(note.contentHash),
      nextAction: 'attach_to_canonical_note',
    })
  }

  if (includesAny(lower, SENSITIVE_TERMS)) {
    return result(note, 'restricted.private', 0.98, ['sensitive credential or identity marker'], {
      nextAction: 'preserve_restricted_private',
      sensitivity: 'restricted',
    })
  }

  const recipeScore = scoreTerms(lower, [
    'recipe',
    'ingredients',
    'directions',
    'method',
    'yield',
    'cups',
    'tablespoon',
    'teaspoon',
    'bake',
    'roast',
    'simmer',
  ])
  if (recipeScore >= 3) {
    return result(note, 'restricted.recipeIp', 0.9, ['recipe or culinary creative IP markers'], {
      nextAction: 'preserve_recipe_ip_read_only',
      sensitivity: 'restricted',
    })
  }

  const personalTaskScore = scoreTerms(lower, [
    'doctor',
    'dentist',
    'appointment',
    'gym',
    'health',
    'family',
    'mom',
    'dad',
    'rent',
    'mortgage',
    'car',
    'personal',
    'call ',
    'text ',
  ])
  const chefFlowScore = scoreTerms(lower, [
    'chefflow',
    'chef flow',
    'codex',
    'agent',
    'planner',
    'builder',
    'research agent',
    'skill',
    'omninet',
    'claude',
    'spec',
    'v1',
    'remy',
    'client',
    'event',
    'ledger',
    'stripe',
    'pricing',
    'menu',
  ])

  if (personalTaskScore >= 2 && chefFlowScore === 0) {
    return result(note, 'personal.task', 0.82, ['personal task markers without ChefFlow context'], {
      nextAction: 'separate_personal_task',
      sensitivity: 'personal',
    })
  }

  if (
    includesAny(lower, ['codex should', 'always ', 'never ', 'hard stop', 'from now on']) ||
    (chefFlowScore >= 2 &&
      includesAny(lower, ['directive', 'rule', 'skill', 'agent', 'planner', 'builder', 'must']))
  ) {
    return result(note, 'chefFlow.directive', 0.9, ['durable project or agent behavior markers'], {
      canonicalOwner: 'skill-garden',
      nextAction: 'review_for_skill_patch',
    })
  }

  if (
    includesAny(lower, ['broken', 'bug', 'fails', 'failure', 'not working', 'error', 'crash']) &&
    chefFlowScore > 0
  ) {
    return result(note, 'chefFlow.bug', 0.86, ['ChefFlow failure language'], {
      canonicalOwner: 'findings-triage',
      nextAction: 'review_for_bug_triage',
    })
  }

  if (
    includesAny(lower, ['build ', 'feature', 'add ', 'need ', 'needs ', 'should have', 'missing']) &&
    chefFlowScore > 0
  ) {
    return result(note, 'chefFlow.feature', 0.8, ['ChefFlow product request language'], {
      canonicalOwner: 'autonomous-v1-builder',
      nextAction: 'review_for_v1_governor',
    })
  }

  if (
    includesAny(lower, ['workflow', 'spec', 'plan', 'steps', 'implementation', 'architecture', 'gate']) &&
    chefFlowScore > 0
  ) {
    return result(note, 'chefFlow.specFragment', 0.78, ['plan or spec fragment language'], {
      canonicalOwner: 'docs/specs',
      nextAction: 'review_for_spec_attachment',
    })
  }

  if (chefFlowScore > 0) {
    return result(note, 'chefFlow.context', 0.7, ['ChefFlow context markers'], {
      canonicalOwner: 'context-continuity',
      nextAction: 'review_for_context_packet',
    })
  }

  if (personalTaskScore > 0) {
    return result(note, 'personal.memory', 0.66, ['personal markers without project context'], {
      nextAction: 'separate_personal_memory',
      sensitivity: 'personal',
    })
  }

  return result(note, 'needsReview', 0.45, ['no confident lifecycle class'], {
    nextAction: 'manual_review',
  })
}

function result(note, classification, confidence, reasons, extra = {}) {
  const finalClass = confidence < stickyConfig.confidenceThreshold ? 'needsReview' : classification
  return {
    noteRef: note.noteRef,
    noteId: note.noteId,
    rowKey: note.rowKey,
    title: note.title,
    class: finalClass,
    originalClass: classification,
    confidence,
    status: finalClass === 'needsReview' ? 'needs_review' : 'classified',
    reasons,
    sensitivity: extra.sensitivity || 'normal',
    canonicalOwner: extra.canonicalOwner || null,
    nextAction: finalClass === 'needsReview' ? 'manual_review' : extra.nextAction || 'review',
    duplicateOf: extra.duplicateOf || null,
    staleReason: extra.staleReason || null,
  }
}

export function classifyRecords(records) {
  const seenHashes = new Map()
  const classifications = records.map((note) => {
    const classification = classifyNote(note, { seenHashes })
    if (!seenHashes.has(note.contentHash) && note.textLength > 0) {
      seenHashes.set(note.contentHash, note.noteRef)
    }
    if (!TAXONOMY.includes(classification.class)) {
      throw new Error(`Unknown Sticky Notes classification: ${classification.class}`)
    }
    return classification
  })
  return classifications
}

export function classifyLatest(options = {}) {
  ensureOutputRoot()
  const latest = readJson(options.inputFile || outputPaths.normalizedLatest, null)
  if (!latest?.records) {
    throw new Error(`No normalized Sticky Notes snapshot found: ${outputPaths.normalizedLatest}`)
  }
  const classifications = classifyRecords(latest.records)
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceSnapshot: options.inputFile || outputPaths.normalizedLatest,
    classifications,
  }
  const stamp = options.stamp || nowStamp()
  const outFile = path.join(outputPaths.classifications, `${stamp}-classified.json`)
  writeJson(outFile, payload)
  writeJson(outputPaths.classificationsLatest, payload)
  return { ...payload, outFile }
}

function main() {
  const result = classifyLatest()
  const counts = Object.groupBy
    ? Object.groupBy(result.classifications, (item) => item.class)
    : result.classifications.reduce((acc, item) => {
        acc[item.class] ||= []
        acc[item.class].push(item)
        return acc
      }, {})
  console.log(`Classified notes: ${result.classifications.length}`)
  for (const [classification, items] of Object.entries(counts)) {
    console.log(`${classification}: ${items.length}`)
  }
  console.log(`Classifications: ${relativePath(result.outFile)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
