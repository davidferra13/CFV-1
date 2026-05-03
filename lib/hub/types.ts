// =============================================================================
// Social Event Hub - Type Definitions
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
  known_allergies: string[] | null
  known_dietary: string[] | null
  dislikes: string[] | null
  favorites: string[] | null
  spice_tolerance: 'mild' | 'medium' | 'hot' | 'extra_hot' | null
  cuisine_preferences: string[] | null
  notifications_enabled: boolean
  referred_by_profile_id?: string | null
  first_group_id?: string | null
  upgraded_to_client_at?: string | null
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
  inquiry_id?: string | null
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
  group_type?: 'circle' | 'dinner_club' | 'planning' | 'bridge' | 'community'
  created_by_profile_id: string | null
  // Open Tables / discovery fields
  is_open_table?: boolean
  display_area?: string | null
  display_vibe?: string[] | null
  dietary_theme?: string[] | null
  open_seats?: number | null
  max_group_size?: number | null
  last_message_at: string | null
  last_message_preview: string | null
  message_count: number
  created_at: string
  updated_at: string
  // Planning group fields
  planning_brief?: PlanningBrief | null
  // Joined data
  theme?: EventTheme | null
  member_count?: number
  members?: HubGroupMember[]
  candidates?: HubGroupCandidate[]
}

export type HubMemberRole = 'owner' | 'admin' | 'chef' | 'member' | 'viewer'

export type HubDigestMode = 'instant' | 'hourly' | 'daily'

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
  last_notified_at?: string | null
  notify_email?: boolean
  notify_push?: boolean
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
  digest_mode?: HubDigestMode
  on_behalf_of_profile_id?: string | null
  is_co_host?: boolean
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
  | 'notification'

export type HubNotificationType =
  | 'quote_sent'
  | 'quote_accepted'
  | 'payment_received'
  | 'event_confirmed'
  | 'event_completed'
  | 'menu_shared'
  | 'photos_ready'
  | 'contract_ready'
  | 'invoice_sent'
  | 'guest_count_updated'
  | 'dietary_updated'
  | 'running_late'
  | 'repeat_booking_request'
  | 'event_reminder'
  | 'open_slot'

export type HubMessageSource = 'circle' | 'email' | 'remy' | 'system'

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
  notification_type: HubNotificationType | null
  action_url: string | null
  action_label: string | null
  source: HubMessageSource
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

export type HubPollType = 'single_choice' | 'multi_choice' | 'ranked_choice'
export type HubPollScope = 'general' | 'menu_course'
export type HubPollOptionType = 'standard' | 'opt_out'

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
  poll_scope?: HubPollScope
  event_id?: string | null
  source_menu_id?: string | null
  source_revision_id?: string | null
  course_number?: number | null
  course_name?: string | null
  allow_opt_out?: boolean
  max_selections?: number | null
  locked_option_id?: string | null
  locked_at?: string | null
  locked_by_profile_id?: string | null
  lock_reason?: string | null
  // Joined
  options?: HubPollOption[]
  total_votes?: number
  participant_count?: number
  total_selections?: number
  winning_option_ids?: string[]
}

export interface HubPollOption {
  id: string
  poll_id: string
  label: string
  metadata: Record<string, unknown> | null
  sort_order: number
  option_type?: HubPollOptionType
  dish_index_id?: string | null
  // Computed
  vote_count?: number
  first_choice_count?: number
  score?: number
  voted_by_me?: boolean
  ranked_by_me?: number | null
}

