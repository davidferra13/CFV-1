// Dashboard lifecycle feed types

export type FeedItemType =
  | 'stage-change'
  | 'action-completed'
  | 'action-required'
  | 'alert'
  | 'milestone'
  | 'comment'

export interface FeedItem {
  id: string
  tenantId: string
  eventId: string | null
  itemType: FeedItemType
  title: string
  description: string | null
  actorId: string | null
  actorName: string | null
  metadata: Record<string, unknown> | null
  readAt: Date | null
  createdAt: Date
}

export interface FeedFilter {
  id: string
  tenantId: string
  name: string
  itemTypes: string[]
  eventIds: string[]
  dateRange: { from: string; to: string } | null
  createdAt: Date
}

export interface FeedSummary {
  totalItems: number
  unreadCount: number
  itemsByType: Record<string, number>
  recentActivity: number
}

export interface FeedItemsQuery {
  itemTypes?: FeedItemType[]
  eventIds?: string[]
  unreadOnly?: boolean
  limit?: number
  offset?: number
}
