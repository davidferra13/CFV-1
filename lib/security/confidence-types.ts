export type ConfidenceLevel = 'verified' | 'high' | 'medium' | 'low' | 'unverified' | 'stale'

export type EvidenceSource = 'user_input' | 'system_calculated' | 'ai_generated' | 'imported' | 'inferred' | 'external_api'

export interface ConfidenceLabel {
  entityType: string
  entityId: string
  field: string
  confidence: ConfidenceLevel
  source: EvidenceSource
  lastVerified: string | null
  verifiedBy: string | null
  staleDays: number
}

export interface ConfidencePolicy {
  entityType: string
  field: string
  minConfidence: ConfidenceLevel
  staleAfterDays: number
  requiresVerification: boolean
  allowAiGenerated: boolean
}

export interface ConfidenceSummary {
  entityType: string
  entityId: string
  overallConfidence: ConfidenceLevel
  fieldScores: { field: string; confidence: ConfidenceLevel; source: EvidenceSource }[]
  staleFields: string[]
  unverifiedCount: number
}
