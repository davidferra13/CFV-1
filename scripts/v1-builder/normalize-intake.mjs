#!/usr/bin/env node
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  appendJsonl,
  createBuilderContext,
  ensureBuilderStore,
  readActiveLane,
  readJsonl,
  slugify,
} from './core.mjs'

const MAX_SOURCE_BYTES = 200_000

const SOURCE_DIRS = [
  {
    source: 'spec',
    ledgerSource: 'spec',
    dir: 'docs/specs',
    extensions: ['.md'],
  },
  {
    source: 'legacy-build-queue',
    ledgerSource: 'system-finding',
    dir: 'system/build-queue',
    extensions: ['.md'],
  },
  {
    source: 'legacy-ready-task',
    ledgerSource: 'system-finding',
    dir: 'system/ready-tasks',
    extensions: ['.md'],
  },
  {
    source: 'legacy-codex-queue',
    ledgerSource: 'system-finding',
    dir: 'system/codex-queue',
    extensions: ['.md'],
  },
  {
    source: 'legacy-codex-build-queue',
    ledgerSource: 'system-finding',
    dir: 'system/codex-build-queue',
    extensions: ['.md'],
  },
  {
    source: 'persona-build-plan',
    ledgerSource: 'persona',
    dir: 'system/persona-build-plans',
    extensions: ['.md'],
  },
  {
    source: 'persona-batch-synthesis',
    ledgerSource: 'persona',
    dir: 'system/persona-batch-synthesis',
    extensions: ['.md'],
  },
  {
    source: 'persona-stress-test',
    ledgerSource: 'persona',
    dir: 'docs/stress-tests',
    extensions: ['.md'],
  },
  {
    source: 'agent-report',
    ledgerSource: 'audit',
    dir: 'system/regression-reports',
    extensions: ['.json', '.md'],
  },
  {
    source: 'research-finding',
    ledgerSource: 'audit',
    dir: 'docs/research',
    extensions: ['.md'],
  },
]

const V1_TERMS = [
  'inquiry',
  'client',
  'event',
  'engagement',
  'menu',
  'quote',
  'agreement',
  'payment',
  'prep',
  'sourcing',
  'service',
  'follow-up',
  'memory',
  'pricing',
  'costing',
  'ledger',
  'trust',
  'safety',
  'completion',
  'mission control',
  'v1',
  'builder',
  'governor',
]

const REJECTION_TERMS = [
  'generate recipe',
  'generates recipes',
  'suggest recipes',
  'draft recipes',
  'auto-fill recipes',
  'agent.create_recipe',
  'agent.update_recipe',
  'agent.add_ingredient',
]

const BLOCKED_TERMS = [
  'drop table',
  'drop column',
  'truncate',
  'drizzle-kit push',
  'push to main',
  'merge to main',
  'deploy to production',
  'delete from',
]

