// Automations Engine Type Definitions

export type TriggerEvent =
  | 'inquiry_created'
  | 'inquiry_status_changed'
  | 'wix_submission_received'
  | 'event_status_changed'
  | 'follow_up_overdue'
  | 'no_response_timeout'
  | 'quote_expiring'
  | 'event_approaching'

export type ActionType =
  | 'create_notification'
  | 'create_follow_up_task'
  | 'send_template_message'
  | 'create_internal_note'

export type ConditionOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'

export type Condition = {
  field: string
  op: ConditionOp
  value: string | number | boolean | string[]
}

export type AutomationRule = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_event: TriggerEvent
  conditions: Condition[]
  action_type: ActionType
  action_config: Record<string, unknown>
  last_fired_at: string | null
  total_fires: number
  priority: number
  created_at: string
  updated_at: string
}

export type AutomationExecution = {
  id: string
  tenant_id: string
  rule_id: string
  trigger_event: string
  trigger_entity_id: string | null
  trigger_entity_type: string | null
  action_type: string
  action_result: Record<string, unknown> | null
  status: 'success' | 'failed' | 'skipped'
  error: string | null
  executed_at: string
}

// Context passed to the engine when evaluating rules
export type AutomationContext = {
  tenantId: string
  entityId?: string
  entityType?: string
  // Flattened fields from the triggering entity for condition evaluation
  fields: Record<string, unknown>
}

// Trigger display config
export const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  inquiry_created: 'New inquiry created',
  inquiry_status_changed: 'Inquiry status changed',
  wix_submission_received: 'Wix form submitted',
  event_status_changed: 'Event status changed',
  follow_up_overdue: 'Follow-up overdue',
  no_response_timeout: 'No response timeout',
  quote_expiring: 'Quote expiring soon',
  event_approaching: 'Event approaching',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  create_notification: 'Send notification',
  create_follow_up_task: 'Create follow-up task',
  send_template_message: 'Draft template message',
  create_internal_note: 'Add internal note',
}
