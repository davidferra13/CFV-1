import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/db/admin'
import type { LaunchReadinessDecisionPacket } from '@/lib/validation/launch-readiness-decision-packet'
import type { LaunchReadinessEvidenceSnapshot } from '@/lib/validation/launch-readiness-evidence-snapshot'
import type { LaunchReadinessOperatorReviewRecord } from '@/lib/validation/launch-readiness-operator-review'

export type LaunchReadinessActivityEventType =
  | 'review_verified'
  | 'review_rejected'
  | 'signoff_created'
  | 'export_generated'

export type StoredLaunchReadinessOperatorReview = LaunchReadinessOperatorReviewRecord & {
  id: string
  reviewerId: string | null
  evidenceUrl: string | null
  checkLabel: string | null
  checkStatusAtReview: string | null
  checkNextStep: string | null
  evidenceSnapshot: LaunchReadinessEvidenceSnapshot | null
  evidenceFingerprint: string | null
  evidenceGeneratedAt: string | null
  createdAt: string | null
}

export type CreateLaunchReadinessOperatorReviewInput = {
  checkKey: string
  decision: 'verified' | 'rejected'
  reviewerUserId: string
  note?: string | null
  evidenceUrl?: string | null
  checkLabel?: string | null
  checkStatusAtReview?: string | null
  checkNextStep?: string | null
  evidenceSnapshot?: LaunchReadinessEvidenceSnapshot | null
  evidenceFingerprint?: string | null
  evidenceGeneratedAt?: string | null
}

export type StoredLaunchReadinessSignoff = {
  id: string
  signoffUserId: string
  signedAt: string | null
  generatedAt: string | null
  verifiedChecks: number
  totalChecks: number
  packetFilename: string
  packetContentType: string
  packetSha256: string
  note: string | null
  createdAt: string | null
}

export type CreateLaunchReadinessSignoffInput = {
  signoffUserId: string
  generatedAt: string
  verifiedChecks: number
  totalChecks: number
  packet: LaunchReadinessDecisionPacket
  note?: string | null
}

export type StoredLaunchReadinessActivityEvent = {
  id: string
  eventType: LaunchReadinessActivityEventType
  checkKey: string | null
  actorUserId: string | null
  occurredAt: string | null
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string | null
}

export type CreateLaunchReadinessActivityEventInput = {
  eventType: LaunchReadinessActivityEventType
  checkKey?: string | null
  actorUserId?: string | null
  message: string
  metadata?: Record<string, unknown> | null
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeSnapshot(value: unknown): LaunchReadinessEvidenceSnapshot | null {
  const object = normalizeObject(value)
  if (!object) return null

  return {
    key: normalizeString(object.key) ?? '',
    label: normalizeString(object.label) ?? '',
    status: normalizeString(object.status) ?? '',
    evidence: normalizeString(object.evidence) ?? '',
    nextStep: normalizeString(object.nextStep) ?? '',
    href: normalizeString(object.href),
    evidenceItems: Array.isArray(object.evidenceItems)
      ? object.evidenceItems
          .map((item) => {
            const itemObject = normalizeObject(item)
            if (!itemObject) return null

            return {
              label: normalizeString(itemObject.label) ?? '',
              value: normalizeString(itemObject.value) ?? '',
              source: normalizeString(itemObject.source) ?? '',
              href: normalizeString(itemObject.href),
            }
          })
          .filter((item): item is LaunchReadinessEvidenceSnapshot['evidenceItems'][number] =>
            Boolean(item)
          )
      : [],
  }
}

function packetHash(packet: LaunchReadinessDecisionPacket): string {
  return createHash('sha256').update(JSON.stringify(packet)).digest('hex')
}

function mapReviewRow(row: any): StoredLaunchReadinessOperatorReview {
  return {
    id: String(row.id),
    checkKey: String(row.check_key),
    decision: row.decision === 'verified' ? 'verified' : 'rejected',
    reviewerId: normalizeString(row.reviewer_user_id),
    reviewedAt: normalizeString(row.reviewed_at),
    note: normalizeString(row.note),
    evidenceUrl: normalizeString(row.evidence_url),
    checkLabel: normalizeString(row.check_label),
    checkStatusAtReview: normalizeString(row.check_status_at_review),
    checkNextStep: normalizeString(row.check_next_step),
    evidenceSnapshot: normalizeSnapshot(row.evidence_snapshot),
    evidenceFingerprint: normalizeString(row.evidence_fingerprint),
    evidenceGeneratedAt: normalizeString(row.evidence_generated_at),
    createdAt: normalizeString(row.created_at),
  }
}

function mapSignoffRow(row: any): StoredLaunchReadinessSignoff {
  return {
    id: String(row.id),
    signoffUserId: String(row.signoff_user_id),
    signedAt: normalizeString(row.signed_at),
    generatedAt: normalizeString(row.generated_at),
    verifiedChecks: Number(row.verified_checks),
    totalChecks: Number(row.total_checks),
    packetFilename: String(row.packet_filename),
    packetContentType: String(row.packet_content_type),
    packetSha256: String(row.packet_sha256),
    note: normalizeString(row.note),
    createdAt: normalizeString(row.created_at),
  }
}

function mapActivityRow(row: any): StoredLaunchReadinessActivityEvent {
  const eventType = String(row.event_type) as LaunchReadinessActivityEventType
  return {
    id: String(row.id),
    eventType,
    checkKey: normalizeString(row.check_key),
    actorUserId: normalizeString(row.actor_user_id),
    occurredAt: normalizeString(row.occurred_at),
    message: String(row.message),
    metadata: normalizeObject(row.metadata),
    createdAt: normalizeString(row.created_at),
  }
}

export async function listLaunchReadinessOperatorReviews(): Promise<
  StoredLaunchReadinessOperatorReview[]
> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('launch_readiness_operator_reviews')
    .select(
      [
        'id',
        'check_key',
        'decision',
        'reviewer_user_id',
        'reviewed_at',
        'note',
        'evidence_url',
        'check_label',
        'check_status_at_review',
        'check_next_step',
        'evidence_snapshot',
        'evidence_fingerprint',
        'evidence_generated_at',
        'created_at',
      ].join(', ')
    )
    .order('reviewed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error('Launch readiness query failed: operator reviews')
  }

  return (Array.isArray(data) ? data : []).map(mapReviewRow)
}

