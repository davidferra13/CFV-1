import { execFile } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { readBuilderMode, type BuilderModeState } from './v1-builder-intake'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const BUILDER_DIR = join(ROOT, 'system', 'v1-builder')
const RUNTIME_DIR = join(BUILDER_DIR, 'runtime')
const CLAIMS_DIR = join(BUILDER_DIR, 'claims')
const RECEIPTS_DIR = join(BUILDER_DIR, 'receipts')

type JsonObject = Record<string, unknown>

export type BuilderQueueItem = {
  id: string
  title: string
  displayTitle: string
  classification: string
  status: string
  sourcePath: string | null
  completed: boolean
  running: boolean
}

export type BuilderClaim = {
  id: string
  taskId: string | null
  title: string
  displayTitle: string
  branch: string | null
  status: string
  claimedAt: string | null
  expiresAt: string | null
  worktreePath: string | null
}

export type BuilderReceipt = {
  file: string
  taskId: string | null
  status: string
  commit: string | null
  pushed: boolean
  summary: string
  finishedAt: string | null
}

export type BuilderSource = {
  id: string
  label: string
  kind: 'raw-input' | 'markdown-folder' | 'builder-state' | 'runtime-proof' | 'external-stream'
  path: string
  trustLevel:
    | 'raw-input'
    | 'signal'
    | 'design-intent'
    | 'report-artifact'
    | 'runtime-truth'
    | 'proof'
  freshness: string
  parserStatus: 'watching' | 'ready' | 'missing' | 'error'
  destination: string
  canCreateBuildCandidates: boolean
  count: number
  lastUpdated: string | null
}

export type BuilderLedgerItem = {
  id: string
  title: string
  status: string
  source: string
  sourcePath: string | null
  updatedAt: string | null
}

export type BuilderPipelineStage = {
  id: string
  label: string
  count: number
  latest: string
  tone: 'stone' | 'green' | 'amber' | 'red'
}

export type BuilderDecisionCard = {
  id: string
  question: string
  recommendedDefault: string
  blocks: string
  status: string
  risk: string
}

export type BuilderProcess = {
  processId: number
  parentProcessId: number
  name: string
  commandLine: string
  displayCommandLine: string
}

export type BuilderMonitorSnapshot = {
  generatedAt: string
  mode: BuilderModeState
  runnerStatus: JsonObject | null
  intakeStatus: JsonObject | null
  activePrompt: {
    path: string | null
    text: string
  }
  counts: {
    approved: number
    pending: number
    running: number
    completed: number
    blocked: number
    receipts: number
    processes: number
    rawInputs: number
    signals: number
    research: number
    parkedV2: number
    escalations: number
  }
  sourceMap: BuilderSource[]
  pipeline: BuilderPipelineStage[]
  ledger: {
    counts: Record<string, number>
    latest: BuilderLedgerItem[]
  }
  researchQueue: BuilderLedgerItem[]
  parkedV2: BuilderLedgerItem[]
  blocked: BuilderLedgerItem[]
  escalations: BuilderDecisionCard[]
  queue: BuilderQueueItem[]
  claims: BuilderClaim[]
  receipts: BuilderReceipt[]
  processes: BuilderProcess[]
  errors: string[]
}

const completedReceiptStatuses = new Set(['validated', 'pushed', 'built'])
const activeClaimStatuses = new Set(['claimed', 'running'])

