// Google Integration Type Definitions

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
  calendar_last_sync_at: string | null
}

export interface GoogleServiceStatus {
  connected: boolean
  email: string | null
  lastSync: string | null
}

export interface GoogleConnectionStatus {
  gmail: GoogleServiceStatus & { errorCount: number }
  calendar: GoogleServiceStatus
}

// The types below are specific to the Gmail agent
export interface ParsedEmail {
  messageId: string
  threadId: string
  from: { name: string; email: string }
  to: string
  subject: string
  body: string
  date: string
  snippet: string
  // Gmail metadata for deterministic classification (no AI needed)
  labelIds: string[] // Gmail's own labels: SPAM, CATEGORY_PROMOTIONS, etc.
  listUnsubscribe: string // RFC 2369 List-Unsubscribe header (mailing list signal)
  precedence: string // "bulk", "list", "junk" — mass email indicator
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
