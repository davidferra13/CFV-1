// Client-safe type definitions for unified communication threads.
// Extracted from unified-thread.ts so client components can import
// types without pulling in server-only dependencies (fs, drizzle, etc.).

export type UnifiedThreadItem = {
  id: string
  type: 'email' | 'sms' | 'chat' | 'phone' | 'note' | 'whatsapp' | 'manual_log' | 'other'
  content: string
  timestamp: string
  direction: 'inbound' | 'outbound'
  channel: string
  read: boolean
  senderName: string | null
  threadId: string | null
  linkedEntityType: 'inquiry' | 'event' | null
  linkedEntityId: string | null
}

export type UnifiedThreadResult = {
  items: UnifiedThreadItem[]
  total: number
  hasMore: boolean
}

export type LastContactInfo = {
  clientId: string
  clientName: string
  lastContactAt: string | null
  lastContactChannel: string | null
  lastContactDirection: 'inbound' | 'outbound' | null
  daysSinceContact: number | null
}
