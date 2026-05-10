// Compound Workflows - Type Definitions
// Connects domains end-to-end via multi-step tracked sequences.
// Step completion is derived from existing domain state, not duplicated.

// ============================================
// WORKFLOW DEFINITION (static config)
// ============================================

export type WorkflowType = 'post_event_follow_up' | 'new_booking_pipeline' | 'event_prep_countdown'

export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped'

export interface WorkflowStepDefinition {
  /** Unique step ID within the workflow */
  id: string
  /** Human-readable step label */
  label: string
  /** What this step accomplishes */
  description: string
  /** Deep link for the chef to act on this step */
  href: (entityId: string) => string
  /** Button label for the action */
  actionLabel: string
  /** Which steps must be completed before this one is active */
  dependsOn: string[]
  /** Can this step be skipped? */
  skippable: boolean
  /** Estimated time in minutes */
  timeEstimateMinutes: number
  /** Icon name (Lucide) */
  icon: string
  /**
   * Relative trigger time (for countdown workflows).
   * Negative = days before event, positive = days after event.
   * null = no time constraint.
   */
  triggerDaysRelative: number | null
}

export interface WorkflowDefinition {
  type: WorkflowType
  label: string
  description: string
  /** What entity type triggers this workflow */
  entityType: 'event' | 'inquiry'
  /** Icon name (Lucide) */
  icon: string
  /** Ordered step definitions */
  steps: WorkflowStepDefinition[]
}

// ============================================
// WORKFLOW INSTANCE (computed at runtime)
// ============================================

export interface WorkflowStep {
  id: string
  label: string
  description: string
  status: StepStatus
  href: string
  actionLabel: string
  skippable: boolean
  timeEstimateMinutes: number
  icon: string
  completedAt: string | null
  skippedAt: string | null
  triggerDaysRelative: number | null
  /** Extra context from the resolver */
  meta?: Record<string, unknown>
}

export interface WorkflowInstance {
  /** Workflow type identifier */
  type: WorkflowType
  /** Human-readable label */
  label: string
  /** Workflow description */
  description: string
  /** The entity this workflow tracks */
  entityType: 'event' | 'inquiry'
  entityId: string
  /** Icon name */
  icon: string
  /** Resolved steps with current status */
  steps: WorkflowStep[]
  /** Index of the current active step (-1 if all done) */
  currentStepIndex: number
  /** Progress tracking */
  completedCount: number
  totalCount: number
  progressPercent: number
  /** Context about the entity */
  entityContext: {
    title: string
    subtitle: string | null
    date: string | null
    clientName: string | null
  }
  /** When this workflow became active */
  activeSince: string | null
}

// ============================================
// STEP RESOLVER
// ============================================

/**
 * A resolver function that checks domain state to determine a step's status.
 * Returns the resolved status and optional metadata.
 */
export interface StepResolverResult {
  status: StepStatus
  completedAt: string | null
  meta?: Record<string, unknown>
}

export type StepResolver = (
  entityId: string,
  db: any,
  tenantId: string
) => Promise<StepResolverResult>

/**
 * Maps step IDs to their resolver functions.
 * Used by the workflow engine to derive step status from domain state.
 */
export type StepResolverMap = Record<string, StepResolver>

// ============================================
// STEP OVERRIDE (persisted)
// ============================================

export interface WorkflowStepOverride {
  id: string
  tenantId: string
  workflowType: WorkflowType
  entityId: string
  stepId: string
  action: 'skip'
  reason: string | null
  createdAt: string
}

// ============================================
// DAILY INTEGRATION
// ============================================

/** Compact workflow summary for the daily plan */
export interface DailyWorkflowSummary {
  type: WorkflowType
  label: string
  icon: string
  entityId: string
  entityTitle: string
  currentStep: string | null
  completedCount: number
  totalCount: number
  progressPercent: number
  href: string
  urgency: 'low' | 'normal' | 'high'
}
