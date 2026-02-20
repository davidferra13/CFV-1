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

// ─── Trigger Context Field Definitions ───────────────────────────────────
// Lists the fields available in the context for each trigger event.
// Used by the rule builder to show dropdowns instead of freeform text inputs.

export type TriggerContextField = {
  field: string
  label: string
  hint?: string // example values
}

export const TRIGGER_CONTEXT_FIELDS: Record<TriggerEvent, TriggerContextField[]> = {
  inquiry_created: [
    { field: 'channel', label: 'Channel', hint: 'email, wix, phone, walk_in' },
    { field: 'occasion', label: 'Occasion', hint: 'Dinner Party, Wedding, etc.' },
    { field: 'client_name', label: 'Client name' },
    { field: 'guest_count', label: 'Guest count', hint: 'e.g. 12' },
  ],
  inquiry_status_changed: [
    { field: 'status', label: 'New status', hint: 'awaiting_chef, awaiting_client, expired, etc.' },
    { field: 'previous_status', label: 'Previous status' },
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'channel', label: 'Channel' },
  ],
  wix_submission_received: [
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'channel', label: 'Channel', hint: 'always "wix"' },
    { field: 'guest_count', label: 'Guest count' },
  ],
  event_status_changed: [
    { field: 'status', label: 'New status', hint: 'confirmed, paid, in_progress, completed, cancelled' },
    { field: 'previous_status', label: 'Previous status' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'client_name', label: 'Client name' },
    { field: 'guest_count', label: 'Guest count' },
  ],
  follow_up_overdue: [
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'channel', label: 'Channel' },
    { field: 'status', label: 'Inquiry status' },
  ],
  no_response_timeout: [
    { field: 'days_since_last_contact', label: 'Days since last contact', hint: 'e.g. 3, 7' },
    { field: 'client_name', label: 'Client name' },
    { field: 'channel', label: 'Channel' },
    { field: 'occasion', label: 'Occasion' },
  ],
  quote_expiring: [
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'days_until_expiry', label: 'Days until expiry', hint: 'e.g. 1, 3' },
  ],
  event_approaching: [
    { field: 'hours_until_event', label: 'Hours until event', hint: 'e.g. 24, 48' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'client_name', label: 'Client name' },
    { field: 'status', label: 'Event status', hint: 'confirmed, paid' },
  ],
}

// ─── Chef Automation Settings ─────────────────────────────────────────────
// Mirrors the chef_automation_settings DB table; used for type safety.

export type ChefAutomationSettings = {
  id: string
  tenant_id: string
  follow_up_reminders_enabled: boolean
  follow_up_reminder_interval_hours: number
  no_response_alerts_enabled: boolean
  no_response_threshold_days: number
  event_approaching_alerts_enabled: boolean
  event_approaching_hours: number
  inquiry_auto_expiry_enabled: boolean
  inquiry_expiry_days: number
  quote_auto_expiry_enabled: boolean
  client_event_reminders_enabled: boolean
  time_tracking_reminders_enabled: boolean
  created_at: string
  updated_at: string
}

// Defaults used when no row exists for a chef yet
export const DEFAULT_AUTOMATION_SETTINGS: Omit<ChefAutomationSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  follow_up_reminders_enabled: true,
  follow_up_reminder_interval_hours: 48,
  no_response_alerts_enabled: true,
  no_response_threshold_days: 3,
  event_approaching_alerts_enabled: true,
  event_approaching_hours: 48,
  inquiry_auto_expiry_enabled: true,
  inquiry_expiry_days: 30,
  quote_auto_expiry_enabled: true,
  client_event_reminders_enabled: true,
  time_tracking_reminders_enabled: true,
}
