// Gmail Agent Type Definitions

export interface GoogleConnection {
  id: string
  chef_id: string
  tenant_id: string
  connected_email: string | null
  gmail_connected: boolean
  calendar_connected: boolean
  scopes: string[]
  gmail_history_id: string | null
  gmail_last_sync_at: string | null
  gmail_sync_errors: number
}

export interface GoogleConnectionStatus {
  connected: boolean
  email: string | null
  lastSync: string | null
  errorCount: number
}

export interface ParsedEmail {
  messageId: string
  threadId: string
  from: { name: string; email: string }
  to: string
  subject: string
  body: string
  date: string
  snippet: string
}

export type EmailCategory = 'inquiry' | 'existing_thread' | 'personal' | 'spam' | 'marketing'

export interface EmailClassification {
  category: EmailCategory
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  is_food_related: boolean
}

export interface SyncResult {
  processed: number
  inquiriesCreated: number
  messagesLogged: number
  skipped: number
  errors: string[]
}

export interface GmailSyncLogEntry {
  id: string
  gmail_message_id: string
  from_address: string | null
  subject: string | null
  classification: string
  confidence: string
  action_taken: string | null
  error: string | null
  synced_at: string
}

export interface SendMessageResult {
  success: boolean
  messageId: string
  gmailMessageId: string
  gmailThreadId: string
}