export function normalizeIntake({
  context = createBuilderContext(),
  write = false,
  now = new Date(),
  limit = null,
  profile = 'builder-gate',
  includeNoisySources = false,
  maxApprovedQueueWrites = null,
  maxHardStopWrites = null,
} = {}) {
  ensureBuilderStore(context)

  const activeLane = readActiveLane(context)
  const candidates = collectCandidates(context)
  const existing = loadExistingKeys(context)
  const candidatePlans = []
  const duplicateSources = []
  const intakeProfile = resolveIntakeProfile({
    profile: includeNoisySources ? 'full' : profile,
    maxApprovedQueueWrites,
    maxHardStopWrites,
  })

  for (const candidate of candidates) {
    if (existing.sourcePaths.has(candidate.sourcePath) || existing.ids.has(candidate.id)) {
      duplicateSources.push(candidate.sourcePath)
      continue
    }

    const classification = classifyCandidate(candidate, activeLane)
    candidatePlans.push({
      candidate,
      classification,
      ledgerRecord: createLedgerRecord(candidate, classification, now),
      sinkRecord: createSinkRecord(candidate, classification, activeLane, now),
    })
  }

  const { planned, deferred } = applyIntakeProfile(candidatePlans, intakeProfile, limit)

  if (write) {
    writePlan(context, planned)
  }

  const summary = summarizePlan({
    context,
    candidates,
    duplicateSources,
    planned,
    deferred,
    activeLane,
    write,
    now,
    profile: intakeProfile.name,
    maxApprovedQueueWrites: intakeProfile.maxApprovedQueueWrites,
    maxHardStopWrites: intakeProfile.maxHardStopWrites,
  })

  if (write) {
    mkdirSync(context.runtimeDir, { recursive: true })
    writeFileSync(
      join(context.runtimeDir, 'intake-normalizer-status.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
      'utf8',
    )
  }

  return summary
}

function resolveIntakeProfile({ profile, maxApprovedQueueWrites, maxHardStopWrites }) {
  if (profile === 'builder-gate') {
    return {
      name: 'builder-gate',
      maxApprovedQueueWrites: Number.isInteger(maxApprovedQueueWrites)
        ? maxApprovedQueueWrites
        : 3,
      maxHardStopWrites: Number.isInteger(maxHardStopWrites)
        ? maxHardStopWrites
        : 10,
    }
  }

  return {
    name: 'full',
    maxApprovedQueueWrites: null,
    maxHardStopWrites: null,
  }
}

function applyIntakeProfile(candidatePlans, intakeProfile, limit) {
  if (intakeProfile.name !== 'builder-gate') {
    return {
      planned: limit === null ? candidatePlans : candidatePlans.slice(0, limit),
      deferred: {
        approvedCap: 0,
        hardStopCap: 0,
        nonBuildable: 0,
      },
    }
  }

  const approved = candidatePlans
    .filter((item) => item.classification.sink === 'approved-queue.jsonl')
    .sort(compareIntakePlans)
  const hardStops = candidatePlans
    .filter((item) => isHardStopPlan(item) && item.candidate.source === 'spec')
    .sort(compareIntakePlans)

  const approvedLimit = limit === null
    ? intakeProfile.maxApprovedQueueWrites
    : Math.min(intakeProfile.maxApprovedQueueWrites, limit)
  const selectedApproved = approved.slice(0, approvedLimit)
  const selectedHardStops = hardStops.slice(0, intakeProfile.maxHardStopWrites)
  const selected = [...selectedApproved, ...selectedHardStops]
  const selectedKeys = new Set(selected.map((item) => item.candidate.id))
  const approvedCap = Math.max(approved.length - selectedApproved.length, 0)
  const hardStopCap = Math.max(hardStops.length - selectedHardStops.length, 0)

  return {
    planned: selected,
    deferred: {
      approvedCap,
      hardStopCap,
      nonBuildable: candidatePlans.filter((item) => !selectedKeys.has(item.candidate.id)).length -
        approvedCap -
        hardStopCap,
    },
  }
}

function compareIntakePlans(left, right) {
  return (
    sourceRank(left.candidate.source) - sourceRank(right.candidate.source) ||
    classificationRank(left.classification.builderClassification) -
      classificationRank(right.classification.builderClassification) ||
    priorityRank(left.candidate.metadata.priority) - priorityRank(right.candidate.metadata.priority) ||
    left.candidate.sourcePath.localeCompare(right.candidate.sourcePath)
  )
}

function isHardStopPlan(item) {
  return ['blocked', 'rejected'].includes(item.classification.ledgerStatus)
}

function sourceRank(source) {
  if (source === 'spec') return 0
  if (source === 'sticky-note') return 1
  if (source.startsWith('legacy-')) return 2
  if (source.startsWith('persona-')) return 3
  if (source === 'research-finding') return 4
  return 5
}

function classificationRank(classification) {
  if (classification === 'approved_v1_blocker') return 0
  if (classification === 'approved_v1_support') return 1
  if (classification === 'blocked') return 2
  if (classification === 'rejected') return 3
  return 9
}

function priorityRank(priority) {
  const normalized = normalizePriority(priority)
  if (normalized === 'p0') return 0
  if (normalized === 'p1') return 1
  if (normalized === 'p2') return 2
  if (normalized === 'p3') return 3
  return 4
}

function collectCandidates(context) {
  const candidates = []

  for (const sourceDir of SOURCE_DIRS) {
    const root = join(context.root, sourceDir.dir)
    for (const path of walkFiles(root, sourceDir.extensions)) {
      const sourcePath = slash(relative(context.root, path))
      const text = readSourceText(path)
      if (!text.trim()) continue

      const metadata = parseMetadata(text)
      candidates.push({
        id: stableId(sourceDir.source, sourcePath),
        source: sourceDir.source,
        ledgerSource: sourceDir.ledgerSource,
        sourcePath,
        title: extractTitle(text, sourcePath),
        summary: extractSummary(text),
        text,
        metadata,
        createdAt: metadata.generated ?? metadata.exported_at ?? metadata.created ?? null,
      })
    }
  }

  candidates.push(...collectStickyCandidates(context))

  return candidates.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath))
}

