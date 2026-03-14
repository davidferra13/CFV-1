export type CommunicationSource =
  | 'email'
  | 'website_form'
  | 'sms'
  | 'whatsapp'
  | 'phone'
  | 'instagram'
  | 'facebook'
  | 'takeachef'
  | 'yhangry'
  | 'thumbtack'
  | 'theknot'
  | 'bark'
  | 'cozymeal'
  | 'gigsalad'
  | 'google_business'
  | 'manual_log'
export type CommunicationDirection = 'inbound' | 'outbound'
export type CommunicationStatus = 'unlinked' | 'linked' | 'resolved'
export type ThreadState = 'active' | 'snoozed' | 'closed'
export type SuggestedLinkStatus = 'pending' | 'accepted' | 'rejected'
export type FollowUpTimerStatus = 'active' | 'completed' | 'dismissed'
export type CommunicationActionSource = 'manual' | 'webhook' | 'automation' | 'import'
export type CommunicationTab = 'unlinked' | 'needs_attention' | 'snoozed' | 'resolved'

export type CommunicationEventInput = {
  tenantId: string
  source: CommunicationSource
  externalId?: string | null
  externalThreadKey?: string | null
  timestamp?: string
  senderIdentity: string
  rawContent: string
  direction: CommunicationDirection
  linkedEntityType?: 'inquiry' | 'event' | null
  linkedEntityId?: string | null
  ingestionSource: CommunicationActionSource
  actorId?: string | null
}

export type CommunicationInboxItem = {
  thread_id: string
  tenant_id: string
  client_id: string | null
  is_starred: boolean
  last_activity_at: string
  thread_state: ThreadState
  snoozed_until: string | null
  communication_event_id: string
  event_timestamp: string
  sender_identity: string
  source: CommunicationSource
  direction: CommunicationDirection
  raw_content: string
  normalized_content: string
  communication_status: CommunicationStatus
  linked_entity_type: 'inquiry' | 'event' | null
  linked_entity_id: string | null
  resolved_client_id: string | null
  next_follow_up_due_at: string | null
  has_overdue_follow_up: boolean
  pending_link_count: number
  top_pending_confidence: number
  tab: CommunicationTab
  needs_attention: boolean
}

export type SuggestedLink = {
  id: string
  communication_event_id: string
  suggested_entity_type: 'inquiry' | 'event'
  suggested_entity_id: string
  confidence_score: number
  status: SuggestedLinkStatus
}

export type CommunicationInboxStats = {
  total: number
  unlinked: number
  needs_attention: number
  snoozed: number
  resolved: number
}

export type CommunicationClassificationRule = {
  id: string
  name: string
  is_active: boolean
  match_field: 'sender_identity' | 'normalized_content' | 'source' | 'direction'
  operator: 'contains' | 'equals' | 'starts_with'
  match_value: string
  label: string
  priority: number
}
