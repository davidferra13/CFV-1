#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DEFAULT_QUEUE_DIR = join('system', 'unified-build-queue')
const DEFAULT_LIMIT = 12

const MODULE_PRIORITY = [
  'pricing-trust',
  'finance-ledger',
  'client-intake',
  'dietary-safety',
  'events-ops',
  'auth-security',
  'v1-control-plane',
  'docs-release-proof',
  'chef-workspace',
  'sourcing-inventory',
  'menus-offers',
  'public-trust',
  'ai-boundaries',
]

const CLASSIFICATION_TO_QUEUE = {
  v1_blocker: 'approved_v1_blocker',
  v1_support: 'approved_v1_support',
}

export function promoteModuleBatches({
  root = process.cwd(),
  queueDir = join(root, DEFAULT_QUEUE_DIR),
  write = true,
  limit = DEFAULT_LIMIT,
  classification = 'v1_blocker',
  modules = MODULE_PRIORITY,
  approvalSource = 'Founder Authority chat approval',
  now = new Date(),
} = {}) {
  const context = {
    root: resolve(root),
    queueDir: resolve(queueDir),
    now,
    approvalSource,
  }

  const candidates = readJson(join(context.queueDir, 'candidates.json'))
  const batches = readJson(join(context.queueDir, 'module-batches.json'))
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const moduleSet = new Set(modules)

  const eligibleBatches = batches
    .filter((batch) => batch.classification === classification)
    .filter((batch) => CLASSIFICATION_TO_QUEUE[batch.classification])
    .filter((batch) => moduleSet.has(batch.module?.id))
    .filter((batch) => batch.approvalState !== 'approved')
    .filter((batch) => batch.candidateIds.every((id) => candidateById.has(id)))
    .sort((left, right) => compareBatches(left, right, modules))

  const approvedBatches = eligibleBatches.slice(0, limit).map((batch) =>
    approveBatch(batch, candidateById, context),
  )

  const queuePreview = approvedBatches.map((batch) => queueRecordForBatch(batch, context))
  const summary = buildPromotionSummary({
    context,
    candidates,
    batches,
    eligibleBatches,
    approvedBatches,
    queuePreview,
    classification,
    modules,
    limit,
  })

  const output = {
    approvedBatches,
    queuePreview,
    summary,
  }

  if (write) {
    mkdirSync(context.queueDir, { recursive: true })
    writeJson(join(context.queueDir, 'approved-batches.json'), approvedBatches)
    writeJsonl(join(context.queueDir, 'approved-queue-preview.jsonl'), queuePreview)
    writeJson(join(context.queueDir, 'promotion-summary.json'), summary)
  }

  return output
}

function approveBatch(batch, candidateById, context) {
  const candidates = batch.candidateIds.map((id) => candidateById.get(id))
  const candidateSummaries = candidates.map((candidate) => ({
    id: candidate.id,
    source: candidate.source,
    sourcePath: candidate.sourcePath,
    title: candidate.title,
    classification: candidate.classification,
    module: candidate.module,
    duplicateOf: candidate.duplicateOf ?? null,
  }))

  return {
    ...batch,
    approvalState: 'approved',
    approvedAt: context.now.toISOString(),
    approvedBy: 'Founder Authority',
    approvalSource: context.approvalSource,
    executionEligible: false,
    liveQueueWriteRequired: true,
    liveQueueWriteBlockedReason:
      'This batch is approved, but it has not been appended to system/v1-builder/approved-queue.jsonl by this script.',
    candidateSummaries,
  }
}

function queueRecordForBatch(batch, context) {
  const queueClassification = CLASSIFICATION_TO_QUEUE[batch.classification]
  const id = `batch-queue-${stableId(batch.id)}`
  const title = `Module Batch: ${batch.module.label} (${batch.taskCount} tasks)`
  const rawAskSummary = batch.titles
    .map((title, index) => `${index + 1}. ${title}`)
    .join('\n')

  return {
    id,
    requestId: `batch-request-${stableId(batch.id)}`,
    source: 'unified-module-batch',
    sourcePath: `system/unified-build-queue/module-batches.json#${batch.id}`,
    title,
    rawAskSummary,
    classification: queueClassification,
    status: 'queued',
    statusReason:
      'Founder Authority approved this governed module batch. Build as a batch, not as raw candidate tasks.',
    canonicalOwner: `module:${batch.module.id}`,
    createdAt: context.now.toISOString(),
    updatedAt: context.now.toISOString(),
    risk: batch.classification === 'v1_blocker' ? 'high' : 'medium',
    activeLane: 'governed-module-batch',
    dependencies: [],
    dependenciesSatisfied: true,
    blockedBy: null,
    batchId: batch.id,
    moduleId: batch.module.id,
    candidateIds: batch.candidateIds,
    sourceCounts: batch.sourceCounts,
  }
}

