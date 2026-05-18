import type {
  CollabAvailabilityStatus,
  CollabHandoffRecipientStatus,
  CollabHandoffStatus,
  CollabTrustLevel,
} from '@/lib/network/collab-logic'

export type { CollabMetrics } from '@/lib/network/collab-metrics'

export type TrustLevel = CollabTrustLevel
export type HandoffType = 'lead' | 'event_backup' | 'client_referral'
export type HandoffSourceType = 'inquiry' | 'event' | 'manual'
export type HandoffVisibility = 'trusted_circle' | 'selected_chefs' | 'connections'
export type HandoffStatus = CollabHandoffStatus
export type HandoffRecipientStatus = CollabHandoffRecipientStatus
export type AvailabilityStatus = CollabAvailabilityStatus

export type CollabSocialNotificationType =
  | 'collab_handoff_received'
  | 'collab_handoff_accepted'
  | 'collab_handoff_rejected'
  | 'collab_handoff_converted'
  | 'collab_handoff_cancelled'

export type HandoffEventType =
  | 'created'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'converted'
  | 'cancelled'
  | 'status_recomputed'

export type CollabChefCard = {
  chef_id: string
  display_name: string | null
  business_name: string
  profile_image_url: string | null
  city: string | null
  state: string | null
}

export type TrustedCircleMember = {
  id: string
  trust_level: TrustLevel
  notes: string | null
  created_at: string
  chef: CollabChefCard
}

export type CollabAvailabilitySignal = {
  id: string
  date_start: string
  date_end: string
  region_text: string | null
  cuisines: string[]
  max_guest_count: number | null
  status: AvailabilityStatus
  share_with_trusted_only: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export type IncomingCollabHandoff = {
  recipient_row_id: string
  handoff_id: string
  title: string
  handoff_type: HandoffType
  source_entity_type: HandoffSourceType | null
  source_entity_id: string | null
  status: HandoffStatus
  recipient_status: HandoffRecipientStatus
  response_note: string | null
  event_date: string | null
  occasion: string | null
  guest_count: number | null
  location_text: string | null
  budget_cents: number | null
  private_note: string | null
  client_context: Record<string, any>
  expires_at: string | null
  created_at: string
  viewed_at: string | null
  responded_at: string | null
  from_chef: CollabChefCard
}

export type OutgoingCollabHandoff = {
  handoff_id: string
  title: string
  handoff_type: HandoffType
  source_entity_type: HandoffSourceType | null
  source_entity_id: string | null
  status: HandoffStatus
  event_date: string | null
  occasion: string | null
  guest_count: number | null
  location_text: string | null
  budget_cents: number | null
  private_note: string | null
  client_context: Record<string, any>
  expires_at: string | null
  visibility_scope: HandoffVisibility
  created_at: string
  recipients: Array<{
    recipient_row_id: string
    recipient_status: HandoffRecipientStatus
    response_note: string | null
    viewed_at: string | null
    responded_at: string | null
    chef: CollabChefCard
  }>
}

export type CollabInbox = {
  incoming: IncomingCollabHandoff[]
  outgoing: OutgoingCollabHandoff[]
}

export type CollabRecipientSuggestion = {
  chef: CollabChefCard
  trust_level: TrustLevel | null
  score: number
  reasons: string[]
  has_active_signal: boolean
}

export type CollabHandoffTimelineEvent = {
  id: string
  handoff_id: string
  event_type: HandoffEventType
  metadata: Record<string, any>
  created_at: string
  actor: CollabChefCard | null
}
