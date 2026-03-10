// Workflow Automation Type Definitions
// Multi-step workflow engine types for the client-facing automation system.

export type WorkflowTriggerType =
  | 'event_stage_changed'
  | 'inquiry_created'
  | 'quote_sent'
  | 'quote_viewed'
  | 'contract_signed'
  | 'payment_received'
  | 'days_before_event'
  | 'days_after_event'

export type WorkflowActionType =
  | 'send_email'
  | 'create_task'
  | 'create_notification'
  | 'update_event_status'
  | 'send_feedback_request'
  | 'send_payment_reminder'

export type WorkflowConditionType =
  | 'quote_accepted'
  | 'contract_signed'
  | 'payment_complete'
  | 'has_responded'

export type WorkflowExecutionStatus = 'active' | 'completed' | 'cancelled' | 'paused'

export type WorkflowStepLogStatus = 'success' | 'failed' | 'skipped' | 'condition_not_met'

// ─── Database Row Types ─────────────────────────────────────────────────────

export type WorkflowTemplate = {
  id: string
  chef_id: string
  name: string
  description: string | null
  is_active: boolean
  is_system: boolean
  trigger_type: WorkflowTriggerType
  trigger_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type WorkflowStep = {
  id: string
  template_id: string
  step_order: number
  delay_hours: number
  condition: Record<string, unknown> | null
  action_type: WorkflowActionType
  action_config: Record<string, unknown>
  created_at: string
}

export type WorkflowExecution = {
  id: string
  chef_id: string
  template_id: string
  entity_type: string
  entity_id: string
  current_step: number
  status: WorkflowExecutionStatus
  next_step_at: string | null
  started_at: string
  completed_at: string | null
  cancelled_at: string | null
}

export type WorkflowExecutionLog = {
  id: string
  execution_id: string
  chef_id: string
  step_order: number
  action_type: string
  status: WorkflowStepLogStatus
  result: Record<string, unknown> | null
  error: string | null
  executed_at: string
}

// ─── Trigger Context ────────────────────────────────────────────────────────

export type WorkflowTriggerContext = {
  entityId?: string
  entityType?: string
  fields: Record<string, unknown>
}

// ─── Display Labels ─────────────────────────────────────────────────────────

export const WORKFLOW_TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  event_stage_changed: 'Event status changes',
  inquiry_created: 'New inquiry received',
  quote_sent: 'Quote/proposal sent',
  quote_viewed: 'Client views proposal',
  contract_signed: 'Contract signed',
  payment_received: 'Payment received',
  days_before_event: 'Days before event',
  days_after_event: 'Days after event',
}

export const WORKFLOW_ACTION_LABELS: Record<WorkflowActionType, string> = {
  send_email: 'Send email (draft)',
  create_task: 'Create task',
  create_notification: 'Send notification',
  update_event_status: 'Update event status',
  send_feedback_request: 'Send feedback request',
  send_payment_reminder: 'Send payment reminder',
}

export const WORKFLOW_CONDITION_LABELS: Record<WorkflowConditionType, string> = {
  quote_accepted: 'Quote has been accepted',
  contract_signed: 'Contract has been signed',
  payment_complete: 'Payment is complete',
  has_responded: 'Client has responded',
}