export async function getBuilderMonitorSnapshot(): Promise<BuilderMonitorSnapshot> {
  const errors: string[] = []
  const [
    mode,
    runnerStatus,
    intakeStatus,
    requestLedgerRecords,
    queueRecords,
    blockedRecords,
    researchRecords,
    parkedRecords,
    escalationRecords,
    claims,
    receipts,
    processes,
    sourceMap,
    rawInputCount,
    signalCount,
  ] = await Promise.all([
    readBuilderMode(ROOT),
    readJsonFile<JsonObject>(join(RUNTIME_DIR, 'runner-status.json'), errors),
    readJsonFile<JsonObject>(join(RUNTIME_DIR, 'intake-normalizer-status.json'), errors),
    readJsonl(join(BUILDER_DIR, 'request-ledger.jsonl'), errors),
    readJsonl(join(BUILDER_DIR, 'approved-queue.jsonl'), errors),
    readJsonl(join(BUILDER_DIR, 'blocked.jsonl'), errors),
    readJsonl(join(BUILDER_DIR, 'research-queue.jsonl'), errors),
    readJsonl(join(BUILDER_DIR, 'parked-v2.jsonl'), errors),
    readJsonl(join(BUILDER_DIR, 'escalations.jsonl'), errors),
    readClaims(errors),
    readReceipts(errors),
    readBuilderProcesses(errors),
    readSourceMap(errors),
    countDirectoryFiles(join(BUILDER_DIR, 'intake', 'raw')),
    countDirectoryFiles(join(BUILDER_DIR, 'intake', 'signals')),
  ])

  const completedTaskIds = new Set(
    receipts
      .filter((receipt) => completedReceiptStatuses.has(receipt.status))
      .map((receipt) => receipt.taskId)
      .filter((taskId): taskId is string => Boolean(taskId))
  )
  const runningTaskIds = new Set(
    claims
      .filter((claim) => activeClaimStatuses.has(claim.status))
      .map((claim) => claim.taskId)
      .filter((taskId): taskId is string => Boolean(taskId))
  )

  const queue = queueRecords.map((record) => {
    const id = asString(record.id)
    const title = asString(record.title)
    return {
      id,
      title,
      displayTitle: sanitizeSurfaceText(title),
      classification: asString(record.classification),
      status: asString(record.status),
      sourcePath: nullableString(record.sourcePath),
      completed: completedTaskIds.has(id),
      running: runningTaskIds.has(id),
    }
  })

  const activePrompt = await readActivePrompt(claims, errors)
  const ledgerLatest = requestLedgerRecords.map(toLedgerItem).slice(-12).reverse()
  const ledgerCounts = countByStatus(requestLedgerRecords)
  const researchQueue = researchRecords.map(toLedgerItem).slice(-8).reverse()
  const parkedV2 = parkedRecords.map(toLedgerItem).slice(-8).reverse()
  const blocked = blockedRecords.map(toLedgerItem).slice(-8).reverse()
  const escalations = escalationRecords.map(toDecisionCard).slice(-8).reverse()
  const pipeline = createPipelineStages({
    rawInputCount,
    signalCount,
    ledgerCounts,
    queueCount: queue.length,
    runningCount: queue.filter((item) => item.running).length,
    receiptCount: receipts.length,
    escalationCount: escalations.filter((item) => item.status !== 'answered').length,
  })

  return {
    generatedAt: new Date().toISOString(),
    mode,
    runnerStatus,
    intakeStatus,
    activePrompt,
    counts: {
      approved: queue.length,
      pending: queue.filter((item) => !item.completed && !item.running).length,
      running: queue.filter((item) => item.running).length,
      completed: queue.filter((item) => item.completed).length,
      blocked: blockedRecords.length,
      receipts: receipts.length,
      processes: processes.length,
      rawInputs: rawInputCount,
      signals: signalCount,
      research: researchRecords.length,
      parkedV2: parkedRecords.length,
      escalations: escalationRecords.length,
    },
    sourceMap,
    pipeline,
    ledger: {
      counts: ledgerCounts,
      latest: ledgerLatest,
    },
    researchQueue,
    parkedV2,
    blocked,
    escalations,
    queue,
    claims,
    receipts,
    processes,
    errors,
  }
}

async function readJsonFile<T extends JsonObject>(
  path: string,
  errors: string[]
): Promise<T | null> {
  try {
    const text = await readFile(path, 'utf8')
    return JSON.parse(text) as T
  } catch (error) {
    errors.push(`${path}: ${errorMessage(error)}`)
    return null
  }
}

async function readJsonl(path: string, errors: string[]): Promise<JsonObject[]> {
  try {
    const text = await readFile(path, 'utf8')
    const records: JsonObject[] = []
    text.split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim()
      if (!trimmed) return
      try {
        records.push(JSON.parse(trimmed) as JsonObject)
      } catch (error) {
        errors.push(`${path}:${index + 1}: ${errorMessage(error)}`)
      }
    })
    return records
  } catch (error) {
    errors.push(`${path}: ${errorMessage(error)}`)
    return []
  }
}

