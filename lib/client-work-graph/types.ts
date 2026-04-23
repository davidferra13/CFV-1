export type ClientWorkItemKind =
  | 'event_proposal'
  | 'event_contract'
  | 'event_payment'
  | 'event_balance'
  | 'event_booking_change'
  | 'event_menu'
  | 'event_checklist'
  | 'event_review'
  | 'quote_review'
  | 'inquiry_reply'
  | 'profile_completion'
  | 'meal_request'
  | 'signal_notifications'
  | 'rsvp_pending'
  | 'share_setup'
  | 'hub_unread'
  | 'notification_follow_up'
  | 'stub_planning'
  | 'stub_seeking_chef'

export type ClientWorkItemCategory =
  | 'event'
  | 'quote'
  | 'inquiry'
  | 'profile'
  | 'rsvp'
  | 'hub'
  | 'notification'
  | 'planning'

export type ClientWorkItemUrgency = 'high' | 'medium' | 'low'

export type ClientGraphEvent = {
  id: string
  status: string
  event_date: string
  occasion: string | null
  quoted_price_cents: number | null
  guest_count: number | null
  location_address?: string | null
  location_city?: string | null
  hub_group?: { group_token: string } | null
  menu_approval_status?: string | null
  menu_modified_after_approval?: boolean | null
  menu_approval_updated_at?: string | null
  pre_event_checklist_confirmed_at?: string | null
  hasContract?: boolean
  contractStatus?: string | null
  contractSignedAt?: string | null
  hasReview?: boolean
  hasOutstandingBalance?: boolean
  pendingGuestCountChange?: {
    id: string
    previousCount: number
    newCount: number
    requestedAt: string
  } | null
}

export type ClientGraphQuote = {
  id: string
  status: string
  event_id?: string | null
  quote_name?: string | null
  total_quoted_cents: number | null
  valid_until?: string | null
  sent_at?: string | null
  created_at?: string
  inquiry?: {
    confirmed_occasion?: string | null
    confirmed_date?: string | null
    confirmed_guest_count?: number | null
  } | null
  event?: {
    occasion?: string | null
    event_date?: string | null
  } | null
}

export type ClientGraphInquiry = {
  id: string
  status: string
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_guest_count: number | null
  confirmed_location: string | null
  follow_up_due_at?: string | null
  next_action_required?: string | null
  updated_at: string
  converted_to_event_id?: string | null
}

export type ClientProfileWorkSummary = {
  completionPercent: number
  completedFields: number
  totalFields: number
  pendingMealRequests: number
  signalNotificationsEnabled: boolean
}

export type ClientHubWorkSummary = {
  groupCount: number
  friendCount: number
  pendingFriendRequestCount: number
  totalUnreadCount: number
  unreadLoadFailed?: boolean
}

export type ClientRsvpWorkSummary = {
  eventId: string
  occasion: string | null
  totalGuests: number
  attendingCount: number
  pendingCount: number
  hasActiveShare: boolean
} | null

export type ClientNotificationWorkSummary = {
  unreadCount: number
  unread: Array<{
    id: string
    title: string
    actionUrl: string | null
    createdAt: string
  }>
}

export type ClientEventStubSummary = {
  id: string
  title: string
  occasion: string | null
  status: 'planning' | 'seeking_chef' | 'adopted' | 'cancelled'
  hubGroupId: string | null
  eventDate: string | null
  guestCount: number | null
}

export type ClientWorkItem = {
  id: string
  kind: ClientWorkItemKind
  category: ClientWorkItemCategory
  sourceId: string
  sourceType:
    | 'event'
    | 'quote'
    | 'inquiry'
    | 'profile'
    | 'rsvp'
    | 'hub'
    | 'notification'
    | 'event_stub'
  urgency: ClientWorkItemUrgency
  title: string
  detail: string
  href: string
  ctaLabel: string
  eventDate?: string | null
}

export type ClientEventAction = {
  eventId: string
  kind: ClientWorkItemKind
  title: string
  detail: string
  href: string
  ctaLabel: string
  urgency: ClientWorkItemUrgency
}

export type ClientWorkGraphSummary = {
  totalItems: number
  proposalCount: number
  paymentDueCount: number
  outstandingBalanceCount: number
  quotePendingCount: number
  inquiryAwaitingCount: number
  menuApprovalCount: number
  checklistCount: number
  rsvpPendingCount: number
  hubUnreadCount: number
  profileCount: number
  notificationCount: number
  planningCount: number
}

export type ClientWorkGraph = {
  generatedAt: string
  primary: ClientWorkItem | null
  items: ClientWorkItem[]
  eventActionsById: Record<string, ClientEventAction>
  summary: ClientWorkGraphSummary
}

export type ClientWorkGraphInput = {
  events: ClientGraphEvent[]
  quotes: ClientGraphQuote[]
  inquiries: ClientGraphInquiry[]
  profileSummary: ClientProfileWorkSummary
  hubSummary: ClientHubWorkSummary
  rsvpSummary: ClientRsvpWorkSummary
  notificationSummary: ClientNotificationWorkSummary
  eventStubs: ClientEventStubSummary[]
}
