import type { AgentSafetyLevel } from '@/lib/ai/command-types'

export type RemyApprovalDecision = 'require_approval' | 'block'
export type RemyApprovalPolicySource = 'default' | 'tenant_override' | 'system_safety'

export interface RemyApprovalPolicyRecord {
  taskType: string
  decision: RemyApprovalDecision
  reason: string | null
  enabled: boolean
}

export type RemyApprovalPolicyMap = Map<string, RemyApprovalPolicyRecord>

export interface ResolvedRemyApprovalPolicy {
  taskType: string
  decision: RemyApprovalDecision
  reason: string | null
  source: RemyApprovalPolicySource
}

export function normalizeRemyTaskType(taskType: string): string {
  return taskType.trim().toLowerCase()
}

export function isRemyApprovalPolicyMissingTableError(err: unknown): boolean {
  const rec = err as Record<string, unknown> | null
  const code = typeof rec?.code === 'string' ? rec.code : null
  const message = typeof rec?.message === 'string' ? rec.message : ''
  return code === '42P01' || message.includes('remy_approval_policies')
}

export function defaultRemyDecisionForSafety(safety: AgentSafetyLevel): RemyApprovalDecision {
  if (safety === 'restricted') return 'block'
  return 'require_approval'
}

export function resolveRemyApprovalDecision(input: {
  taskType: string
  safety: AgentSafetyLevel
  policyMap: RemyApprovalPolicyMap
}): ResolvedRemyApprovalPolicy {
  const normalized = normalizeRemyTaskType(input.taskType)

  // System safety is absolute.
  if (input.safety === 'restricted') {
    return {
      taskType: normalized,
      decision: 'block',
      reason: 'This action is restricted and cannot be performed by Remy.',
      source: 'system_safety',
    }
  }

  const override = input.policyMap.get(normalized)
  if (override && override.enabled) {
    return {
      taskType: normalized,
      decision: override.decision,
      reason: override.reason,
      source: 'tenant_override',
    }
  }

  return {
    taskType: normalized,
    decision: defaultRemyDecisionForSafety(input.safety),
    reason: null,
    source: 'default',
  }
}

export const remyApprovalPolicyInternals = {
  normalizeTaskType: normalizeRemyTaskType,
  defaultDecisionForSafety: defaultRemyDecisionForSafety,
  isMissingTableError: isRemyApprovalPolicyMissingTableError,
}