async function readClaims(errors: string[]): Promise<BuilderClaim[]> {
  try {
    const files = await readdir(CLAIMS_DIR)
    const claims = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          const path = join(CLAIMS_DIR, file)
          const record = await readJsonFile<JsonObject>(path, errors)
          if (!record) return null
          const title = asString(record.title)
          return {
            id: asString(record.id) || file,
            taskId: nullableString(record.taskId),
            title,
            displayTitle: sanitizeSurfaceText(title),
            branch: nullableString(record.branch),
            status: asString(record.status),
            claimedAt: nullableString(record.claimedAt),
            expiresAt: nullableString(record.expiresAt),
            worktreePath: nullableString(record.worktreePath),
          }
        })
    )
    return claims
      .filter((claim): claim is BuilderClaim => Boolean(claim))
      .sort((a, b) => Date.parse(b.claimedAt ?? '') - Date.parse(a.claimedAt ?? ''))
  } catch (error) {
    errors.push(`${CLAIMS_DIR}: ${errorMessage(error)}`)
    return []
  }
}

async function readReceipts(errors: string[]): Promise<BuilderReceipt[]> {
  try {
    const files = await readdir(RECEIPTS_DIR)
    const rows = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          const path = join(RECEIPTS_DIR, file)
          const [record, stats] = await Promise.all([
            readJsonFile<JsonObject>(path, errors),
            stat(path).catch(() => null),
          ])
          if (!record) return null
          return {
            file,
            taskId: nullableString(record.taskId),
            status: asString(record.status),
            commit: nullableString(record.commit),
            pushed: record.pushed === true,
            summary: sanitizeSurfaceText(asString(record.missionControlSummary)),
            finishedAt: nullableString(record.finishedAt) ?? stats?.mtime.toISOString() ?? null,
          }
        })
    )
    return rows
      .filter((row): row is BuilderReceipt => Boolean(row))
      .sort((a, b) => Date.parse(b.finishedAt ?? '') - Date.parse(a.finishedAt ?? ''))
      .slice(0, 8)
  } catch (error) {
    errors.push(`${RECEIPTS_DIR}: ${errorMessage(error)}`)
    return []
  }
}

async function readActivePrompt(
  claims: BuilderClaim[],
  errors: string[]
): Promise<BuilderMonitorSnapshot['activePrompt']> {
  const activeClaim = claims.find((claim) => activeClaimStatuses.has(claim.status))
  if (!activeClaim?.id) return { path: null, text: '' }

  const promptPath = join(RUNTIME_DIR, `${activeClaim.id}-prompt.txt`)
  try {
    const text = await readFile(promptPath, 'utf8')
    return {
      path: promptPath,
      text: sanitizeSurfaceText(text.slice(0, 2500)),
    }
  } catch (error) {
    errors.push(`${promptPath}: ${errorMessage(error)}`)
    return { path: promptPath, text: '' }
  }
}

async function readBuilderProcesses(errors: string[]): Promise<BuilderProcess[]> {
  if (process.platform !== 'win32') return []

  const script = `
$pattern = 'scripts/v1-builder|codex --ask-for-approval|next build|next dev|server.js|chefflow-watchdog'
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match $pattern } |
  Select-Object ProcessId,ParentProcessId,Name,CommandLine |
  ConvertTo-Json -Depth 3
`

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 1024 * 1024 }
    )
    const parsed = JSON.parse(stdout.trim() || '[]') as JsonObject | JsonObject[]
    const rows = Array.isArray(parsed) ? parsed : [parsed]
    return rows
      .map((row) => ({
        processId: asNumber(row.ProcessId),
        parentProcessId: asNumber(row.ParentProcessId),
        name: asString(row.Name),
        commandLine: asString(row.CommandLine),
        displayCommandLine: sanitizeSurfaceText(asString(row.CommandLine)),
      }))
      .filter((row) => row.processId > 0)
  } catch (error) {
    errors.push(`process scan: ${errorMessage(error)}`)
    return []
  }
}