function buildPromotionSummary({
  context,
  candidates,
  batches,
  eligibleBatches,
  approvedBatches,
  queuePreview,
  classification,
  modules,
  limit,
}) {
  return {
    generatedAt: context.now.toISOString(),
    approvalSource: context.approvalSource,
    readOnlyAgainstLiveQueue: true,
    schemaVersion: 1,
    selection: {
      classification,
      modules,
      limit,
    },
    totals: {
      candidates: candidates.length,
      moduleBatches: batches.length,
      eligibleBatches: eligibleBatches.length,
      approvedBatches: approvedBatches.length,
      queuePreviewRecords: queuePreview.length,
      liveQueueWrites: 0,
    },
    outputs: {
      approvedBatches: slash(relative(context.root, join(context.queueDir, 'approved-batches.json'))),
      queuePreview: slash(relative(context.root, join(context.queueDir, 'approved-queue-preview.jsonl'))),
      summary: slash(relative(context.root, join(context.queueDir, 'promotion-summary.json'))),
    },
    nextStep:
      'Append approved-queue-preview.jsonl to system/v1-builder/approved-queue.jsonl only when that live queue file is not owned by another active agent.',
  }
}

function compareBatches(left, right, modules) {
  return (
    moduleRank(left.module?.id, modules) - moduleRank(right.module?.id, modules) ||
    right.taskCount - left.taskCount ||
    left.id.localeCompare(right.id)
  )
}

function moduleRank(moduleId, modules) {
  const index = modules.indexOf(moduleId)
  return index === -1 ? 999 : index
}

function readJson(file) {
  if (!existsSync(file)) {
    throw new Error(`Missing required file: ${file}`)
  }
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(sanitizeForOutput(value), null, 2)}\n`, 'utf8')
}

function writeJsonl(file, records) {
  const lines = records.map((record) => JSON.stringify(sanitizeForOutput(record)))
  writeFileSync(file, `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8')
}

function stableId(input) {
  return createHash('sha256').update(String(input)).digest('hex').slice(0, 16)
}

function slash(value) {
  return String(value ?? '').replace(/\\/g, '/')
}

function sanitizeForOutput(value) {
  if (typeof value === 'string') return value.replace(/\u2014/g, ' - ').replace(/\u2013/g, '-')
  if (Array.isArray(value)) return value.map((item) => sanitizeForOutput(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sanitizeForOutput(entry)]))
  }
  return value
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    root: process.cwd(),
    queueDir: null,
    write: true,
    limit: DEFAULT_LIMIT,
    classification: 'v1_blocker',
    modules: MODULE_PRIORITY,
    approvalSource: 'Founder Authority chat approval',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') args.root = argv[++index]
    else if (arg === '--queue-dir') args.queueDir = argv[++index]
    else if (arg === '--no-write') args.write = false
    else if (arg === '--limit') args.limit = Number(argv[++index])
    else if (arg === '--classification') args.classification = argv[++index]
    else if (arg === '--modules') args.modules = argv[++index].split(',').map((item) => item.trim()).filter(Boolean)
    else if (arg === '--approval-source') args.approvalSource = argv[++index]
    else if (arg === '--help') args.help = true
  }

  return args
}

function printUsage() {
  console.log(`Usage:
  node scripts/unified-build-queue/promote-batches.mjs [--limit 12] [--classification v1_blocker] [--modules pricing-trust,finance-ledger]

Writes:
  system/unified-build-queue/approved-batches.json
  system/unified-build-queue/approved-queue-preview.jsonl
  system/unified-build-queue/promotion-summary.json`)
}

async function main() {
  const args = parseArgs()
  if (args.help) {
    printUsage()
    return
  }

  const root = resolve(args.root)
  const queueDir = args.queueDir ? resolve(args.queueDir) : join(root, DEFAULT_QUEUE_DIR)
  const result = promoteModuleBatches({
    root,
    queueDir,
    write: args.write,
    limit: Number.isFinite(args.limit) ? args.limit : DEFAULT_LIMIT,
    classification: args.classification,
    modules: args.modules,
    approvalSource: args.approvalSource,
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        wrote: args.write,
        readOnlyAgainstLiveQueue: true,
        outDir: slash(relative(root, queueDir)),
        totals: result.summary.totals,
        nextStep: result.summary.nextStep,
      },
      null,
      2,
    ),
  )
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
const modulePath = fileURLToPath(import.meta.url)
if (invokedPath && pathToFileURL(invokedPath).href === pathToFileURL(modulePath).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
