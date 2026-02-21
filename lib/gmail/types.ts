// Re-export shim — canonical types live in lib/google/types.ts
// Kept here for import compatibility with lib/gmail/* files that use ./types
export type {
  GoogleConnection,
  GoogleConnectionStatus,
  ParsedEmail,
  EmailClassification,
  EmailCategory,
  SyncResult,
  GmailSyncLogEntry,
  SendMessageResult,
} from '@/lib/google/types'
