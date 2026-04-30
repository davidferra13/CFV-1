import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'

export type BuilderMode =
  | 'off'
  | 'watch'
  | 'governed_build'
  | 'pause_after_current'
  | 'emergency_stop'

export type BuilderModeState = {
  mode: BuilderMode
  label: string
  updatedAt: string
  reason: string
}

export type RawInputClassification =
  | 'approved_v1_blocker'
  | 'approved_v1_support'
  | 'parked_v2'
  | 'research_required'
  | 'duplicate_attach'
  | 'blocked'
  | 'rejected'

export type RawInputSignal = {
  id: string
  createdAt: string
  source: 'mission-control-raw-input'
  sourceLabel: string
  rawPath: string
  classification: RawInputClassification
  ledgerStatus:
    | 'queued'
    | 'blocked'
    | 'parked'
    | 'research_required'
    | 'duplicate_attach'
    | 'rejected'
  title: string
  summary: string
  reasons: string[]
  destination: string
  reviewRequired: boolean
}

const BUILDER_DIR = ['system', 'v1-builder']
const DEFAULT_MODE: BuilderModeState = {
  mode: 'watch',
  label: 'Watch',
  updatedAt: '',
  reason:
    'Default safe mode. Intake and monitoring are allowed, autonomous building is not enabled.',
}

const MODE_LABELS: Record<BuilderMode, string> = {
  off: 'Off',
  watch: 'Watch',
  governed_build: 'Governed Build',
  pause_after_current: 'Pause After Current',
  emergency_stop: 'Emergency Stop',
}

export const BUILDER_MODES = Object.keys(MODE_LABELS) as BuilderMode[]

export function builderRoot(root = process.cwd()) {
  return join(root, ...BUILDER_DIR)
}

export async function readBuilderMode(root = process.cwd()): Promise<BuilderModeState> {
  const path = join(builderRoot(root), 'runtime', 'mode.json')
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as Partial<BuilderModeState>
    const mode = isBuilderMode(parsed.mode) ? parsed.mode : DEFAULT_MODE.mode
    return {
      mode,
      label: MODE_LABELS[mode],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    }
  } catch {
    return DEFAULT_MODE
  }
}

export async function writeBuilderMode(
  mode: BuilderMode,
  reason: string,
  root = process.cwd()
): Promise<BuilderModeState> {
  if (!isBuilderMode(mode)) {
    throw new Error(`Unsupported builder mode: ${mode}`)
  }

  const state: BuilderModeState = {
    mode,
    label: MODE_LABELS[mode],
    updatedAt: new Date().toISOString(),
    reason:
      reason.trim() ||
      (mode === 'governed_build'
        ? 'Founder Authority enabled governed V1 queue draining.'
        : 'Mode changed from Mission Control.'),
  }

  const path = join(builderRoot(root), 'runtime', 'mode.json')
  await mkdir(join(builderRoot(root), 'runtime'), { recursive: true })
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  return state
}

export async function submitRawInput(
  input: {
    text: string
    sourceLabel?: string
  },
  root = process.cwd()
): Promise<RawInputSignal> {
  const text = input.text.trim()
  if (!text) throw new Error('Raw input is required.')
  if (text.length > 50000) throw new Error('Raw input is too large. Split it before submitting.')

  const now = new Date()
  const createdAt = now.toISOString()
  const id = `raw-${formatStamp(now)}-${hashText(text).slice(0, 10)}`
  const sourceLabel = input.sourceLabel?.trim() || 'Mission Control paste'
  const rawPath = join(builderRoot(root), 'intake', 'raw', `${id}.json`)
  const classification = classifyRawInput(text)
  const signal: RawInputSignal = {
    id,
    createdAt,
    source: 'mission-control-raw-input',
    sourceLabel,
    rawPath,
    classification: classification.classification,
    ledgerStatus: ledgerStatusFor(classification.classification),
    title: titleFromText(text),
    summary: summaryFromText(text),
    reasons: classification.reasons,
    destination: destinationFor(classification.classification),
    reviewRequired: classification.reviewRequired,
  }

  await mkdir(join(builderRoot(root), 'intake', 'raw'), { recursive: true })
  await mkdir(join(builderRoot(root), 'intake', 'signals'), { recursive: true })
  await writeFile(
    rawPath,
    `${JSON.stringify(
      {
        id,
        createdAt,
        source: signal.source,
        sourceLabel,
        text,
        contentHash: hashText(text),
      },
      null,
      2
    )}\n`,
    'utf8'
  )
  await writeFile(
    join(builderRoot(root), 'intake', 'signals', `${id}.json`),
    `${JSON.stringify(signal, null, 2)}\n`,
    'utf8'
  )

  await appendLedger(signal, root)
  if (
    signal.classification === 'approved_v1_blocker' ||
    signal.classification === 'approved_v1_support'
  ) {
    await appendApprovedQueue(signal, root)
  } else {
    await appendClassifiedSink(signal, root)
  }

  return signal
}