function collectStickyCandidates(context) {
  const reportsDir = join(context.root, 'system', 'sticky-notes', 'reports')
  const latestReport = latestMatchingFile(reportsDir, '-organize.json')
  if (!latestReport) return []

  let report
  try {
    report = JSON.parse(readFileSync(latestReport, 'utf8'))
  } catch {
    return []
  }

  if (!Array.isArray(report.attachments)) return []

  const candidates = []
  for (const attachment of report.attachments) {
    if (!shouldImportStickyAttachment(attachment)) continue

    const destination = attachment.destination ?? attachment.noteRef ?? `sticky-note-${attachment.noteId}`
    const sourcePath = slash(destination)
    const fullPath = join(context.root, destination)
    const text = existsSync(fullPath) ? readSourceText(fullPath) : JSON.stringify(attachment)

    candidates.push({
      id: stableId('sticky-note', attachment.noteRef ?? sourcePath),
      source: 'sticky-note',
      ledgerSource: 'sticky-note',
      sourcePath,
      title: extractTitle(text, sourcePath),
      summary: extractSummary(text) || `Sticky Notes ${attachment.classification} item.`,
      text,
      metadata: {
        classification: attachment.classification,
        status: attachment.status,
        requiresReview: attachment.requiresReview,
        mayMutateProject: attachment.mayMutateProject,
        organizeReport: slash(relative(context.root, latestReport)),
      },
      createdAt: report.generatedAt ?? null,
    })
  }

  return candidates
}

function shouldImportStickyAttachment(attachment) {
  const classification = String(attachment.classification ?? '')
  if (classification.startsWith('personal.')) return false
  if (classification.startsWith('restricted.')) return false
  if (classification.startsWith('archive.')) return false
  return classification.startsWith('chefFlow.') || classification === 'needsReview'
}

