export type TouchpointRuleType =
  | 'birthday'
  | 'anniversary'
  | 'days_since_last_event'
  | 'lifetime_spend_milestone'
  | 'streak_milestone'
  | 'custom'

export type TouchpointRule = {
  id: string
  chef_id: string
  rule_type: TouchpointRuleType
  trigger_value: string | null
  action_suggestion: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type UpcomingTouchpoint = {
  client_id: string
  client_name: string
  rule_type: TouchpointRuleType
  reason: string
  action_suggestion: string | null
  urgency: 'high' | 'medium' | 'low'
}
