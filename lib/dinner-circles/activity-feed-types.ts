export type CircleActivityVerb =
  | 'confirmed_attendance'
  | 'paid_deposit'
  | 'menu_locked'
  | 'ingredient_sourced'
  | 'substitution_proposed'
  | 'guest_added'
  | 'message_sent'
  | 'contract_signed'
  | 'timeline_updated'
  | 'photo_added'

export interface CircleActivityItem {
  id: string
  circleId: string
  eventId: string
  actorName: string
  actorRole: 'chef' | 'client' | 'guest' | 'staff' | 'system'
  actionVerb: CircleActivityVerb
  objectType: string
  objectLabel: string
  timestamp: string
  metadata: Record<string, unknown>
}

export interface CircleActivityFeed {
  items: CircleActivityItem[]
  cursor: string | null
  hasMore: boolean
}