export function classifyRawInput(text: string): {
  classification: RawInputClassification
  reasons: string[]
  reviewRequired: boolean
} {
  const normalized = text.toLowerCase()
  const reasons: string[] = []

  if (
    /\b(drop table|truncate|delete from|push to main|deploy|drizzle-kit push)\b/.test(normalized)
  ) {
    return {
      classification: 'blocked',
      reasons: ['mentions an operation that requires explicit approval or a hard stop'],
      reviewRequired: true,
    }
  }

  if (/\b(generate recipes?|write recipes?|ai recipes?|auto.?fill recipes?)\b/.test(normalized)) {
    return {
      classification: 'rejected',
      reasons: ['requests restricted recipe generation behavior'],
      reviewRequired: true,
    }
  }

  if (/\bduplicate|already covered|same as\b/.test(normalized)) {
    return {
      classification: 'duplicate_attach',
      reasons: ['appears to attach to an existing surface'],
      reviewRequired: true,
    }
  }

  if (/\b(v2|later|future|after v1|phase 2)\b/.test(normalized)) {
    return {
      classification: 'parked_v2',
      reasons: ['explicitly describes future or V2 work'],
      reviewRequired: false,
    }
  }

  if (/\b(research|prove|evidence|validate|market|user feedback|unknown)\b/.test(normalized)) {
    return {
      classification: 'research_required',
      reasons: ['asks for proof or evidence before building'],
      reviewRequired: true,
    }
  }

  if (/\b(approved v1 blocker|approve v1 blocker|v1 blocker)\b/.test(normalized)) {
    return {
      classification: 'approved_v1_blocker',
      reasons: ['explicitly labels the item as a V1 blocker'],
      reviewRequired: false,
    }
  }

  if (/\b(approved v1 support|approve v1 support|v1 support)\b/.test(normalized)) {
    return {
      classification: 'approved_v1_support',
      reasons: ['explicitly labels the item as V1 support'],
      reviewRequired: false,
    }
  }

  if (
    /\b(pricing|quote|payment|ledger|tenant|auth|security|event spine|menu cost)\b/.test(normalized)
  ) {
    reasons.push('touches trust, money, safety, identity, or V1 completion')
    return {
      classification: 'research_required',
      reasons,
      reviewRequired: true,
    }
  }

  return {
    classification: 'research_required',
    reasons: ['raw input is signal only until classified against current code and V1 scope'],
    reviewRequired: true,
  }
}

function isBuilderMode(value: unknown): value is BuilderMode {
  return typeof value === 'string' && BUILDER_MODES.includes(value as BuilderMode)
}

function ledgerStatusFor(classification: RawInputClassification): RawInputSignal['ledgerStatus'] {
  if (classification === 'approved_v1_blocker' || classification === 'approved_v1_support')
    return 'queued'
  if (classification === 'parked_v2') return 'parked'
  return classification
}