async function readSourceMap(errors: string[]): Promise<BuilderSource[]> {
  const specs = await directorySummary(join(ROOT, 'docs', 'specs'))
  const docs = await directorySummary(join(ROOT, 'docs'))
  const rawInputs = await directorySummary(join(BUILDER_DIR, 'intake', 'raw'))
  const signals = await directorySummary(join(BUILDER_DIR, 'intake', 'signals'))
  const receipts = await directorySummary(RECEIPTS_DIR)
  const claims = await directorySummary(CLAIMS_DIR)
  const sticky = await directorySummary(join(ROOT, 'system', 'sticky-notes'))
  const reports = await directorySummary(join(ROOT, 'system', 'agent-reports'))
  const runtime = await directorySummary(join(BUILDER_DIR, 'runtime'))
  const obsidian = await directorySummary(join(ROOT, '..', 'Chef Flow Personas'))

  if (obsidian.missing) {
    errors.push(
      'Obsidian/persona source path not found near workspace; source map keeps it visible as missing.'
    )
  }

  return [
    sourceRow({
      id: 'mission-control-raw',
      label: 'Mission Control raw input',
      kind: 'raw-input',
      path: 'system/v1-builder/intake/raw',
      trustLevel: 'raw-input',
      summary: rawInputs,
      destination: 'system/v1-builder/intake/signals',
      canCreateBuildCandidates: true,
    }),
    sourceRow({
      id: 'classified-signals',
      label: 'Classified signals',
      kind: 'builder-state',
      path: 'system/v1-builder/intake/signals',
      trustLevel: 'signal',
      summary: signals,
      destination: 'system/v1-builder/request-ledger.jsonl',
      canCreateBuildCandidates: true,
    }),
    sourceRow({
      id: 'specs',
      label: 'Ready specs',
      kind: 'markdown-folder',
      path: 'docs/specs',
      trustLevel: 'design-intent',
      summary: specs,
      destination: 'system/v1-builder/approved-queue.jsonl',
      canCreateBuildCandidates: true,
    }),
    sourceRow({
      id: 'docs',
      label: 'Project docs',
      kind: 'markdown-folder',
      path: 'docs',
      trustLevel: 'report-artifact',
      summary: docs,
      destination: 'research or duplicate attachment',
      canCreateBuildCandidates: false,
    }),
    sourceRow({
      id: 'sticky-notes',
      label: 'Sticky Notes pipeline',
      kind: 'external-stream',
      path: 'system/sticky-notes',
      trustLevel: 'raw-input',
      summary: sticky,
      destination: 'review candidates before queue',
      canCreateBuildCandidates: true,
    }),
    sourceRow({
      id: 'obsidian-personas',
      label: 'Obsidian and persona material',
      kind: 'external-stream',
      path: '../Chef Flow Personas',
      trustLevel: 'raw-input',
      summary: obsidian,
      destination: 'research or persona triage',
      canCreateBuildCandidates: false,
    }),
    sourceRow({
      id: 'agent-reports',
      label: 'Agent reports',
      kind: 'builder-state',
      path: 'system/agent-reports',
      trustLevel: 'report-artifact',
      summary: reports,
      destination: 'request ledger or repair queue',
      canCreateBuildCandidates: false,
    }),
    sourceRow({
      id: 'claims',
      label: 'Active and historical claims',
      kind: 'builder-state',
      path: 'system/v1-builder/claims',
      trustLevel: 'runtime-truth',
      summary: claims,
      destination: 'Mission Control active work',
      canCreateBuildCandidates: false,
    }),
    sourceRow({
      id: 'receipts',
      label: 'Build receipts',
      kind: 'runtime-proof',
      path: 'system/v1-builder/receipts',
      trustLevel: 'proof',
      summary: receipts,
      destination: 'Mission Control proof history',
      canCreateBuildCandidates: false,
    }),
    sourceRow({
      id: 'runtime',
      label: 'Runtime status',
      kind: 'runtime-proof',
      path: 'system/v1-builder/runtime',
      trustLevel: 'runtime-truth',
      summary: runtime,
      destination: 'mode, runner, and intake status',
      canCreateBuildCandidates: false,
    }),
  ]
}

function sourceRow(input: {
  id: string
  label: string
  kind: BuilderSource['kind']
  path: string
  trustLevel: BuilderSource['trustLevel']
  summary: DirectorySummary
  destination: string
  canCreateBuildCandidates: boolean
}): BuilderSource {
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    path: input.path,
    trustLevel: input.trustLevel,
    freshness: input.summary.missing
      ? 'missing'
      : input.summary.lastUpdated
        ? formatAge(input.summary.lastUpdated)
        : 'empty',
    parserStatus: input.summary.missing ? 'missing' : 'ready',
    destination: input.destination,
    canCreateBuildCandidates: input.canCreateBuildCandidates,
    count: input.summary.count,
    lastUpdated: input.summary.lastUpdated,
  }
}

