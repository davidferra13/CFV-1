// Remy Routines - Type definitions
// Maps to remy_routines, remy_routine_match_audit, remy_routine_executions,
// remy_routine_execution_audit, and remy_routine_action_events tables.
// No 'use server'; safe to import from any context.

// ---- Trigger Types ----

export type RoutineTriggerType = 'signal' | 'event' | 'schedule' | 'manual' | 'webhook'

export type RoutineStatus = 'active' | 'paused' | 'archived'

export type RoutineExecutionStatus =
  | 'approval_required'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped'
  | 'blocked'

export type RoutineActionKind =
  | 'record_routine_event'
  | 'queue_review'
  | 'create_notification_draft'
  | 'create_task_draft'

// ---- Condition System ----

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'exists'
  | 'not_exists'

export interface RoutineCondition {
  field: string
  operator: ConditionOperator
  value: unknown
}

export interface ConditionGroup {
  mode: 'all' | 'any'
  conditions: RoutineCondition[]
}

// ---- Trigger Configs ----

export interface SignalTriggerConfig {
  signal_name: string
  source_domain?: string
}

export interface EventTriggerConfig {
  event_type: string
  entity_type?: string
}

export interface ScheduleTriggerConfig {
  cron: string
  timezone?: string
}

export interface ManualTriggerConfig {
  label?: string
}

export interface WebhookTriggerConfig {
  path: string
  secret_hash?: string
}

export type TriggerConfig =
  | SignalTriggerConfig
  | EventTriggerConfig
  | ScheduleTriggerConfig
  | ManualTriggerConfig
  | WebhookTriggerConfig

// ---- Action Definitions ----

export interface RoutineActionDef {
  id: string
  kind: RoutineActionKind
  label: string
  payload: Record<string, unknown>
}

// ---- Database Row Types ----

export interface RemyRoutine {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: RoutineStatus
  trigger_type: RoutineTriggerType
  trigger_config: TriggerConfig
  condition_group: ConditionGroup
  actions: RoutineActionDef[]
  priority: number
  approval_required: boolean
  idempotency_window_seconds: number
  created_by_auth_user_id: string | null
  updated_by_auth_user_id: string | null
  created_at: string
  updated_at: string
}

export interface RoutineMatchAuditRow {
  id: string
  tenant_id: string
  routine_id: string | null
  auth_user_id: string | null
  trigger_type: RoutineTriggerType
  trigger_source: string
  trigger_key: string | null
  matched: boolean
  reason: string
  condition_results: Record<string, unknown> | null
  trigger_context: Record<string, unknown> | null
  created_at: string
}

export interface RoutineExecutionRow {
  id: string
  tenant_id: string
  routine_id: string
  match_audit_id: string | null
  idempotency_key: string
  status: RoutineExecutionStatus
  action_payload: RoutineActionDef[]
  result_payload: Record<string, unknown> | null
  error_message: string | null
  requested_by_auth_user_id: string | null
  approved_by_auth_user_id: string | null
  approved_at: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface RoutineExecutionAuditRow {
  id: string
  tenant_id: string
  routine_id: string | null
  execution_id: string | null
  auth_user_id: string | null
  status: RoutineExecutionStatus
  request_payload: Record<string, unknown> | null
  result_payload: Record<string, unknown> | null
  error_message: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  created_at: string
}

export interface RoutineActionEventRow {
  id: string
  tenant_id: string
  routine_id: string
  execution_id: string
  action_id: string
  action_kind: RoutineActionKind
  payload: Record<string, unknown>
  status: 'success' | 'error'
  error_message: string | null
  created_at: string
}

// ---- Input Types for CRUD ----

export interface CreateRoutineInput {
  name: string
  description?: string
  trigger_type: RoutineTriggerType
  trigger_config: TriggerConfig
  condition_group?: ConditionGroup
  actions: RoutineActionDef[]
  priority?: number
  approval_required?: boolean
  idempotency_window_seconds?: number
}

export interface UpdateRoutineInput {
  name?: string
  description?: string | null
  trigger_type?: RoutineTriggerType
  trigger_config?: TriggerConfig
  condition_group?: ConditionGroup
  actions?: RoutineActionDef[]
  priority?: number
  approval_required?: boolean
  idempotency_window_seconds?: number
}

// ---- Engine Event (incoming trigger to evaluate) ----

export interface RoutineTriggerEvent {
  trigger_type: RoutineTriggerType
  source: string
  key?: string
  context: Record<string, unknown>
}

// ---- Engine Result ----

export interface RoutineEngineResult {
  routine_id: string
  routine_name: string
  matched: boolean
  reason: string
  execution_id: string | null
  execution_status: RoutineExecutionStatus | null
  action_results: Array<{
    action_id: string
    kind: RoutineActionKind
    status: 'success' | 'error'
    error_message: string | null
  }>
}
