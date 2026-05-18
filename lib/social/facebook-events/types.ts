export interface FBEventInput {
  name: string
  description: string
  start_time: string // ISO 8601
  end_time?: string
  place?: { name: string; location?: { city: string; state?: string } }
  cover?: { source: string }
  event_category?: 'FOOD_TASTING' | 'DINING_EXPERIENCE' | 'OTHER'
  is_online?: boolean
  ticket_uri?: string
}

export interface FBEventResult {
  success: boolean
  fbEventId?: string
  fbEventUrl?: string
  error?: string
  retriable?: boolean
}

export interface FBEventSyncRecord {
  eventId: string
  tenantId: string
  fbEventId: string
  fbPageId: string
  syncedAt: string
  lastUpdatedAt: string
  status: 'active' | 'cancelled' | 'updated'
}
