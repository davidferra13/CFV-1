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
