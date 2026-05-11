// Automations Engine Type Definitions

export type TriggerEvent =
  | 'inquiry_created'
  | 'inquiry_status_changed'
  | 'wix_submission_received'
  | 'event_status_changed'
  | 'event_completed'
  | 'follow_up_overdue'
  | 'no_response_timeout'
  | 'quote_expiring'
  | 'quote_expired'
  | 'event_approaching'
  | 'event_confirmed'
  | 'payment_due_approaching'
  | 'payment_overdue'
  | 'inquiry_stale'
  | 'stock_below_par'

export type ActionType =
  | 'create_notification'
  | 'create_follow_up_task'
  | 'send_template_message'
  | 'create_internal_note'
  | 'draft_follow_up_email'
  | 'request_review_email'
  | 'flag_stale_inquiry'
  | 'create_purchase_order_draft'
  | 'block_prep_days'
  | 'archive_quote'

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
  event_completed: 'Event completed',
  follow_up_overdue: 'Follow-up overdue',
  no_response_timeout: 'No response timeout',
  quote_expiring: 'Quote expiring soon',
  quote_expired: 'Quote expired',
  event_approaching: 'Event approaching',
  event_confirmed: 'Event confirmed',
  payment_due_approaching: 'Payment due soon',
  payment_overdue: 'Payment overdue',
  inquiry_stale: 'Inquiry gone stale',
  stock_below_par: 'Stock below par level',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  create_notification: 'Send notification',
  create_follow_up_task: 'Create follow-up task',
  send_template_message: 'Draft template message',
  create_internal_note: 'Add internal note',
  draft_follow_up_email: 'Draft follow-up email',
  request_review_email: 'Send review request email',
  flag_stale_inquiry: 'Flag stale inquiry',
  create_purchase_order_draft: 'Create purchase order draft',
  block_prep_days: 'Block prep days on calendar',
  archive_quote: 'Archive expired quote',
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
    { field: 'budget_mode', label: 'Budget mode', hint: 'exact, range, not_sure, unset' },
    { field: 'budget_known', label: 'Budget known', hint: 'true or false' },
    {
      field: 'budget_range',
      label: 'Budget range',
      hint: 'free text, e.g. "$1,500" or "flexible"',
    },
    { field: 'budget_cents', label: 'Budget exact (cents)', hint: 'e.g. 250000' },
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
    {
      field: 'status',
      label: 'New status',
      hint: 'confirmed, paid, in_progress, completed, cancelled',
    },
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
  payment_due_approaching: [
    { field: 'days_until_event', label: 'Days until event' },
    { field: 'outstanding_balance_cents', label: 'Outstanding balance (cents)' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'client_name', label: 'Client name' },
  ],
  payment_overdue: [
    { field: 'days_overdue', label: 'Days overdue' },
    { field: 'outstanding_balance_cents', label: 'Outstanding balance (cents)' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'client_name', label: 'Client name' },
  ],
  event_completed: [
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'completed_at', label: 'Completed at' },
    { field: 'guest_count', label: 'Guest count' },
  ],
  event_confirmed: [
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'event_date', label: 'Event date' },
    { field: 'lead_time_days', label: 'Lead time (days)' },
  ],
  quote_expired: [
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'days_since_expiry', label: 'Days since expiry' },
  ],
  inquiry_stale: [
    { field: 'client_name', label: 'Client name' },
    { field: 'occasion', label: 'Occasion' },
    { field: 'hours_since_activity', label: 'Hours since last activity' },
    { field: 'channel', label: 'Channel' },
  ],
  stock_below_par: [
    { field: 'ingredient_name', label: 'Ingredient name' },
    { field: 'current_stock', label: 'Current stock' },
    { field: 'par_level', label: 'Par level' },
    { field: 'unit', label: 'Unit' },
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
  receipt_upload_reminders_enabled: boolean
  closure_deadline_alerts_enabled: boolean
  closure_deadline_days: number
  weekly_summary_enabled: boolean
  inquiry_auto_response_template: string | null
  auto_response_template_enabled: boolean
  // Payment reminder fields (Migration C)
  payment_reminder_enabled: boolean
  payment_reminder_days_before: number
  payment_overdue_alert_enabled: boolean
  payment_overdue_alert_days_after: number
  // Deposit default preferences
  default_deposit_enabled: boolean
  default_deposit_type: 'percentage' | 'fixed'
  default_deposit_percentage: number
  default_deposit_amount_cents: number
  // Pre-event reminder interval toggles
  event_reminder_30d_enabled: boolean
  event_reminder_14d_enabled: boolean
  event_reminder_7d_enabled: boolean
  event_reminder_2d_enabled: boolean
  event_reminder_1d_enabled: boolean
  created_at: string
  updated_at: string
}

// Defaults used when no row exists for a chef yet
export const DEFAULT_AUTOMATION_SETTINGS: Omit<
  ChefAutomationSettings,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
> = {
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
  receipt_upload_reminders_enabled: true,
  closure_deadline_alerts_enabled: true,
  closure_deadline_days: 3,
  weekly_summary_enabled: false,
  inquiry_auto_response_template: null,
  auto_response_template_enabled: false,
  // Payment reminder fields (Migration C)
  payment_reminder_enabled: true,
  payment_reminder_days_before: 2,
  payment_overdue_alert_enabled: true,
  payment_overdue_alert_days_after: 1,
  // Deposit default preferences
  default_deposit_enabled: false,
  default_deposit_type: 'percentage' as const,
  default_deposit_percentage: 0,
  default_deposit_amount_cents: 0,
  // Pre-event reminder interval toggles
  event_reminder_30d_enabled: true,
  event_reminder_14d_enabled: true,
  event_reminder_7d_enabled: true,
  event_reminder_2d_enabled: true,
  event_reminder_1d_enabled: true,
}

// ─── Preset Automation Rules ─────────────────────────────────────────────
// Config-driven rules that chefs toggle on/off with configurable thresholds.
// No custom code per rule; the engine reads the config and executes.

export type PresetRuleType =
  | 'auto_draft_follow_up'
  | 'auto_request_review'
  | 'auto_flag_stale_inquiry'
  | 'auto_reorder_ingredient'
  | 'auto_block_calendar'
  | 'auto_archive_quote'

export type PresetRuleConfig = {
  type: PresetRuleType
  enabled: boolean
  config: Record<string, number | string | boolean>
  last_triggered_at: string | null
}

export type PresetRuleDefinition = {
  type: PresetRuleType
  name: string
  description: string
  triggerEvent: TriggerEvent
  actionType: ActionType
  defaultConfig: Record<string, number | string | boolean>
  configFields: Array<{
    key: string
    label: string
    type: 'number' | 'boolean'
    min?: number
    max?: number
    suffix?: string
  }>
}
