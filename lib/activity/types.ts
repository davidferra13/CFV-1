// Activity tracking type definitions and shared constants.

import type { Tables } from '@/types/database'

export const ACTIVITY_EVENT_TYPES = [
  'portal_login',
  'event_viewed',
  'quote_viewed',
  'invoice_viewed',
  'proposal_viewed',
  'chat_message_sent',
  'rsvp_submitted',
  'form_submitted',
  'page_viewed',
  // High-intent signals
  'payment_page_visited',
  'document_downloaded',
  // List/navigation views
  'events_list_viewed',
  'quotes_list_viewed',
  'chat_opened',
  'rewards_viewed',
  // Time-on-page signal
  'session_heartbeat',
] as const

export const ACTOR_TYPES = ['client', 'chef', 'system'] as const
export const ACTIVITY_TIME_RANGES = ['1', '7', '30', '90'] as const

export type ActorType = (typeof ACTOR_TYPES)[number]
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number]
export type ActivityTimeRange = (typeof ACTIVITY_TIME_RANGES)[number]
export type ActivityCursor = string

export type ActivityEventRow = Tables<'activity_events'>
export type ActivityEvent = Omit<ActivityEventRow, 'actor_type' | 'event_type' | 'metadata'> & {
  actor_type: ActorType
  event_type: ActivityEventType
  metadata: Record<string, unknown>
}

export type ActivityActorFilter = 'all' | ActorType

export type ActivityQueryOptions = {
  limit?: number
  cursor?: ActivityCursor | null
  daysBack?: number
  actorType?: ActorType
  actorTypes?: ActorType[]
  eventTypes?: ActivityEventType[]
  excludeEventTypes?: ActivityEventType[]
  clientId?: string
}

export type ActivityQueryResult = {
  items: ActivityEvent[]
  nextCursor: ActivityCursor | null
}

export type ActiveClient = {
  client_id: string
  client_name: string
  last_activity: string
  event_type: ActivityEventType
  entity_type: string | null
  last_entity_id?: string | null
  metadata?: Record<string, unknown>
}

export type ActiveClientWithContext = ActiveClient & {
  engagement_level: 'hot' | 'warm' | 'cold' | 'none'
  engagement_signals: string[]
  entity_title: string | null
}
