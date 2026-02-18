// Activity Tracking Type Definitions

export type ActorType = 'client' | 'chef' | 'system'

export type ActivityEventType =
  | 'portal_login'
  | 'event_viewed'
  | 'quote_viewed'
  | 'invoice_viewed'
  | 'proposal_viewed'
  | 'chat_message_sent'
  | 'rsvp_submitted'
  | 'form_submitted'
  | 'page_viewed'

export type ActivityEvent = {
  id: string
  tenant_id: string
  actor_type: ActorType
  actor_id: string | null
  client_id: string | null
  event_type: ActivityEventType
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type ActiveClient = {
  client_id: string
  client_name: string
  last_activity: string
  event_type: ActivityEventType
  entity_type: string | null
}
