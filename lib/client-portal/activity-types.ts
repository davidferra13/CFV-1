import type {
  CircleActivityVerb,
  CircleActivityItem,
} from '@/lib/dinner-circles/activity-feed-types'

export const CLIENT_VISIBLE_VERBS: CircleActivityVerb[] = [
  'confirmed_attendance',
  'paid_deposit',
  'menu_locked',
  'guest_added',
  'message_sent',
  'contract_signed',
  'timeline_updated',
  'photo_added',
]

export interface ClientActivityItem {
  id: string
  eventId: string
  actorName: string
  actorRole: CircleActivityItem['actorRole']
  verb: CircleActivityVerb
  objectLabel: string
  timestamp: string
  metadata: Record<string, unknown>
}

export interface ClientActivityFeed {
  items: ClientActivityItem[]
  cursor: string | null
  hasMore: boolean
}
