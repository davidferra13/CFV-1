// Compound Workflows - Engine
// Pure computation: resolves workflow step statuses from domain state.
// No database calls. Receives pre-resolved data and returns WorkflowInstance.

import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStep,
  StepResolverResult,
  StepStatus,
} from './types'

// ============================================
// RESOLVE WORKFLOW STEPS
// ============================================

interface ResolveInput {
  definition: WorkflowDefinition
  entityId: string
  resolvedSteps: Record<string, StepResolverResult>
  skippedStepIds: Set<string>
  entityContext: WorkflowInstance['entityContext']
  activeSince: string | null
}

/**
 * Resolves a workflow definition + domain state into a fully computed WorkflowInstance.
 * Pure function, no side effects.
 */
export function resolveWorkflow(input: ResolveInput): WorkflowInstance {
  const { definition, entityId, resolvedSteps, skippedStepIds, entityContext, activeSince } = input

  const steps: WorkflowStep[] = definition.steps.map((stepDef) => {
    const resolved = resolvedSteps[stepDef.id]
    const isSkipped = skippedStepIds.has(stepDef.id)

    let status: StepStatus
    let completedAt: string | null = null
    let skippedAt: string | null = null

    if (isSkipped) {
      status = 'skipped'
      skippedAt = (resolved?.meta?.skippedAt as string) ?? null
    } else if (resolved) {
      status = resolved.status
      completedAt = resolved.completedAt
    } else {
      status = 'pending'
    }

    return {
      id: stepDef.id,
      label: stepDef.label,
      description: stepDef.description,
      status,
      href: stepDef.href(entityId),
      actionLabel: stepDef.actionLabel,
      skippable: stepDef.skippable,
      timeEstimateMinutes: stepDef.timeEstimateMinutes,
      icon: stepDef.icon,
      completedAt,
      skippedAt,
      triggerDaysRelative: stepDef.triggerDaysRelative,
      meta: resolved?.meta,
    }
  })

  // Apply dependency logic: a step is 'active' only if all its dependencies are done/skipped
  for (let i = 0; i < steps.length; i++) {
    const stepDef = definition.steps[i]
    const step = steps[i]

    if (step.status !== 'pending') continue

    const depsResolved = stepDef.dependsOn.every((depId) => {
      const dep = steps.find((s) => s.id === depId)
      return dep && (dep.status === 'completed' || dep.status === 'skipped')
    })

    if (depsResolved) {
      step.status = 'active'
    }
  }

  // If no step has dependsOn constraints, first pending step becomes active
  const hasAnyActive = steps.some((s) => s.status === 'active')
  if (!hasAnyActive) {
    const firstPending = steps.find((s) => s.status === 'pending')
    if (firstPending) {
      firstPending.status = 'active'
    }
  }

  const completedCount = steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length
  const totalCount = steps.length
  const currentStepIndex = steps.findIndex((s) => s.status === 'active')

  return {
    type: definition.type,
    label: definition.label,
    description: definition.description,
    entityType: definition.entityType,
    entityId,
    icon: definition.icon,
    steps,
    currentStepIndex,
    completedCount,
    totalCount,
    progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    entityContext,
    activeSince,
  }
}

/**
 * Compute urgency for a workflow based on entity date and progress.
 */
export function computeWorkflowUrgency(
  workflow: WorkflowInstance,
  now: Date = new Date()
): 'low' | 'normal' | 'high' {
  const entityDate = workflow.entityContext.date
  if (!entityDate) return 'normal'

  const date = new Date(entityDate + 'T00:00:00')
  const diffMs = date.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  // Post-event: urgency increases as time passes after the event
  if (workflow.type === 'post_event_follow_up') {
    const daysSince = -diffDays
    if (daysSince > 7 && workflow.progressPercent < 80) return 'high'
    if (daysSince > 3 && workflow.progressPercent < 60) return 'high'
    return 'normal'
  }

  // Prep countdown: urgency increases as event approaches
  if (workflow.type === 'event_prep_countdown') {
    if (diffDays <= 1 && workflow.progressPercent < 80) return 'high'
    if (diffDays <= 3 && workflow.progressPercent < 60) return 'high'
    if (diffDays <= 7 && workflow.progressPercent < 40) return 'normal'
    return 'low'
  }

  // Booking pipeline: urgency based on staleness
  if (workflow.type === 'new_booking_pipeline') {
    if (workflow.activeSince) {
      const staleDays =
        (now.getTime() - new Date(workflow.activeSince).getTime()) / (1000 * 60 * 60 * 24)
      if (staleDays > 7 && workflow.progressPercent < 50) return 'high'
      if (staleDays > 3) return 'normal'
    }
    return 'low'
  }

  return 'normal'
}
