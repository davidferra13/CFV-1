'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ensureAgentActionsRegistered } from '@/lib/ai/agent-actions'
import { listAgentActions } from '@/lib/ai/agent-registry'
import { getTaskName } from '@/lib/ai/command-task-descriptions'
import type { AgentSafetyLevel } from '@/lib/ai/command-types'
import {
  type RemyApprovalDecision,
  type RemyApprovalPolicyRecord,
  type RemyApprovalPolicyMap,
  normalizeRemyTaskType,
  defaultRemyDecisionForSafety,
  isRemyApprovalPolicyMissingTableError,
} from '@/lib/ai/remy-approval-policy-core'
export type {
  RemyApprovalDecision,
  RemyApprovalPolicyRecord,
  RemyApprovalPolicyMap,
  RemyApprovalPolicySource,
  ResolvedRemyApprovalPolicy,
} from '@/lib/ai/remy-approval-policy-core'

export interface RemyApprovalPolicyTarget {
  taskType: string
  name: string
  safety: AgentSafetyLevel
  defaultDecision: RemyApprovalDecision
  source: 'agent' | 'legacy'
}

const LEGACY_POLICY_TARGETS: Array<{
  taskType: string
  name: string
  safety: AgentSafetyLevel
}> = [
  {
    taskType: 'event.create_draft',
    name: getTaskName('event.create_draft'),
    safety: 'significant',
  },
]

interface RawPolicyRow {
  task_type: string
  decision: RemyApprovalDecision
  reason: string | null
  enabled: boolean
}

export async function getTenantRemyApprovalPolicyMap(
  tenantId: string
): Promise<RemyApprovalPolicyMap> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_approval_policies')
    .select('task_type, decision, reason, enabled')
    .eq('tenant_id', tenantId)

  if (error) {
    // Backward compatibility during rollout before migration is applied.
    if (isRemyApprovalPolicyMissingTableError(error)) {
      console.warn('[remy-approval-policy] remy_approval_policies table missing; using defaults')
      return new Map()
    }
    throw new Error(`Failed to load Remy approval policies: ${error.message}`)
  }

  const map: RemyApprovalPolicyMap = new Map()
  for (const row of (data ?? []) as RawPolicyRow[]) {
    const normalized = normalizeRemyTaskType(row.task_type)
    map.set(normalized, {
      taskType: normalized,
      decision: row.decision,
      reason: row.reason ?? null,
      enabled: Boolean(row.enabled),
    })
  }
  return map
}

export async function listRemyApprovalPolicies(): Promise<RemyApprovalPolicyRecord[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const map = await getTenantRemyApprovalPolicyMap(tenantId)
  return [...map.values()].sort((a, b) => a.taskType.localeCompare(b.taskType))
}

export async function upsertRemyApprovalPolicy(input: {
  taskType: string
  decision: RemyApprovalDecision
  reason?: string | null
  enabled?: boolean
}): Promise<RemyApprovalPolicyRecord> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const taskType = normalizeRemyTaskType(input.taskType)
  const enabled = input.enabled ?? true
  const reason = input.reason?.trim() ? input.reason.trim() : null

  const db: any = createServerClient()
  const payload = {
    tenant_id: tenantId,
    task_type: taskType,
    decision: input.decision,
    reason,
    enabled,
    created_by_auth_user_id: user.id,
    updated_by_auth_user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('remy_approval_policies')
    .upsert(payload, { onConflict: 'tenant_id,task_type' })
    .select('task_type, decision, reason, enabled')
    .single()

  if (error) {
    throw new Error(`Failed to upsert Remy approval policy: ${error.message}`)
  }

  return {
    taskType: data.task_type as string,
    decision: data.decision as RemyApprovalDecision,
    reason: (data.reason as string | null) ?? null,
    enabled: Boolean(data.enabled),
  }
}

export async function deleteRemyApprovalPolicy(taskType: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const normalized = normalizeRemyTaskType(taskType)

  const db: any = createServerClient()
  const { error } = await db
    .from('remy_approval_policies')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('task_type', normalized)

  if (error) {
    throw new Error(`Failed to delete Remy approval policy: ${error.message}`)
  }
}

export async function listRemyApprovalPolicyTargets(): Promise<RemyApprovalPolicyTarget[]> {
  ensureAgentActionsRegistered()
  const targets = new Map<string, RemyApprovalPolicyTarget>()

  for (const action of listAgentActions()) {
    const taskType = normalizeRemyTaskType(action.taskType)
    targets.set(taskType, {
      taskType,
      name: action.name,
      safety: action.safety,
      defaultDecision: defaultRemyDecisionForSafety(action.safety),
      source: 'agent',
    })
  }

  for (const legacy of LEGACY_POLICY_TARGETS) {
    const taskType = normalizeRemyTaskType(legacy.taskType)
    if (targets.has(taskType)) continue
    targets.set(taskType, {
      taskType,
      name: legacy.name,
      safety: legacy.safety,
      defaultDecision: defaultRemyDecisionForSafety(legacy.safety),
      source: 'legacy',
    })
  }

  return [...targets.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name)
    if (byName !== 0) return byName
    return a.taskType.localeCompare(b.taskType)
  })
}