function classifyCandidate(candidate, activeLane) {
  const text = `${candidate.title}\n${candidate.summary}\n${candidate.text}`.toLowerCase()

  if (REJECTION_TERMS.some((term) => text.includes(term))) {
    return {
      builderClassification: 'rejected',
      ledgerStatus: 'rejected',
      sink: null,
      reason: 'Rejected because the item asks AI to generate or mutate recipes.',
    }
  }

  if (BLOCKED_TERMS.some((term) => text.includes(term))) {
    return {
      builderClassification: 'blocked',
      ledgerStatus: 'blocked',
      sink: 'blocked.jsonl',
      reason: 'Blocked because the item appears to require a hard-stop operation or explicit approval.',
    }
  }

  const status = normalizeStatus(candidate.metadata.status)
  if (['verified', 'built', 'completed', 'complete'].includes(status)) {
    return {
      builderClassification: 'duplicate_attach',
      ledgerStatus: 'duplicate_attach',
      sink: null,
      reason: 'Already appears completed in the source artifact. Attach to the existing owner instead of rebuilding.',
    }
  }

  if (candidate.source === 'spec' && status === 'ready') {
    const priority = normalizePriority(candidate.metadata.priority)
    if (priority === 'p0' && isV1Relevant(candidate, activeLane)) {
      return {
        builderClassification: 'approved_v1_blocker',
        ledgerStatus: 'queued',
        sink: 'approved-queue.jsonl',
        reason: 'Ready P0 spec matches the V1 builder lane and can feed the live builder queue.',
      }
    }

    if (priority === 'p1' && isV1Relevant(candidate, activeLane)) {
      return {
        builderClassification: 'approved_v1_support',
        ledgerStatus: 'queued',
        sink: 'approved-queue.jsonl',
        reason: 'Ready P1 spec matches the V1 builder lane and can queue behind blockers.',
      }
    }

    return {
      builderClassification: 'research_required',
      ledgerStatus: 'research_required',
      sink: 'research-queue.jsonl',
      reason: 'Ready spec needs V1 governor confirmation before entering the live builder queue.',
    }
  }

  if (candidate.source === 'sticky-note') {
    return {
      builderClassification: 'research_required',
      ledgerStatus: 'research_required',
      sink: 'research-queue.jsonl',
      reason: 'Sticky Notes material must pass review and V1 governor classification before build execution.',
    }
  }

  if (candidate.ledgerSource === 'persona') {
    return {
      builderClassification: 'research_required',
      ledgerStatus: 'research_required',
      sink: 'research-queue.jsonl',
      reason: 'Persona output needs codebase validation and V1 governor triage before build execution.',
    }
  }

  if (candidate.source.startsWith('legacy-')) {
    return {
      builderClassification: 'research_required',
      ledgerStatus: 'research_required',
      sink: 'research-queue.jsonl',
      reason: 'Legacy queue item is preserved but must be normalized through the V1 governor before build execution.',
    }
  }

  return {
    builderClassification: 'research_required',
    ledgerStatus: 'research_required',
    sink: 'research-queue.jsonl',
    reason: 'Source artifact needs explicit classification before it can become buildable work.',
  }
}

function createLedgerRecord(candidate, classification, now) {
  const queueId = classification.sink === 'approved-queue.jsonl'
    ? `queue-${candidate.id.replace(/^ask-/, '')}`
    : null

  return {
    id: candidate.id,
    createdAt: candidate.createdAt ?? now.toISOString(),
    source: candidate.ledgerSource,
    sourcePath: candidate.sourcePath,
    title: truncate(candidate.title, 120),
    rawAskSummary: truncate(candidate.summary || candidate.title, 500),
    status: classification.ledgerStatus,
    statusReason: classification.reason,
    canonicalOwner: candidate.sourcePath,
    queueId,
    receiptPath: null,
    blockedBy: classification.ledgerStatus === 'blocked' ? classification.reason : null,
    updatedAt: now.toISOString(),
  }
}

function createSinkRecord(candidate, classification, activeLane, now) {
  if (!classification.sink) return null

  const base = {
    id: classification.sink === 'approved-queue.jsonl'
      ? `queue-${candidate.id.replace(/^ask-/, '')}`
      : candidate.id,
    requestId: candidate.id,
    source: candidate.ledgerSource,
    sourcePath: candidate.sourcePath,
    title: truncate(candidate.title, 140),
    rawAskSummary: truncate(candidate.summary || candidate.title, 700),
    classification: classification.builderClassification,
    status: classification.sink === 'approved-queue.jsonl' ? 'queued' : classification.ledgerStatus,
    statusReason: classification.reason,
    canonicalOwner: candidate.sourcePath,
    createdAt: candidate.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  }

  if (classification.sink === 'approved-queue.jsonl') {
    return {
      ...base,
      risk: riskFromPriority(candidate.metadata.priority),
      activeLane:
        classification.builderClassification === 'approved_v1_support' ? activeLane : null,
      dependencies: extractDependencies(candidate.text),
      dependenciesSatisfied: extractDependencies(candidate.text).length === 0,
      blockedBy: null,
    }
  }

  return base
}