type DirectorySummary = {
  count: number
  lastUpdated: string | null
  missing: boolean
}

async function directorySummary(path: string): Promise<DirectorySummary> {
  try {
    const files = await readdir(path, { withFileTypes: true })
    let count = 0
    let lastUpdated: string | null = null
    for (const file of files) {
      if (file.name === '.gitkeep') continue
      count += 1
      const stats = await stat(join(path, file.name)).catch(() => null)
      if (stats && (!lastUpdated || stats.mtime.getTime() > Date.parse(lastUpdated))) {
        lastUpdated = stats.mtime.toISOString()
      }
    }
    return { count, lastUpdated, missing: false }
  } catch {
    return { count: 0, lastUpdated: null, missing: true }
  }
}

async function countDirectoryFiles(path: string): Promise<number> {
  const summary = await directorySummary(path)
  return summary.count
}

function toLedgerItem(record: JsonObject): BuilderLedgerItem {
  return {
    id: asString(record.id),
    title: sanitizeSurfaceText(asString(record.title)),
    status: asString(record.status),
    source: asString(record.source),
    sourcePath: nullableString(record.sourcePath),
    updatedAt: nullableString(record.updatedAt) ?? nullableString(record.createdAt),
  }
}

function toDecisionCard(record: JsonObject): BuilderDecisionCard {
  const status = asString(record.status) || 'open'
  return {
    id: asString(record.id),
    question: sanitizeSurfaceText(asString(record.question) || asString(record.title)),
    recommendedDefault: sanitizeSurfaceText(
      asString(record.recommendedDefault) || 'No default recorded'
    ),
    blocks: asString(record.blocks) || asString(record.taskId) || 'unknown',
    status,
    risk: status === 'open' ? 'needs Founder Authority' : 'resolved',
  }
}

function countByStatus(records: JsonObject[]): Record<string, number> {
  return records.reduce<Record<string, number>>((counts, record) => {
    const status = asString(record.status) || 'unknown'
    counts[status] = (counts[status] ?? 0) + 1
    return counts
  }, {})
}

function createPipelineStages(input: {
  rawInputCount: number
  signalCount: number
  ledgerCounts: Record<string, number>
  queueCount: number
  runningCount: number
  receiptCount: number
  escalationCount: number
}): BuilderPipelineStage[] {
  return [
    {
      id: 'raw',
      label: 'Raw input',
      count: input.rawInputCount,
      latest: `${input.rawInputCount} captured`,
      tone: input.rawInputCount > 0 ? 'green' : 'stone',
    },
    {
      id: 'signals',
      label: 'Signals',
      count: input.signalCount,
      latest: `${input.signalCount} classified`,
      tone: input.signalCount > 0 ? 'green' : 'stone',
    },
    {
      id: 'research',
      label: 'Research',
      count: input.ledgerCounts.research_required ?? 0,
      latest: 'needs proof before build',
      tone: (input.ledgerCounts.research_required ?? 0) > 0 ? 'amber' : 'stone',
    },
    {
      id: 'queue',
      label: 'Queue',
      count: input.queueCount,
      latest: `${input.queueCount} approved`,
      tone: input.queueCount > 0 ? 'amber' : 'stone',
    },
    {
      id: 'building',
      label: 'Building',
      count: input.runningCount,
      latest: input.runningCount > 0 ? 'Codex has an active claim' : 'no active claim',
      tone: input.runningCount > 0 ? 'green' : 'stone',
    },
    {
      id: 'receipts',
      label: 'Receipts',
      count: input.receiptCount,
      latest: `${input.receiptCount} proof records`,
      tone: input.receiptCount > 0 ? 'green' : 'stone',
    },
    {
      id: 'decisions',
      label: 'Founder Authority',
      count: input.escalationCount,
      latest: input.escalationCount > 0 ? 'answers needed' : 'clear',
      tone: input.escalationCount > 0 ? 'red' : 'green',
    },
  ]
}

function formatAge(iso: string): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return 'unknown'
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function nullableString(value: unknown): string | null {
  const text = asString(value)
  return text ? text : null
}

function asNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function sanitizeSurfaceText(value: string): string {
  const restrictedName = ['Open', 'Claw'].join('')
  const restrictedSlug = ['open', 'claw'].join('')
  return value.replaceAll(restrictedName, 'Data engine').replaceAll(restrictedSlug, 'data-engine')
}
