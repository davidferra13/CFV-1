export const BUSINESS_HISTORY_FINDING_CATEGORIES = [
  'inquiry',
  'existing_thread',
  'client',
  'event',
  'preference',
  'payment_invoice',
  'follow_up',
] as const

export type BusinessHistoryFindingCategory = (typeof BUSINESS_HISTORY_FINDING_CATEGORIES)[number]

export type BusinessHistoryFindingStatus = 'pending' | 'imported' | 'dismissed'

export type BusinessHistoryConfidence = 'high' | 'medium' | 'low'

export type BusinessHistorySourceLane = 'organized' | 'recovery'

export type BusinessHistoryDestination =
  | 'clients'
  | 'events'
  | 'inquiries'
  | 'finance'
  | 'preferences'
  | 'tasks'
  | 'review_only'

export interface BusinessHistoryFinding {
  id: string
  source: 'gmail' | 'organized_import'
  sourceLabel: string
  sourceUrl: string | null
  category: BusinessHistoryFindingCategory
  proposedDestination: BusinessHistoryDestination
  confidence: BusinessHistoryConfidence
  status: BusinessHistoryFindingStatus
  summary: string
  detail: string | null
  fromAddress: string | null
  subject: string | null
  receivedAt: string | null
  reviewedAt: string | null
  importedInquiryId: string | null
  duplicateHints: DuplicateHint[]
}

export interface DuplicateHint {
  entityType: 'client' | 'event' | 'finding'
  entityId: string
  label: string
  reason: string
  strength: 'exact' | 'strong' | 'weak'
}

export interface ExistingClientHint {
  id: string
  fullName: string | null
  email: string | null
}

export interface ExistingEventHint {
  id: string
  occasion: string | null
  eventDate: string | null
  clientName?: string | null
}

export interface BusinessHistorySummary {
  counts: {
    staged: number
    imported: number
    dismissed: number
    clients: number
    events: number
    inquiries: number
    expenses: number
    ledgerEntries: number
  }
  byCategory: Array<{
    category: BusinessHistoryFindingCategory | 'unknown'
    pending: number
    imported: number
    dismissed: number
  }>
  scan: {
    enabled: boolean
    status: string
    totalProcessed: number
    lastRunAt: string | null
  } | null
  importLogCount: number
  nextActions: Array<{
    label: string
    href: string
    tone: 'primary' | 'secondary'
  }>
}
