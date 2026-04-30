import { z } from 'zod'

export const queueSourceSchema = z.enum([
  'spec',
  'sticky-note',
  '3977',
  'persona-synthesis',
  'developer',
  'governor',
])

export const queueClassificationSchema = z.enum([
  'approved_v1_blocker',
  'approved_v1_support',
  'parked_v2',
  'research_required',
  'duplicate_attach',
  'blocked',
  'rejected',
])

export const queueStatusSchema = z.enum(['queued', 'claimed', 'blocked', 'built', 'validated', 'cancelled'])

export const queueRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  source: queueSourceSchema,
  sourcePath: z.string().nullable(),
  classification: queueClassificationSchema,
  activeLane: z.string().nullable(),
  title: z.string().min(1),
  reason: z.string().min(1),
  canonicalOwner: z.string().nullable(),
  dependencies: z.array(z.string()),
  risk: z.enum(['low', 'medium', 'high']),
  status: queueStatusSchema,
  pricingRelevant: z.boolean(),
  overrideId: z.string().nullable(),
})

export const claimStatusSchema = z.enum(['claimed', 'released', 'validated', 'blocked'])

export const claimRecordSchema = z.object({
  taskId: z.string().min(1),
  claimedAt: z.string().datetime({ offset: true }),
  branch: z.string().min(1),
  agent: z.string().min(1),
  status: claimStatusSchema,
  expiresAt: z.string().datetime({ offset: true }),
})

export const receiptStatusSchema = z.enum([
  'validated',
  'blocked',
  'failed',
  'push_failed',
  'partial',
])

export const validationRecordSchema = z.object({
  command: z.string().min(1),
  ok: z.boolean(),
  summary: z.string().min(1),
})

export const receiptRecordSchema = z.object({
  taskId: z.string().min(1),
  branch: z.string().min(1),
  status: receiptStatusSchema,
  startedAt: z.string().datetime({ offset: true }),
  finishedAt: z.string().datetime({ offset: true }),
  touchedFiles: z.array(z.string()),
  validations: z.array(validationRecordSchema),
  commit: z.string().nullable(),
  pushed: z.boolean(),
  blockedReason: z.string().nullable(),
  missionControlSummary: z.string().min(1),
})

export const escalationRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  taskId: z.string().nullable(),
  question: z.string().min(1),
  whyCodexCannotDecide: z.string().min(1),
  recommendedDefault: z.string().min(1),
  blocks: z.enum(['build', 'validation', 'shipping', 'scope', 'none']),
  status: z.enum(['open', 'answered', 'closed']),
  answer: z.string().nullable(),
})

export const pricingReadinessSchema = z.object({
  status: z.enum(['blocked', 'unknown', 'improving']),
  message: z.string().min(1),
  evidence: z.array(z.string()),
})

export type QueueRecord = z.infer<typeof queueRecordSchema>
export type QueueClassification = z.infer<typeof queueClassificationSchema>
export type ClaimRecord = z.infer<typeof claimRecordSchema>
export type ReceiptRecord = z.infer<typeof receiptRecordSchema>
export type EscalationRecord = z.infer<typeof escalationRecordSchema>
export type PricingReadiness = z.infer<typeof pricingReadinessSchema>

export type JsonlReadResult<T> =
  | { ok: true; records: T[]; errors: [] }
  | { ok: false; records: T[]; errors: string[] }

export type QueueCounts = {
  v1Blockers: number
  v1Support: number
  blocked: number
  research: number
  parkedV2: number
  escalations: number
}

export type IntakeSummary = {
  stickyNotes: string
  inbox3977: string
}

export type CockpitSummary = {
  ok: boolean
  generatedAt: string
  activeTask: QueueRecord | null
  activeClaim: ClaimRecord | null
  queueCounts: QueueCounts
  latestReceipts: ReceiptRecord[]
  openEscalations: EscalationRecord[]
  pricingReadiness: PricingReadiness
  intake: IntakeSummary
  errors: string[]
}
