// =============================================================================
// Social Event Hub — Type Definitions
// =============================================================================

// ---- Guest Profiles ----

export interface HubGuestProfile {
  id: string
  email: string | null
  email_normalized: string | null
  display_name: string
  avatar_url: string | null
  bio: string | null
  profile_token: string
  auth_user_id: string | null
  client_id: string | null
  known_allergies: string[]
  known_dietary: string[]
  notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface HubGuestEventHistory {
  id: string
  profile_id: string
  event_id: string
  event_guest_id: string | null
  tenant_id: string
  rsvp_status: string | null
  courses_served: unknown | null
  chef_name: string | null
  event_date: string | null
  occasion: string | null
  created_at: string
}

// ---- Groups ----

export type HubGroupVisibility = 'public' | 'private' | 'secret'

export interface HubGroup {
  id: string
  event_id: string | null
  event_stub_id: string | null
  tenant_id: string | null
  name: string
  description: string | null
  cover_image_url: string | null
  emoji: string | null
  group_token: string
  theme_id: string | null
  is_active: boolean
  allow_member_invites: boolean
  allow_anonymous_posts: boolean
  visibility: HubGroupVisibility
  created_by_profile_id: string
  last_message_at: string | null
  last_message_preview: string | null
  message_count: number
  created_at: string
  updated_at: string
  // Joined data
  theme?: EventTheme | null
  member_count?: number
  members?: HubGroupMember[]
}

export type HubMemberRole = 'owner' | 'admin' | 'chef' | 'member' | 'viewer'

export interface HubGroupMember {
  id: string
  group_id: string
  profile_id: string
  role: HubMemberRole
  can_post: boolean
  can_invite: boolean
  can_pin: boolean
  last_read_at: string | null
  notifications_muted: boolean
  joined_at: string
  // Joined data
  profile?: HubGuestProfile
}

export interface HubGroupEvent {
  id: string
  group_id: string
  event_id: string
  added_at: string
}

// ---- Messages ----

export type HubMessageType =
  | 'text'
  | 'image'
  | 'system'
  | 'poll'
  | 'rsvp_update'
  | 'menu_update'
  | 'note'
  | 'photo_share'

export interface HubMessage {
  id: string
  group_id: string
  author_profile_id: string
  message_type: HubMessageType
  body: string | null
  media_urls: string[]
  media_captions: string[]
  is_pinned: boolean
  pinned_by_profile_id: string | null
  pinned_at: string | null
  system_event_type: string | null
  system_metadata: Record<string, unknown> | null
  reply_to_message_id: string | null
  reaction_counts: Record<string, number>
  is_anonymous: boolean
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  // Joined data
  author?: HubGuestProfile
  reply_to?: HubMessage | null
  poll?: HubPoll | null
}

export interface HubMessageReaction {
  id: string
  message_id: string
  profile_id: string
  emoji: string
  created_at: string
}

// ---- Media & Notes ----

export interface HubMedia {
  id: string
  group_id: string
  uploaded_by_profile_id: string
  event_id: string | null
  storage_path: string
  filename: string | null
  content_type: string | null
  size_bytes: number | null
  caption: string | null
  created_at: string
  // Joined
  uploaded_by?: HubGuestProfile
}

export type HubNoteColor = 'default' | 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange'

export interface HubPinnedNote {
  id: string
  group_id: string
  author_profile_id: string
  title: string | null
  body: string
  color: HubNoteColor
  sort_order: number
  created_at: string
  updated_at: string
  // Joined
  author?: HubGuestProfile
}

// ---- Polls ----

export type HubPollType = 'single_choice' | 'multi_choice'

export interface HubPoll {
  id: string
  group_id: string
  created_by_profile_id: string
  message_id: string | null
  question: string
  poll_type: HubPollType
  is_closed: boolean
  closes_at: string | null
  created_at: string
  // Joined
  options?: HubPollOption[]
  total_votes?: number
}

export interface HubPollOption {
  id: string
  poll_id: string
  label: string
  metadata: Record<string, unknown> | null
  sort_order: number
  // Computed
  vote_count?: number
  voted_by_me?: boolean
}

export interface HubPollVote {
  id: string
  poll_id: string
  option_id: string
  profile_id: string
  created_at: string
}

// ---- Themes ----

export type ThemeCategory =
  | 'celebration'
  | 'corporate'
  | 'holiday'
  | 'seasonal'
  | 'casual'
  | 'formal'

export interface EventTheme {
  id: string
  slug: string
  name: string
  category: ThemeCategory
  primary_color: string
  secondary_color: string
  accent_color: string
  background_gradient: string | null
  font_display: string | null
  emoji: string | null
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

// ---- Event Stubs ----

export type EventStubStatus = 'planning' | 'seeking_chef' | 'adopted' | 'cancelled'

export interface EventStub {
  id: string
  created_by_profile_id: string
  hub_group_id: string | null
  title: string
  occasion: string | null
  event_date: string | null
  serve_time: string | null
  guest_count: number | null
  location_text: string | null
  notes: string | null
  dietary_restrictions: string[]
  allergies: string[]
  adopted_event_id: string | null
  adopted_tenant_id: string | null
  adopted_at: string | null
  status: EventStubStatus
  created_at: string
  updated_at: string
  // Joined
  group?: HubGroup
  created_by?: HubGuestProfile
}
