import {
  getClientKnowledgeContract,
  type ClientKnowledgeFieldKey,
  type ClientKnowledgeSyncTarget,
} from '@/lib/clients/client-knowledge-contract'

export type ClientSyncActor = 'client' | 'chef' | 'system'

export type ClientSyncTrigger =
  | 'client_profile_update'
  | 'chef_client_update'
  | 'booking_intake'
  | 'hub_guest_update'
  | 'system_reconciliation'

export type ClientSyncStepStatus = 'required' | 'non_blocking'

export interface ClientSyncStep {
  target: ClientKnowledgeSyncTarget
  status: ClientSyncStepStatus
  reason: string
}

export interface ClientSyncPlanInput {
  field: ClientKnowledgeFieldKey
  actor: ClientSyncActor
  trigger: ClientSyncTrigger
  changed: boolean
}

export interface ClientSyncPlan {
  field: ClientKnowledgeFieldKey
  trigger: ClientSyncTrigger
  actor: ClientSyncActor
  changed: boolean
  safetyCritical: boolean
  steps: ClientSyncStep[]
  nextStep: string
}

const REQUIRED_TARGETS = new Set<ClientKnowledgeSyncTarget>([
  'client_profile',
  'chef_client_profile',
  'active_events',
  'menu_safety',
  'ledger',
])

const TARGET_REASONS: Record<ClientKnowledgeSyncTarget, string> = {
  client_profile: 'Keep the client-owned profile source current.',
  chef_client_profile: 'Keep chef-facing client profile surfaces aligned.',
  active_events: 'Propagate event-scoped facts to active events that depend on them.',
  menu_safety: 'Recheck menu safety when dietary or operational constraints change.',
  remy_context_cache: 'Invalidate cached assistant context so answers use current facts.',
  client_dashboard: 'Refresh client dashboard widgets that summarize profile and work state.',
  notifications: 'Notify the chef or client when the change affects follow-through.',
  ledger: 'Preserve ledger-first payment and balance truth.',
  loyalty: 'Refresh loyalty state derived from client activity.',
  dinner_circle: 'Keep Dinner Circle relationship and guest planning state aligned.',
  audit_log: 'Record sensitive or safety-critical changes for later review.',
}

export function buildClientSyncPlan(input: ClientSyncPlanInput): ClientSyncPlan {
  const contract = getClientKnowledgeContract(input.field)
  const steps = input.changed
    ? contract.syncTargets.map((target) => ({
        target,
        status: getStepStatus(target),
        reason: TARGET_REASONS[target],
      }))
    : []

  return {
    field: input.field,
    trigger: input.trigger,
    actor: input.actor,
    changed: input.changed,
    safetyCritical: contract.safetyCritical,
    steps,
    nextStep: getNextStep(contract.safetyCritical, steps),
  }
}

export function buildClientSyncPlans(inputs: ClientSyncPlanInput[]): ClientSyncPlan[] {
  return inputs.map(buildClientSyncPlan)
}

export function getRequiredClientSyncTargets(
  field: ClientKnowledgeFieldKey
): ClientKnowledgeSyncTarget[] {
  return buildClientSyncPlan({
    field,
    actor: 'system',
    trigger: 'system_reconciliation',
    changed: true,
  })
    .steps.filter((step) => step.status === 'required')
    .map((step) => step.target)
}

export function summarizeClientSyncPlans(plans: ClientSyncPlan[]): {
  changedFieldCount: number
  requiredStepCount: number
  nonBlockingStepCount: number
  safetyCriticalFieldCount: number
  nextStep: string
} {
  const changedPlans = plans.filter((plan) => plan.changed)
  const steps = changedPlans.flatMap((plan) => plan.steps)
  const requiredStepCount = steps.filter((step) => step.status === 'required').length
  const nonBlockingStepCount = steps.filter((step) => step.status === 'non_blocking').length
  const safetyCriticalFieldCount = changedPlans.filter((plan) => plan.safetyCritical).length

  return {
    changedFieldCount: changedPlans.length,
    requiredStepCount,
    nonBlockingStepCount,
    safetyCriticalFieldCount,
    nextStep:
      safetyCriticalFieldCount > 0
        ? 'Run required safety sync steps before treating the profile update as complete.'
        : changedPlans.length > 0
          ? 'Run required sync steps, then process non-blocking refreshes and notifications.'
          : 'No sync work is needed because no tracked client facts changed.',
  }
}

function getStepStatus(target: ClientKnowledgeSyncTarget): ClientSyncStepStatus {
  return REQUIRED_TARGETS.has(target) ? 'required' : 'non_blocking'
}

function getNextStep(safetyCritical: boolean, steps: ClientSyncStep[]): string {
  if (steps.length === 0) {
    return 'No sync work is needed because this field did not change.'
  }

  if (safetyCritical) {
    return 'Run required safety sync steps, then notify and audit any non-blocking side effects.'
  }

  return 'Run required sync steps, then refresh dependent caches and surfaces.'
}
