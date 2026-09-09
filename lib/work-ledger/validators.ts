import { z } from 'zod'

export const WORK_ACTORS = [
  'david_active',
  'david_supervisory',
  'ai_agent_runtime',
  'staff',
  'system',
] as const
export const WORK_ACTIVITIES = [
  'lead_generation',
  'client_communication',
  'proposal_pricing',
  'menu_planning',
  'event_planning',
  'shopping_sourcing',
  'prep',
  'packing_loading',
  'travel',
  'setup',
  'service',
  'cleanup_reset',
  'event_closeout',
  'bookkeeping_finance',
  'marketing_content',
  'website_code',
  'automation_agent_direction',
  'business_strategy',
  'professional_development',
  'other_business',
] as const

const timestamp = z.string().datetime({ offset: true })
function collectMetadataKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectMetadataKeys)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, nested]) => [key, ...collectMetadataKeys(nested)])
}

const metadata = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  const serialized = JSON.stringify(value)
  const forbidden = /(body|content|keystroke|clipboard|password|credential|screenshot)/i
  if (serialized.length > 8_000)
    context.addIssue({ code: 'custom', message: 'Metadata exceeds 8 KB' })
  for (const key of collectMetadataKeys(value)) {
    if (forbidden.test(key))
      context.addIssue({ code: 'custom', message: `Forbidden metadata key: ${key}` })
  }
})

export const WorkEvidenceSchema = z
  .object({
    source_type: z.string().min(1).max(64),
    source_account: z.string().max(200).nullable().optional(),
    source_record_id: z.string().min(1).max(500),
    source_hash: z.string().min(16).max(128),
    source_created_at: timestamp.nullable().optional(),
    interval_start: timestamp.nullable().optional(),
    interval_end: timestamp.nullable().optional(),
    actor_type: z.enum(WORK_ACTORS),
    actor_id: z.string().max(200).nullable().optional(),
    event_id: z.string().uuid().nullable().optional(),
    client_id: z.string().uuid().nullable().optional(),
    project_key: z.string().max(200).nullable().optional(),
    activity_hint: z.enum(WORK_ACTIVITIES).nullable().optional(),
    signal_type: z.string().min(1).max(64),
    signal_summary: z.string().min(1).max(500),
    minimal_metadata: metadata.default({}),
    privacy_class: z.enum(['business', 'sensitive_business', 'coverage_gap']),
  })
  .superRefine((value, context) => {
    if (
      value.interval_start &&
      value.interval_end &&
      Date.parse(value.interval_end) < Date.parse(value.interval_start)
    ) {
      context.addIssue({ code: 'custom', message: 'interval_end must not precede interval_start' })
    }
  })

export const WorkEvidenceBatchSchema = z.object({
  evidence: z.array(WorkEvidenceSchema).min(1).max(100),
})
export const ReconstructSchema = z
  .object({
    start_at: timestamp,
    end_at: timestamp,
  })
  .refine((value) => value.end_at >= value.start_at, {
    message: 'end_at must not precede start_at',
  })

export const ManualClockInSchema = z.object({
  actor_type: z.enum(['david_active', 'david_supervisory']),
  activity_type: z.enum(WORK_ACTIVITIES),
  event_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  project_key: z.string().max(200).nullable().optional(),
  summary: z.string().min(1).max(500),
})

export const ReviewSessionSchema = z.object({
  session_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().min(3).max(500),
})

export const CorrectSessionSchema = z.object({
  session_id: z.string().uuid(),
  activity_type: z.enum(WORK_ACTIVITIES),
  started_at: timestamp.nullable(),
  ended_at: timestamp.nullable(),
  duration_minutes: z.number().int().nonnegative().nullable(),
  reason: z.string().min(3).max(500),
})

export const SplitSessionSchema = z.object({
  session_id: z.string().uuid(),
  split_at: timestamp,
  reason: z.string().min(3).max(500),
})

export const MergeSessionsSchema = z
  .object({
    session_ids: z.array(z.string().uuid()).length(2),
    reason: z.string().min(3).max(500),
  })
  .refine((value) => new Set(value.session_ids).size === 2, { message: 'Select two sessions' })

export type WorkEvidencePayload = z.infer<typeof WorkEvidenceSchema>
export type ManualClockInInput = z.infer<typeof ManualClockInSchema>
export type ReviewSessionInput = z.infer<typeof ReviewSessionSchema>
