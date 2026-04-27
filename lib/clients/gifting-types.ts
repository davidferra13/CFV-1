export type GiftType = 'thank_you' | 'birthday' | 'holiday' | 'milestone' | 'apology' | 'custom'
export type DeliveryMethod = 'hand_delivered' | 'shipped' | 'digital' | 'with_service'
export type TriggerType =
  | 'post_event'
  | 'birthday'
  | 'anniversary'
  | 'no_booking_30d'
  | 'no_booking_60d'
  | 'no_booking_90d'
  | 'holiday'
  | 'milestone_event_count'

export type RuleAction = 'reminder' | 'email_draft' | 'gift_suggestion'

export type GiftEntry = {
  id: string
  chef_id: string
  client_id: string
  gift_type: GiftType
  occasion: string
  description: string
  cost_cents: number
  sent_at: string
  delivery_method: DeliveryMethod
  notes: string | null
  created_at: string
}

export type FollowUpRule = {
  id: string
  chef_id: string
  trigger_type: TriggerType
  action: RuleAction
  template_text: string | null
  enabled: boolean
  created_at: string
}

export type GiftSuggestion = {
  type: GiftType
  reason: string
  client_id: string
  client_name: string
  urgency: 'high' | 'medium' | 'low'
}