export async function createLaunchReadinessOperatorReview(
  input: CreateLaunchReadinessOperatorReviewInput
): Promise<StoredLaunchReadinessOperatorReview> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('launch_readiness_operator_reviews')
    .insert({
      check_key: input.checkKey,
      decision: input.decision,
      reviewer_user_id: input.reviewerUserId,
      note: normalizeString(input.note),
      evidence_url: normalizeString(input.evidenceUrl),
      check_label: normalizeString(input.checkLabel),
      check_status_at_review: normalizeString(input.checkStatusAtReview),
      check_next_step: normalizeString(input.checkNextStep),
      evidence_snapshot: input.evidenceSnapshot ?? null,
      evidence_fingerprint: normalizeString(input.evidenceFingerprint),
      evidence_generated_at: normalizeString(input.evidenceGeneratedAt),
    })
    .select(
      [
        'id',
        'check_key',
        'decision',
        'reviewer_user_id',
        'reviewed_at',
        'note',
        'evidence_url',
        'check_label',
        'check_status_at_review',
        'check_next_step',
        'evidence_snapshot',
        'evidence_fingerprint',
        'evidence_generated_at',
        'created_at',
      ].join(', ')
    )
    .single()

  if (error || !data) {
    throw new Error('Launch readiness review insert failed')
  }

  return mapReviewRow(data)
}

export async function listLaunchReadinessSignoffs(): Promise<StoredLaunchReadinessSignoff[]> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('launch_readiness_signoffs')
    .select(
      'id, signoff_user_id, signed_at, generated_at, verified_checks, total_checks, packet_filename, packet_content_type, packet_sha256, note, created_at'
    )
    .order('signed_at', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error('Launch readiness query failed: signoffs')
  }

  return (Array.isArray(data) ? data : []).map(mapSignoffRow)
}

export async function createLaunchReadinessSignoff(
  input: CreateLaunchReadinessSignoffInput
): Promise<StoredLaunchReadinessSignoff> {
  const db: any = createAdminClient()
  const contentType = 'text/markdown; charset=utf-8'
  const { data, error } = await db
    .from('launch_readiness_signoffs')
    .insert({
      signoff_user_id: input.signoffUserId,
      generated_at: input.generatedAt,
      verified_checks: input.verifiedChecks,
      total_checks: input.totalChecks,
      decision_packet: input.packet,
      packet_filename: input.packet.filename,
      packet_content_type: contentType,
      packet_sha256: packetHash(input.packet),
      note: normalizeString(input.note),
    })
    .select(
      'id, signoff_user_id, signed_at, generated_at, verified_checks, total_checks, packet_filename, packet_content_type, packet_sha256, note, created_at'
    )
    .single()

  if (error || !data) {
    throw new Error('Launch readiness signoff insert failed')
  }

  return mapSignoffRow(data)
}

export async function listLaunchReadinessActivityEvents(): Promise<
  StoredLaunchReadinessActivityEvent[]
> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('launch_readiness_activity_events')
    .select('id, event_type, check_key, actor_user_id, occurred_at, message, metadata, created_at')
    .order('occurred_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error('Launch readiness query failed: activity events')
  }

  return (Array.isArray(data) ? data : []).map(mapActivityRow)
}

export async function createLaunchReadinessActivityEvent(
  input: CreateLaunchReadinessActivityEventInput
): Promise<StoredLaunchReadinessActivityEvent> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('launch_readiness_activity_events')
    .insert({
      event_type: input.eventType,
      check_key: normalizeString(input.checkKey),
      actor_user_id: normalizeString(input.actorUserId),
      message: input.message.trim(),
      metadata: input.metadata ?? null,
    })
    .select('id, event_type, check_key, actor_user_id, occurred_at, message, metadata, created_at')
    .single()

  if (error || !data) {
    throw new Error('Launch readiness activity insert failed')
  }

  return mapActivityRow(data)
}
