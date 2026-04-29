import { createAdminClient } from '@/lib/db/admin'
import type { LaunchReadinessOperatorReviewRecord } from '@/lib/validation/launch-readiness-operator-review'

export type StoredLaunchReadinessOperatorReview = LaunchReadinessOperatorReviewRecord & {
  id: string
  reviewerId: string | null
  evidenceUrl: string | null
  createdAt: string | null
}

export type CreateLaunchReadinessOperatorReviewInput = {
  checkKey: string
  decision: 'verified' | 'rejected'
  reviewerUserId: string
  note?: string | null
  evidenceUrl?: string | null
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
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
    createdAt: normalizeString(row.created_at),
  }
}

export async function listLaunchReadinessOperatorReviews(): Promise<
  StoredLaunchReadinessOperatorReview[]
> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('launch_readiness_operator_reviews')
    .select('id, check_key, decision, reviewer_user_id, reviewed_at, note, evidence_url, created_at')
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
    })
    .select('id, check_key, decision, reviewer_user_id, reviewed_at, note, evidence_url, created_at')
    .single()

  if (error || !data) {
    throw new Error('Launch readiness review insert failed')
  }

  return mapReviewRow(data)
}