function destinationFor(classification: RawInputClassification): string {
  if (classification === 'approved_v1_blocker' || classification === 'approved_v1_support') {
    return 'system/v1-builder/approved-queue.jsonl'
  }
  if (classification === 'parked_v2') return 'system/v1-builder/parked-v2.jsonl'
  if (classification === 'research_required') return 'system/v1-builder/research-queue.jsonl'
  if (classification === 'blocked') return 'system/v1-builder/blocked.jsonl'
  if (classification === 'duplicate_attach') return 'system/v1-builder/request-ledger.jsonl'
  return 'system/v1-builder/request-ledger.jsonl'
}

async function appendLedger(signal: RawInputSignal, root: string) {
  const path = join(builderRoot(root), 'request-ledger.jsonl')
  await appendJsonl(path, {
    id: `ask-${signal.id}`,
    createdAt: signal.createdAt,
    source: signal.source,
    sourceLabel: signal.sourceLabel,
    sourcePath: relativeBuilderPath(signal.rawPath, root),
    title: signal.title,
    rawAskSummary: signal.summary,
    status: signal.ledgerStatus,
    statusReason: signal.reasons.join('; '),
    canonicalOwner: signal.destination,
    queueId: signal.ledgerStatus === 'queued' ? `queue-${signal.id}` : null,
    receiptPath: null,
    blockedBy: signal.ledgerStatus === 'blocked' ? signal.reasons.join('; ') : null,
    updatedAt: signal.createdAt,
  })
}

async function appendApprovedQueue(signal: RawInputSignal, root: string) {
  await appendJsonl(join(builderRoot(root), 'approved-queue.jsonl'), {
    id: `queue-${signal.id}`,
    requestId: `ask-${signal.id}`,
    source: signal.source,
    sourceLabel: signal.sourceLabel,
    sourcePath: relativeBuilderPath(signal.rawPath, root),
    title: signal.title,
    rawAskSummary: signal.summary,
    classification: signal.classification,
    status: 'queued',
    statusReason: signal.reasons.join('; '),
    canonicalOwner: relativeBuilderPath(signal.rawPath, root),
    createdAt: signal.createdAt,
    updatedAt: signal.createdAt,
    risk: signal.classification === 'approved_v1_blocker' ? 'high' : 'medium',
    activeLane:
      signal.classification === 'approved_v1_support' ? 'V1 event spine stabilization' : null,
    dependencies: [],
    dependenciesSatisfied: true,
    blockedBy: null,
  })
}

async function appendClassifiedSink(signal: RawInputSignal, root: string) {
  const target =
    signal.classification === 'parked_v2'
      ? 'parked-v2.jsonl'
      : signal.classification === 'research_required'
        ? 'research-queue.jsonl'
        : signal.classification === 'blocked'
          ? 'blocked.jsonl'
          : null

  if (!target) return

  await appendJsonl(join(builderRoot(root), target), {
    id: `${signal.classification}-${signal.id}`,
    requestId: `ask-${signal.id}`,
    source: signal.source,
    sourceLabel: signal.sourceLabel,
    sourcePath: relativeBuilderPath(signal.rawPath, root),
    title: signal.title,
    rawAskSummary: signal.summary,
    classification: signal.classification,
    status:
      signal.classification === 'parked_v2'
        ? 'parked'
        : signal.classification === 'research_required'
          ? 'research_required'
          : 'blocked',
    statusReason: signal.reasons.join('; '),
    canonicalOwner: relativeBuilderPath(signal.rawPath, root),
    createdAt: signal.createdAt,
    updatedAt: signal.createdAt,
    blockedBy: signal.classification === 'blocked' ? signal.reasons.join('; ') : null,
  })
}

async function appendJsonl(path: string, record: unknown) {
  await mkdir(dirname(path), { recursive: true })
  const existing = await readFile(path, 'utf8').catch(() => '')
  await writeFile(path, `${existing}${JSON.stringify(record)}\n`, 'utf8')
}

function titleFromText(text: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
  return (firstLine || 'Mission Control raw input').slice(0, 120)
}

function summaryFromText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 280)
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function formatStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .toLowerCase()
}

function relativeBuilderPath(path: string, root: string): string {
  return path.replace(`${root}\\`, '').replace(`${root}/`, '').replace(/\\/g, '/')
}
