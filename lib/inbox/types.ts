// Unified Inbox Type Definitions

export type InboxSource = 'chat' | 'message' | 'wix' | 'notification'

export type UnifiedInboxItem = {
  id: string
  tenant_id: string
  source: InboxSource
  preview: string | null
  activity_at: string
  actor_id: string | null
  conversation_id: string | null
  inquiry_id: string | null
  event_id: string | null
  client_id: string | null
  content_type: string | null
  is_read: boolean
}

export type InboxFilters = {
  sources?: InboxSource[]
  clientId?: string
  inquiryId?: string
  eventId?: string
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

export type InboxStats = {
  total: number
  unread: number
  bySource: Record<InboxSource, number>
}
