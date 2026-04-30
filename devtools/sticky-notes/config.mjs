import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const repoRoot = process.cwd()

export const DEFAULT_DB_PATH = path.join(
  os.homedir(),
  'Documents',
  'Simple Sticky Notes',
  'Notes.db',
)

export const stickyConfig = {
  dbPath: process.env.STICKY_NOTES_DB || DEFAULT_DB_PATH,
  outputRoot: process.env.STICKY_NOTES_OUTPUT || path.join(repoRoot, 'system', 'sticky-notes'),
  confidenceThreshold: Number(process.env.STICKY_NOTES_CONFIDENCE_THRESHOLD || '0.65'),
}

export const outputPaths = {
  snapshots: path.join(stickyConfig.outputRoot, 'snapshots'),
  normalizedLatest: path.join(stickyConfig.outputRoot, 'snapshots', 'latest.json'),
  classifications: path.join(stickyConfig.outputRoot, 'classified'),
  classificationsLatest: path.join(stickyConfig.outputRoot, 'classified', 'latest.json'),
  attachments: path.join(stickyConfig.outputRoot, 'attached'),
  attachmentsLatest: path.join(stickyConfig.outputRoot, 'attached', 'latest.json'),
  state: path.join(stickyConfig.outputRoot, 'state'),
  stateLatest: path.join(stickyConfig.outputRoot, 'state', 'latest.json'),
  unprocessed: path.join(stickyConfig.outputRoot, 'unprocessed'),
  unprocessedLatest: path.join(stickyConfig.outputRoot, 'unprocessed', 'latest.json'),
  active: path.join(stickyConfig.outputRoot, 'active'),
  activeLatest: path.join(stickyConfig.outputRoot, 'active', 'latest.json'),
  pinned: path.join(stickyConfig.outputRoot, 'pinned'),
  pinnedLatest: path.join(stickyConfig.outputRoot, 'pinned', 'latest.json'),
  finished: path.join(stickyConfig.outputRoot, 'finished'),
  finishedLatest: path.join(stickyConfig.outputRoot, 'finished', 'latest.json'),
  review: path.join(stickyConfig.outputRoot, 'review-cockpit'),
  reviewLatest: path.join(stickyConfig.outputRoot, 'review-cockpit', 'latest.json'),
  promotions: path.join(stickyConfig.outputRoot, 'promotions'),
  promotionsLatest: path.join(stickyConfig.outputRoot, 'promotions', 'latest.json'),
  processed: path.join(stickyConfig.outputRoot, 'processed'),
  processedLatest: path.join(stickyConfig.outputRoot, 'processed', 'latest.json'),
  reports: path.join(stickyConfig.outputRoot, 'reports'),
  lockFile: path.join(stickyConfig.outputRoot, '.organize.lock'),
}

export const destinationByClass = {
  'chefFlow.directive': 'actions/skill-garden-candidates',
  'chefFlow.feature': 'actions/spec-candidates',
  'chefFlow.bug': 'actions/triage-candidates',
  'chefFlow.specFragment': 'actions/spec-fragments',
  'chefFlow.context': 'actions/context-packets',
  'personal.task': 'personal/tasks',
  'personal.memory': 'personal/memory',
  'archive.stale': 'archive/stale',
  'archive.duplicate': 'archive/duplicates',
  'restricted.private': 'restricted/private',
  'restricted.recipeIp': 'restricted/recipe-ip',
  needsReview: 'review',
}

export const stickyColorTaxonomy = {
  unprocessed: {
    color: 'white',
    value: 16777215,
    meaning: 'raw unprocessed input',
  },
  queued: {
    color: 'yellow',
    value: 16776960,
    meaning: 'classified and waiting for the correct gate',
  },
  in_progress: {
    color: 'blue',
    value: 16764057,
    meaning: 'accepted by a downstream workflow and being worked',
  },
  blocked: {
    color: 'red',
    value: 255,
    meaning: 'ambiguous, unsafe, missing evidence, or escalated',
  },
  complete: {
    color: 'green',
    value: 65280,
    meaning: 'resolved and moved out of the active surface',
  },
}

export function stickyColorForState(state) {
  return stickyColorTaxonomy[state] || stickyColorTaxonomy.blocked
}

export function stickyColorNameForValue(value) {
  const numeric = Number(value)
  const match = Object.values(stickyColorTaxonomy).find((item) => item.value === numeric)
  return match?.color || `custom:${Number.isFinite(numeric) ? numeric : 'unknown'}`
}

export const promotionDestinationByClass = {
  'chefFlow.directive': {
    route: 'skill-garden',
    directory: 'skill-garden-candidates',
    action: 'review_for_skill_patch',
  },
  'chefFlow.feature': {
    route: 'v1-governor',
    directory: 'v1-governor-candidates',
    action: 'review_for_v1_classification',
  },
  'chefFlow.bug': {
    route: 'findings-triage',
    directory: 'bug-triage-candidates',
    action: 'review_for_bug_triage',
  },
  'chefFlow.specFragment': {
    route: 'context-continuity',
    directory: 'spec-attachment-candidates',
    action: 'review_for_spec_attachment',
  },
  'chefFlow.context': {
    route: 'context-continuity',
    directory: 'context-packet-candidates',
    action: 'review_for_memory_packet',
  },
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export function ensureOutputRoot() {
  ensureDir(stickyConfig.outputRoot)
  for (const dir of Object.values(outputPaths)) {
    if (!path.extname(dir)) ensureDir(dir)
  }
  for (const relativeDir of Object.values(destinationByClass)) {
    ensureDir(path.join(stickyConfig.outputRoot, relativeDir))
  }
  for (const destination of Object.values(promotionDestinationByClass)) {
    ensureDir(path.join(outputPaths.promotions, destination.directory))
  }
}

export function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

export function relativePath(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/')
}

export function slugify(input) {
  return String(input || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}