export interface HubPollVote {
  id: string
  poll_id: string
  option_id: string
  profile_id: string
  created_at: string
  ballot_id?: string
  rank?: number | null
  revoked_at?: string | null
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

// ---- Meal Board ----

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MealStatus = 'planned' | 'confirmed' | 'served' | 'cancelled'

export interface MealBoardEntry {
  id: string
  group_id: string
  author_profile_id: string
  meal_date: string
  meal_type: MealType
  title: string
  description: string | null
  dietary_tags: string[]
  allergen_flags: string[]
  menu_id: string | null
  dish_id: string | null
  head_count: number | null
  prep_notes: string | null
  serving_time: string | null
  assigned_profile_id: string | null
  assigned_display_name: string | null
  assignment_notes: string | null
  status: MealStatus
  created_at: string
  updated_at: string
  // Joined
  author?: HubGuestProfile
  feedback_summary?: MealFeedbackSummary
  my_feedback?: MealFeedback | null
}

export type RecurringPattern = 'daily' | 'weekdays' | 'weekends' | 'weekly'

export interface RecurringMeal {
  id: string
  group_id: string
  created_by_profile_id: string
  meal_type: MealType
  title: string
  description: string | null
  dietary_tags: string[]
  allergen_flags: string[]
  head_count: number | null
  prep_notes: string | null
  pattern: RecurringPattern
  day_of_week: number | null
  active_from: string
  active_until: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MealBoardWeek {
  weekStart: string // ISO date string (Monday)
  days: MealBoardDay[]
}

export interface MealBoardDay {
  date: string // ISO date string
  dayOfWeek: number // 0=Mon, 6=Sun
  entries: MealBoardEntry[]
}

// ---- Meal Feedback ----

export type MealReaction = 'loved' | 'liked' | 'neutral' | 'disliked'

export interface MealFeedback {
  id: string
  meal_entry_id: string
  profile_id: string
  reaction: MealReaction
  note: string | null
  created_at: string
  updated_at: string
  // Joined
  profile?: HubGuestProfile
}

export interface MealFeedbackSummary {
  loved: number
  liked: number
  neutral: number
  disliked: number
  total: number
  notes: { profile_name: string; note: string; reaction: MealReaction }[]
}

// ---- Meal Comments ----

export interface MealComment {
  id: string
  meal_entry_id: string
  author_profile_id: string
  body: string
  created_at: string
  // Joined
  author?: HubGuestProfile
}

// ---- Meal Requests ----

export type MealRequestStatus = 'pending' | 'planned' | 'declined'

export interface MealRequest {
  id: string
  group_id: string
  requested_by_profile_id: string
  title: string
  notes: string | null
  status: MealRequestStatus
  resolved_meal_id: string | null
  created_at: string
  resolved_at: string | null
  // Joined
  requested_by?: HubGuestProfile
}

// ---- Default Meal Times ----

export interface DefaultMealTimes {
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  snack: string | null
}

// ---- Planning Groups ----

export interface PlanningBrief {
  occasion?: string
  useCase?: 'personal' | 'friends' | 'family' | 'team' | 'work' | 'corporate'
  dateWindow?: string
  partySize?: number
  eventStyle?: string
  budget?: string
  dietarySummary?: string
  accessibilityNotes?: string
  locationSummary?: string
}

export type PlanningCandidateType = 'chef' | 'listing' | 'menu' | 'package' | 'meal_prep_item'

export interface CandidateSnapshot {
  title: string
  subtitle?: string
  imageUrl?: string
  eyebrow?: string
  locationLabel?: string
  priceLabel?: string
  dietaryTags?: string[]
  serviceModes?: string[]
  ctaLabel?: string
  href?: string
  sourceUpdatedAt?: string
}

export interface HubGroupCandidate {
  id: string
  group_id: string
  added_by_profile_id: string
  candidate_type: PlanningCandidateType
  chef_id?: string | null
  directory_listing_id?: string | null
  menu_id?: string | null
  experience_package_id?: string | null
  meal_prep_item_id?: string | null
  snapshot: CandidateSnapshot
  notes?: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Joined
  added_by?: HubGuestProfile
}

// ---- Client Passport ----

export type ServiceStyle =
  | 'formal_plated'
  | 'family_style'
  | 'buffet'
  | 'cocktail'
  | 'tasting_menu'
  | 'no_preference'
export type CommunicationMode = 'direct' | 'delegate_only' | 'delegate_preferred'
export type ContactMethod = 'email' | 'sms' | 'phone' | 'circle'
export type ChefAutonomyLevel = 'full' | 'high' | 'moderate' | 'low'

export interface PassportLocation {
  label: string
  address?: string
  city: string
  state: string
}

export interface ClientPassport {
  id: string
  client_id: string
  default_guest_count: number | null
  budget_range_min_cents: number | null
  budget_range_max_cents: number | null
  service_style: ServiceStyle | null
  communication_mode: CommunicationMode
  preferred_contact_method: ContactMethod | null
  max_interaction_rounds: number
  chef_autonomy_level: ChefAutonomyLevel
  auto_approve_under_cents: number | null
  standing_instructions: string | null
  default_locations: PassportLocation[]
  created_at: string
  updated_at: string
}

// ---- Private Messages ----

export interface PrivateThread {
  id: string
  group_id: string
  chef_profile_id: string
  member_profile_id: string
  last_message_at: string | null
  last_message_preview: string | null
  chef_unread_count: number
  member_unread_count: number
  created_at: string
  updated_at: string
  // Joined
  chef_profile?: HubGuestProfile
  member_profile?: HubGuestProfile
}

export interface PrivateMessage {
  id: string
  thread_id: string
  sender_profile_id: string
  body: string
  created_at: string
  deleted_at: string | null
  // Joined
  sender?: HubGuestProfile
}