function writePlan(context, planned) {
  const paths = {
    ledger: join(context.builderDir, 'request-ledger.jsonl'),
    'approved-queue.jsonl': join(context.builderDir, 'approved-queue.jsonl'),
    'parked-v2.jsonl': join(context.builderDir, 'parked-v2.jsonl'),
    'research-queue.jsonl': join(context.builderDir, 'research-queue.jsonl'),
    'blocked.jsonl': join(context.builderDir, 'blocked.jsonl'),
  }

  for (const item of planned) {
    appendJsonl(paths.ledger, item.ledgerRecord)
    if (item.classification.sink && item.sinkRecord) {
      appendJsonl(paths[item.classification.sink], item.sinkRecord)
    }
  }
}

function loadExistingKeys(context) {
  const files = [
    'request-ledger.jsonl',
    'approved-queue.jsonl',
    'parked-v2.jsonl',
    'research-queue.jsonl',
    'blocked.jsonl',
  ]

  const ids = new Set()
  const sourcePaths = new Set()

  for (const file of files) {
    const { records } = readJsonl(join(context.builderDir, file))
    for (const record of records) {
      if (record.id) ids.add(record.id)
      if (record.requestId) ids.add(record.requestId)
      if (record.sourcePath) sourcePaths.add(record.sourcePath)
    }
  }

  return { ids, sourcePaths }
}

function summarizePlan({
  context,
  candidates,
  duplicateSources,
  planned,
  deferred,
  activeLane,
  write,
  now,
  profile,
  maxApprovedQueueWrites,
  maxHardStopWrites,
}) {
  const byStatus = {}
  const bySink = {}
  const bySource = {}

  for (const item of planned) {
    byStatus[item.ledgerRecord.status] = (byStatus[item.ledgerRecord.status] ?? 0) + 1
    bySource[item.candidate.source] = (bySource[item.candidate.source] ?? 0) + 1
    const sink = item.classification.sink ?? 'ledger_only'
    bySink[sink] = (bySink[sink] ?? 0) + 1
  }

  return {
    status: write ? 'written' : 'dry_run',
    profile,
    generatedAt: now.toISOString(),
    activeLane,
    builderDir: slash(relative(context.root, context.builderDir)),
    scanned: candidates.length,
    skippedExisting: duplicateSources.length,
    newRecords: planned.length,
    deferred,
    maxApprovedQueueWrites,
    maxHardStopWrites,
    byStatus,
    bySink,
    bySource,
    examples: planned.slice(0, 10).map((item) => ({
      id: item.ledgerRecord.id,
      title: item.ledgerRecord.title,
      status: item.ledgerRecord.status,
      sink: item.classification.sink ?? 'ledger_only',
      sourcePath: item.ledgerRecord.sourcePath,
    })),
  }
}

function isV1Relevant(candidate, activeLane) {
  const text = `${candidate.title}\n${candidate.summary}\n${candidate.text}\n${activeLane ?? ''}`.toLowerCase()
  return V1_TERMS.some((term) => text.includes(term))
}

function parseMetadata(text) {
  const metadata = {}
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (frontmatterMatch) {
    Object.assign(metadata, parseKeyValueBlock(frontmatterMatch[1]))
  }

  const statusMatch = /\*\*Status:\*\*\s*([^\n\r]+)/i.exec(text)
  if (statusMatch && !metadata.status) metadata.status = cleanValue(statusMatch[1])

  const priorityMatch = /\*\*Priority:\*\*\s*([^\n\r]+)/i.exec(text)
  if (priorityMatch && !metadata.priority) metadata.priority = cleanValue(priorityMatch[1])

  const dependsMatch = /\*\*Depends on:\*\*\s*([^\n\r]+)/i.exec(text)
  if (dependsMatch && !metadata.depends_on) metadata.depends_on = cleanValue(dependsMatch[1])

  return metadata
}

