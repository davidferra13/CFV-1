// Remy Routines - shared deterministic data types.
// No 'use server' here so these types can be imported by UI, server actions, and tests.

export type RemyRoutineStatus = 'active' | 'paused' | 'archived'

export type RoutineStatus = RemyRoutineStatus

export type RemyRoutineTriggerType = 'signal' | 'event' | 'schedule' | 'manual' | 'webhook'

export type RoutineTriggerType = RemyRoutineTriggerType

export type RemyRoutineConditionOperator =
  | 'exists'
  | 'not_exists'
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'starts_with'
  | 'ends_with'

export type RemyRoutineConditionMode = 'all' | 'any'

export type RemyRoutineActionKind =
  | 'record_routine_event'
  | 'queue_review'
  | 'create_notification_draft'
  | 'create_task_draft'

export type RoutineActionType = RemyRoutineActionKind

export type RemyRoutineExecutionStatus =
  | 'approval_required'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped'
  | 'blocked'

export interface RemyRoutineCondition {
  path: string
  operator: RemyRoutineConditionOperator
  value?: unknown
}

export interface RemyRoutineConditionGroup {
  mode: RemyRoutineConditionMode
  conditions: RemyRoutineCondition[]
  groups?: RemyRoutineConditionGroup[]
}

export interface RemyRoutineAction {
  id: string
  kind: RemyRoutineActionKind
  label: string
  payload: Record<string, unknown>
  approvalRequired?: boolean
}

export type RoutineAction = RemyRoutineAction

export interface RemyRoutineTriggerContext {
  triggerType: RemyRoutineTriggerType
  source: string
  occurredAt: string
  triggerKey?: string | null
  entityIds?: string[]
  data: Record<string, unknown>
  idempotencyKey?: string | null
}

export interface RemyRoutine {
  id: string
  tenantId: string
  name: string
  description: string | null
  status: RemyRoutineStatus
  triggerType: RemyRoutineTriggerType
  triggerConfig: Record<string, unknown>
  conditionGroup: RemyRoutineConditionGroup
  actions: RemyRoutineAction[]
  priority: number
  approvalRequired: boolean
  idempotencyWindowSeconds: number
  createdByAuthUserId: string | null
  updatedByAuthUserId: string | null
  createdAt: string
  updatedAt: string
}

export type Routine = RemyRoutine

export interface RemyRoutineMatchConditionResult {
  path: string
  operator: RemyRoutineConditionOperator
  expected: unknown
  actual: unknown
  matched: boolean
}

export interface RemyRoutineMatchResult {
  routine: RemyRoutine
  matched: boolean
  reason: string
  conditionResults: RemyRoutineMatchConditionResult[]
  matchAuditId: string | null
}

export type RoutineMatch = RemyRoutineMatchResult

export interface RemyRoutineExecution {
  id: string
  tenantId: string
  routineId: string
  matchAuditId: string | null
  idempotencyKey: string
  status: RemyRoutineExecutionStatus
  actionPayload: RemyRoutineAction[]
  resultPayload: unknown
  errorMessage: string | null
  requestedByAuthUserId: string | null
  approvedByAuthUserId: string | null
  approvedAt: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type RoutineExecution = RemyRoutineExecution

export interface RemyRoutineActionEvent {
  id: string
  tenantId: string
  routineId: string
  executionId: string
  actionId: string
  actionKind: RemyRoutineActionKind
  payload: Record<string, unknown>
  status: 'success' | 'error'
  errorMessage: string | null
  createdAt: string
}

export interface RemyRoutineExecutionResult {
  executionId: string
  routineId: string
  status: RemyRoutineExecutionStatus
  idempotencyKey: string
  actionEvents: RemyRoutineActionEvent[]
  approvalRequired: boolean
  errorMessage: string | null
}

export interface RemyRoutineMatchAuditEntry {
  id: string
  routineId: string | null
  triggerType: RemyRoutineTriggerType
  triggerSource: string
  triggerKey: string | null
  matched: boolean
  reason: string
  conditionResults: unknown
  triggerContext: unknown
  createdAt: string
}

export interface RemyRoutineExecutionAuditEntry {
  id: string
  routineId: string | null
  executionId: string | null
  status: RemyRoutineExecutionStatus
  requestPayload: unknown
  resultPayload: unknown
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  createdAt: string
}

export interface RemyRoutineCreateInput {
  name: string
  description?: string | null
  status?: RemyRoutineStatus
  triggerType: RemyRoutineTriggerType
  triggerConfig?: Record<string, unknown>
  conditionGroup?: RemyRoutineConditionGroup
  actions: RemyRoutineAction[]
  priority?: number
  approvalRequired?: boolean
  idempotencyWindowSeconds?: number
}

export type RemyRoutineUpdateInput = Partial<RemyRoutineCreateInput>

export const EMPTY_REMY_ROUTINE_CONDITION_GROUP: RemyRoutineConditionGroup = {
  mode: 'all',
  conditions: [],
}
