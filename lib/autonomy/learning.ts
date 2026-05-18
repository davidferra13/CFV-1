import { createServerClient } from '@/lib/db/server'
import type { AutonomyDomain, LearningSignal, PromotionSuggestion } from '@/lib/autonomy/types'

type LearningRow = {
  domain: AutonomyDomain
  action_type: string
  outcome: string
  confidence_score: number | null
}

export async function recordLearningSignal(signal: LearningSignal): Promise<void> {
  const db: any = createServerClient()

  const { error } = await db.from('learning_signals').insert({
    tenant_id: signal.tenantId,
    autonomy_action_id: signal.actionId ?? null,
    approval_queue_id: signal.approvalId ?? null,
    domain: signal.domain,
    action_type: signal.actionType,
    outcome: signal.outcome,
    confidence_score: signal.confidenceScore,
    edited_fields: signal.editedFields ?? [],
    metadata: signal.metadata ?? {},
  })

  if (error) {
    throw new Error(`Failed to record autonomy learning signal: ${error.message}`)
  }
}

export async function getPromotionSuggestions(input: {
  tenantId: string
  threshold: number
  lookbackLimit?: number
}): Promise<PromotionSuggestion[]> {
  const db: any = createServerClient()
  const limit = input.lookbackLimit ?? 500

  const { data, error } = await db
    .from('learning_signals')
    .select('domain, action_type, outcome, confidence_score')
    .eq('tenant_id', input.tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to summarize autonomy learning signals: ${error.message}`)
  }

  return buildPromotionSuggestions({
    tenantId: input.tenantId,
    rows: (data ?? []) as LearningRow[],
    threshold: input.threshold,
  })
}

export function buildPromotionSuggestions(input: {
  tenantId: string
  rows: LearningRow[]
  threshold: number
}): PromotionSuggestion[] {
  const grouped = new Map<
    string,
    {
      domain: AutonomyDomain
      actionType: string
      approvals: number
      edits: number
      rejections: number
      confidenceTotal: number
      confidenceCount: number
    }
  >()

  for (const row of input.rows) {
    const key = `${row.domain}:${row.action_type}`
    const current = grouped.get(key) ?? {
      domain: row.domain,
      actionType: row.action_type,
      approvals: 0,
      edits: 0,
      rejections: 0,
      confidenceTotal: 0,
      confidenceCount: 0,
    }

    if (row.outcome === 'approved' || row.outcome === 'auto_executed') current.approvals += 1
    if (row.outcome === 'approved_with_edits') current.edits += 1
    if (row.outcome === 'rejected' || row.outcome === 'failed') current.rejections += 1

    if (typeof row.confidence_score === 'number') {
      current.confidenceTotal += row.confidence_score
      current.confidenceCount += 1
    }

    grouped.set(key, current)
  }

  const suggestions: PromotionSuggestion[] = []

  for (const item of grouped.values()) {
    const cleanApprovalCount = item.approvals
    const hasEnoughApprovals = cleanApprovalCount >= input.threshold
    const hasLowFriction = item.edits <= Math.max(1, Math.floor(cleanApprovalCount * 0.2))
    const hasLowRejections = item.rejections === 0

    if (!hasEnoughApprovals || !hasLowFriction || !hasLowRejections) continue

    const confidenceScore =
      item.confidenceCount > 0 ? item.confidenceTotal / item.confidenceCount : 0.85

    suggestions.push({
      tenantId: input.tenantId,
      domain: item.domain,
      actionType: item.actionType,
      suggestedMode: 'auto',
      approvalCount: cleanApprovalCount,
      editCount: item.edits,
      rejectionCount: item.rejections,
      confidenceScore,
      reason: `Approved ${cleanApprovalCount} times with ${item.edits} edits and no rejections.`,
    })
  }

  return suggestions
}