function parseKeyValueBlock(block) {
  const result = {}
  for (const line of block.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_-]+):\s*(.*?)\s*$/.exec(line)
    if (!match) continue
    result[match[1]] = cleanValue(match[2])
  }
  return result
}

function cleanValue(value) {
  return String(value)
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+#.*$/g, '')
    .trim()
}

function normalizeStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, ' ')
    .trim()
}

function normalizePriority(priority) {
  const value = String(priority ?? '').toLowerCase()
  if (/\bp0\b|blocking|critical/.test(value)) return 'p0'
  if (/\bp1\b|high/.test(value)) return 'p1'
  if (/\bp2\b|medium/.test(value)) return 'p2'
  if (/\bp3\b|low/.test(value)) return 'p3'
  return 'unknown'
}

function riskFromPriority(priority) {
  const normalized = normalizePriority(priority)
  if (normalized === 'p0') return 'high'
  if (normalized === 'p1') return 'medium'
  if (normalized === 'p2') return 'medium'
  return 'low'
}

function extractDependencies(text) {
  const metadata = parseMetadata(text)
  const raw = metadata.depends_on ?? metadata.depends ?? ''
  const value = String(raw).trim()
  if (!value || value.toLowerCase() === 'none') return []
  return value
    .split(/[,;]/)
    .map((item) => item.replace(/`/g, '').trim())
    .filter(Boolean)
}

function extractTitle(text, sourcePath) {
  const titleLine = text.split(/\r?\n/).find((line) => /^#\s+/.test(line))
  if (titleLine) return titleLine.replace(/^#\s+/, '').trim()

  return basename(sourcePath)
    .replace(/\.[^.]+$/, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function extractSummary(text) {
  const withoutFrontmatter = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
  const lines = withoutFrontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('>'))

  const summary = lines.find((line) => !/^[-*]\s*$/.test(line)) ?? ''
  return truncate(summary.replace(/^[-*]\s+/, ''), 500)
}

function readSourceText(path) {
  const stat = statSync(path)
  if (stat.size > MAX_SOURCE_BYTES) {
    return readFileSync(path, 'utf8').slice(0, MAX_SOURCE_BYTES)
  }
  return readFileSync(path, 'utf8')
}

function walkFiles(root, extensions) {
  if (!existsSync(root)) return []

  const files = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(path, extensions))
      continue
    }

    if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(path)
    }
  }
  return files
}

function latestMatchingFile(root, suffix) {
  const files = walkFiles(root, ['.json']).filter((file) => basename(file).endsWith(suffix))
  files.sort()
  return files.at(-1) ?? null
}

function stableId(source, sourcePath) {
  const hash = createHash('sha256').update(`${source}:${sourcePath}`).digest('hex').slice(0, 16)
  return `ask-${hash}`
}

function truncate(value, maxLength) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

function slash(value) {
  return String(value).replace(/\\/g, '/')
}

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function runCli() {
  const context = createBuilderContext()
  const limitArg = getArg('limit')
  const maxApprovedArg = getArg('max-approved')
  const maxHardStopArg = getArg('max-hard-stops')
  const limit = limitArg === null ? null : Number.parseInt(limitArg, 10)
  const maxApprovedQueueWrites = maxApprovedArg === null
    ? null
    : Number.parseInt(maxApprovedArg, 10)
  const maxHardStopWrites = maxHardStopArg === null
    ? null
    : Number.parseInt(maxHardStopArg, 10)
  const summary = normalizeIntake({
    context,
    write: hasFlag('write'),
    limit: Number.isFinite(limit) ? limit : null,
    profile: getArg('profile', 'builder-gate'),
    includeNoisySources: hasFlag('include-noisy-sources'),
    maxApprovedQueueWrites: Number.isFinite(maxApprovedQueueWrites)
      ? maxApprovedQueueWrites
      : null,
    maxHardStopWrites: Number.isFinite(maxHardStopWrites)
      ? maxHardStopWrites
      : null,
  })

  console.log(JSON.stringify(summary, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli()
}
