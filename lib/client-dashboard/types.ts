// Client Dashboard Widget Types
// Shared widget IDs + preference defaults for the client dashboard surface.

export const CLIENT_DASHBOARD_WIDGET_IDS = [
  'action_required',
  'upcoming_events',
  'event_history',
  'rewards',
  'quotes',
  'inquiries',
  'messages',
  'dinner_circle',
  'spending',
  'profile_health',
  'rsvp_ops',
  'documents',
  'book_again',
  'feedback',
  'assistant',
] as const

export type ClientDashboardWidgetId = (typeof CLIENT_DASHBOARD_WIDGET_IDS)[number]

export interface ClientDashboardWidgetPreference {
  id: ClientDashboardWidgetId
  enabled: boolean
}

const DEFAULT_ENABLED_WIDGET_IDS = new Set<ClientDashboardWidgetId>([
  'action_required',
  'upcoming_events',
  'event_history',
  'rewards',
  'feedback',
])

export const DEFAULT_CLIENT_DASHBOARD_WIDGETS: ClientDashboardWidgetPreference[] =
  CLIENT_DASHBOARD_WIDGET_IDS.map((id) => ({
    id,
    enabled: DEFAULT_ENABLED_WIDGET_IDS.has(id),
  }))

export const CLIENT_DASHBOARD_WIDGET_LABELS: Record<ClientDashboardWidgetId, string> = {
  action_required: 'Action Required',
  upcoming_events: 'Upcoming Events',
  event_history: 'Event History',
  rewards: 'Rewards',
  quotes: 'Quotes',
  inquiries: 'Inquiries',
  messages: 'Messages',
  dinner_circle: 'Dinner Circle',
  spending: 'Spending',
  profile_health: 'Profile Health',
  rsvp_ops: 'Guest RSVPs',
  documents: 'Documents',
  book_again: 'Book Again',
  feedback: 'Feedback',
  assistant: 'Event Questions',
}

export const CLIENT_DASHBOARD_WIDGET_DESCRIPTIONS: Record<ClientDashboardWidgetId, string> = {
  action_required: 'Your urgent tasks across proposals, payments, and pending items.',
  upcoming_events: 'Upcoming events and next dinner details.',
  event_history: 'Past and cancelled events in one place.',
  rewards: 'Loyalty tier, points, and available rewards.',
  quotes: 'Quote approvals and pending proposals.',
  inquiries: 'Open inquiry updates and status.',
  messages: 'Conversation and unread message visibility.',
  dinner_circle: 'Groups, friends, and social planning activity.',
  spending: 'Recent spend and trend snapshot.',
  profile_health: 'How complete your profile is and what to fill in next.',
  rsvp_ops: 'Guest sharing and RSVP tracking.',
  documents: 'Quick access to calendars, menus, and receipts.',
  book_again: 'Start a new booking quickly.',
  feedback: 'Post-event review and survey follow-through.',
  assistant: 'Quick answers about upcoming events, menus, and payment status.',
}
