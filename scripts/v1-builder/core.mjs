import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

export const QUEUE_FILES = [
  'request-ledger.jsonl',
  'approved-queue.jsonl',
  'parked-v2.jsonl',
  'research-queue.jsonl',
  'blocked.jsonl',
  'escalations.jsonl',
  'overrides.jsonl',
]

export function createBuilderContext(root = ROOT) {
  const builderDir = join(root, 'system', 'v1-builder')
  return {
    root,
    builderDir,
    claimsDir: join(builderDir, 'claims'),
    receiptsDir: join(builderDir, 'receipts'),
    governorPath: join(root, 'docs', 'v1-v2-governor.md'),
  }
}

export function ensureBuilderStore(context = createBuilderContext()) {
  mkdirSync(context.builderDir, { recursive: true })
  mkdirSync(context.claimsDir, { recursive: true })
  mkdirSync(context.receiptsDir, { recursive: true })

  for (const file of QUEUE_FILES) {
    const path = join(context.builderDir, file)
    if (!existsSync(path)) {
      writeFileSync(path, '', 'utf8')
    }
  }
}

export function readJsonl(path) {
  if (!existsSync(path)) return { records: [], errors: [] }

  const records = []
  const errors = []
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    try {
      const record = JSON.parse(trimmed)
      records.push({ ...record, _line: index + 1 })
    } catch (error) {
      errors.push({
        line: index + 1,
        message: error instanceof Error ? error.message : String(error),
        raw: line,
      })
    }
  })

  return { records, errors }
}

export function appendJsonl(path, record) {
  const line = `${JSON.stringify(record)}\n`
  writeFileSync(path, line, { encoding: 'utf8', flag: 'a' })
}

export function readActiveLane(context = createBuilderContext()) {
  if (!existsSync(context.governorPath)) return null

  const text = readFileSync(context.governorPath, 'utf8')
  const sectionMatch = /## Current Active Lane\s+`([^`]+)`/m.exec(text)
  return sectionMatch?.[1] ?? null
}

export function loadApprovedQueue(context = createBuilderContext()) {
  return readJsonl(join(context.builderDir, 'approved-queue.jsonl'))
}

export function loadFreshClaims(context = createBuilderContext(), now = new Date()) {
  if (!existsSync(context.claimsDir)) return []

  const claims = []
  for (const file of readdirSync(context.claimsDir)) {
    if (!file.endsWith('.json')) continue

    const path = join(context.claimsDir, file)
    try {
      const claim = JSON.parse(readFileSync(path, 'utf8'))
      if (isFreshClaim(claim, now)) {
        claims.push({ ...claim, path })
      }
    } catch {
      claims.push({
        id: file,
        taskId: null,
        path,
        status: 'unreadable',
        fresh: true,
      })
    }
  }

  return claims
}

export function isFreshClaim(claim, now = new Date()) {
  if (claim.status && !['claimed', 'running'].includes(claim.status)) return false
  if (claim.expiresAt) return Date.parse(claim.expiresAt) > now.getTime()

  const claimedAt = Date.parse(claim.claimedAt ?? claim.createdAt ?? '')
  if (Number.isNaN(claimedAt)) return true

  const threeHoursMs = 3 * 60 * 60 * 1000
  return now.getTime() - claimedAt < threeHoursMs
}

export function selectNextTask(records, activeLane) {
  const eligible = records.filter((record) => isEligibleTask(record, activeLane))
  eligible.sort(compareTasks)
  return eligible[0] ?? null
}

export function isEligibleTask(task, activeLane) {
  if (task.status !== 'queued') return false
  if (!task.canonicalOwner) return false
  if (task.blockedBy) return false

  if (task.classification === 'approved_v1_blocker') return dependenciesSatisfied(task)

  if (task.classification === 'approved_v1_support') {
    return task.activeLane === activeLane && dependenciesSatisfied(task)
  }

  return false
}

function dependenciesSatisfied(task) {
  if (!Array.isArray(task.dependencies) || task.dependencies.length === 0) return true
  return task.dependenciesSatisfied === true
}

function compareTasks(a, b) {
  return (
    classificationRank(a.classification) - classificationRank(b.classification) ||
    riskRank(a.risk) - riskRank(b.risk) ||
    Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '')
  )
}

function classificationRank(classification) {
  if (classification === 'approved_v1_blocker') return 0
  if (classification === 'approved_v1_support') return 1
  return 9
}

function riskRank(risk) {
  if (risk === 'low') return 0
  if (risk === 'medium') return 1
  if (risk === 'high') return 2
  return 3
}

export function createClaim(task, context = createBuilderContext(), now = new Date()) {
  mkdirSync(context.claimsDir, { recursive: true })

  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const path = join(context.claimsDir, `${stamp}-${task.id}.json`)
  const claim = {
    id: `claim-${stamp}-${task.id}`,
    taskId: task.id,
    title: task.title,
    branch: `feature/v1-builder-${slugify(task.title ?? task.id)}`,
    classification: task.classification,
    canonicalOwner: task.canonicalOwner,
    status: 'claimed',
    claimedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
  }

  writeFileSync(path, `${JSON.stringify(claim, null, 2)}\n`, 'utf8')
  return { claim, path }
}

export function writeReceipt(receipt, context = createBuilderContext(), now = new Date()) {
  mkdirSync(context.receiptsDir, { recursive: true })

  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const taskId = receipt.taskId ?? 'manual'
  const path = join(context.receiptsDir, `${stamp}-${taskId}.json`)
  const completeReceipt = {
    taskId,
    branch: receipt.branch ?? null,
    classification: receipt.classification ?? null,
    canonicalOwner: receipt.canonicalOwner ?? null,
    status: receipt.status ?? 'blocked',
    startedAt: receipt.startedAt ?? null,
    finishedAt: receipt.finishedAt ?? now.toISOString(),
    touchedFiles: receipt.touchedFiles ?? [],
    validations: receipt.validations ?? [],
    blockedReason: receipt.blockedReason ?? null,
    commit: receipt.commit ?? null,
    pushed: receipt.pushed ?? false,
    missionControlSummary: receipt.missionControlSummary ?? '',
  }

  writeFileSync(path, `${JSON.stringify(completeReceipt, null, 2)}\n`, 'utf8')
  return { receipt: completeReceipt, path }
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'task'
}
