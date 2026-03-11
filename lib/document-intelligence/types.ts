export const DOCUMENT_INTELLIGENCE_DETECTED_TYPES = [
  'client_info',
  'recipe',
  'receipt',
  'document',
  'menu',
] as const

export type DocumentIntelligenceDetectedType =
  (typeof DOCUMENT_INTELLIGENCE_DETECTED_TYPES)[number]

export const DOCUMENT_INTELLIGENCE_DESTINATIONS = [
  'menu',
  'receipt',
  'client',
  'recipe',
  'document',
] as const

export type DocumentIntelligenceDestination = (typeof DOCUMENT_INTELLIGENCE_DESTINATIONS)[number]

export const DOCUMENT_INTELLIGENCE_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const

export type DocumentIntelligenceConfidence =
  (typeof DOCUMENT_INTELLIGENCE_CONFIDENCE_LEVELS)[number]

export const DOCUMENT_INTELLIGENCE_ITEM_STATUSES = [
  'uploaded',
  'classifying',
  'review',
  'routing',
  'completed',
  'failed',
] as const

export type DocumentIntelligenceItemStatus = (typeof DOCUMENT_INTELLIGENCE_ITEM_STATUSES)[number]

export const DOCUMENT_INTELLIGENCE_JOB_STATUSES = ['active', 'completed', 'archived'] as const

export type DocumentIntelligenceJobStatus = (typeof DOCUMENT_INTELLIGENCE_JOB_STATUSES)[number]

export type DocumentIntelligenceJob = {
  id: string
  source: string
  title: string | null
  status: DocumentIntelligenceJobStatus
  createdAt: string
  updatedAt: string
}

export type DocumentIntelligenceItem = {
  id: string
  jobId: string
  sourceFilename: string
  fileMimeType: string | null
  fileSizeBytes: number
  fileHash: string | null
  status: DocumentIntelligenceItemStatus
  detectedType: DocumentIntelligenceDetectedType | null
  suggestedDestination: DocumentIntelligenceDestination | null
  selectedDestination: DocumentIntelligenceDestination | null
  confidence: DocumentIntelligenceConfidence | null
  warnings: string[]
  extractedText: string | null
  extractedData: Record<string, unknown>
  errorMessage: string | null
  routedRecordType: string | null
  routedRecordId: string | null
  previewUrl: string | null
  createdAt: string
  updatedAt: string
  processedAt: string | null
}

export type DocumentIntelligenceArchiveState = {
  job: DocumentIntelligenceJob
  items: DocumentIntelligenceItem[]
}
