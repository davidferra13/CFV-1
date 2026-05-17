export type EvidenceType =
  | 'photo'
  | 'document'
  | 'review'
  | 'certification'
  | 'metric'
  | 'testimonial'
export type EvidenceLevel = 'verified' | 'self_reported' | 'pending' | 'expired'

export interface EvidenceItem {
  id: string
  tenantId: string
  entityType: string
  entityId: string
  type: EvidenceType
  level: EvidenceLevel
  label: string
  value?: string | null
  mediaUrl?: string | null
  verifiedAt?: string | null
  expiresAt?: string | null
  createdAt: string
}

export interface EvidenceDisplayRule {
  id: string
  tenantId: string
  entityType: string
  evidenceType: string
  position: number
  showLevel: boolean
  showDate: boolean
  required: boolean
  createdAt: string
}

export interface EvidenceGrammarSummary {
  totalItems: number
  byType: Record<EvidenceType, number>
  byLevel: Record<EvidenceLevel, number>
  verifiedPercent: number
  expiringCount: number
}
