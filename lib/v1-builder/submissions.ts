import { appendJsonl, readJsonl, resolveBuilderPath } from './store'
import {
  queueClassificationSchema,
  queueRecordSchema,
  queueSourceSchema,
  type QueueClassification,
  type QueueRecord,
  type QueueSource,
} from './types'

export type SubmitInput = {
  id?: string
  title: string
  reason: string
  classification?: QueueClassification
  source?: QueueSource
  sourcePath?: string | null
  canonicalOwner?: string | null
  activeLane?: string | null
  dependencies?: string[]
  risk?: QueueRecord['risk']
  pricingRelevant?: boolean
  overrideId?: string | null
  v1GovernorApproved?: boolean
  createdAt?: Date
}

export type PromoteInput = {
  fromId: string
  classification: QueueClassification
  reason?: string
  canonicalOwner?: string | null
  activeLane?: string | null
  risk?: QueueRecord['risk']
  pricingRelevant?: boolean
  overrideId?: string | null
  v1GovernorApproved?: boolean
  createdAt?: Date
}

const CLI_ALLOWED_CLASSIFICATIONS: QueueClassification[] = [
  'approved_v1_blocker',
  'approved_v1_support',
  'research_required',
  'parked_v2',
  'blocked',
]

export function targetFileForClassification(classification: QueueClassification) {
  if (classification === 'approved_v1_blocker' || classification === 'approved_v1_support') {
    return 'approved-queue.jsonl'
  }
  if (classification === 'research_required') return 'research-queue.jsonl'
  if (classification === 'parked_v2') return 'parked-v2.jsonl'
  if (classification === 'blocked') return 'blocked.jsonl'
  throw new Error(`Classification is not a submit target: ${classification}`)
}

export function assertSubmitAllowed(classification: QueueClassification, v1GovernorApproved = false) {
  if (!CLI_ALLOWED_CLASSIFICATIONS.includes(classification)) {
    throw new Error(`Unsupported submit classification: ${classification}`)
  }

  if (
    (classification === 'approved_v1_blocker' || classification === 'approved_v1_support') &&
    !v1GovernorApproved
  ) {
    throw new Error('Approved V1 submissions require --v1-governor-approved')
  }
}

export function buildQueueRecord(input: SubmitInput): QueueRecord {
  const classification = queueClassificationSchema.parse(input.classification ?? 'research_required')
  assertSubmitAllowed(classification, input.v1GovernorApproved)

  const source = queueSourceSchema.parse(input.source ?? 'developer')
  const createdAt = input.createdAt ?? new Date()
  const id = input.id ?? generateQueueId(createdAt, input.title)
  const activeLane = input.activeLane ?? (classification === 'approved_v1_support' ? 'pricing-reliability' : null)

  return queueRecordSchema.parse({
    id,
    createdAt: createdAt.toISOString(),
    source,
    sourcePath: input.sourcePath ?? null,
    classification,
    activeLane,
    title: input.title.trim(),
    reason: input.reason.trim(),
    canonicalOwner: input.canonicalOwner ?? null,
    dependencies: input.dependencies ?? [],
    risk: input.risk ?? 'medium',
    status: 'queued',
    pricingRelevant: input.pricingRelevant ?? false,
    overrideId: input.overrideId ?? null,
  })
}

export async function submitQueueRecord(input: SubmitInput, root = process.cwd()) {
  const record = buildQueueRecord(input)
  const path = resolveBuilderPath(targetFileForClassification(record.classification), root)
  await appendJsonl(path, queueRecordSchema, record)
  return { path, record }
}

export async function promoteQueueRecord(input: PromoteInput, root = process.cwd()) {
  const sourceRecord = await findQueueRecord(input.fromId, root)
  if (!sourceRecord) {
    throw new Error(`No queue record found for promotion: ${input.fromId}`)
  }

  return submitQueueRecord({
    id: generateQueueId(input.createdAt ?? new Date(), sourceRecord.title),
    title: sourceRecord.title,
    reason: input.reason ?? sourceRecord.reason,
    classification: input.classification,
    source: 'governor',
    sourcePath: sourceRecord.sourcePath ?? `system/v1-builder/${input.fromId}`,
    canonicalOwner: input.canonicalOwner ?? sourceRecord.canonicalOwner,
    activeLane: input.activeLane ?? sourceRecord.activeLane,
    dependencies: sourceRecord.dependencies,
    risk: input.risk ?? sourceRecord.risk,
    pricingRelevant: input.pricingRelevant ?? sourceRecord.pricingRelevant,
    overrideId: input.overrideId ?? sourceRecord.overrideId,
    v1GovernorApproved: input.v1GovernorApproved,
    createdAt: input.createdAt,
  }, root)
}

export async function findQueueRecord(id: string, root = process.cwd()) {
  const files = [
    'approved-queue.jsonl',
    'research-queue.jsonl',
    'parked-v2.jsonl',
    'blocked.jsonl',
  ]

  for (const file of files) {
    const result = await readJsonl(resolveBuilderPath(file, root), queueRecordSchema)
    if (!result.ok) {
      throw new Error(result.errors.join('; '))
    }
    const found = result.records.find((record) => record.id === id)
    if (found) return found
  }

  return null
}

export function generateQueueId(date: Date, title: string) {
  const stamp = date.toISOString().slice(0, 19).replace(/[-:T]/g, '')
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'task'
  return `v1-${stamp}-${slug}`
}
