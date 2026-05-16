import type { EvidenceLabel } from '@/lib/operating-loop/types'

export type { EvidenceLabel }

export type EvidenceTone = 'success' | 'info' | 'warning' | 'danger' | 'muted'

export type EvidenceConfidenceBand = 'high' | 'medium' | 'low' | 'unknown'

export interface EvidenceLabelDefinition {
  label: EvidenceLabel
  title: string
  shortTitle: string
  description: string
  tone: EvidenceTone
  factual: boolean
  caution: boolean
  priority: number
}

export interface EvidenceMetadata {
  label: EvidenceLabel
  source?: string | null
  confidence?: number | null
  timestamp?: string | Date | null
  href?: string | null
}

export interface FormattedEvidenceMetadata {
  label: EvidenceLabel
  title: string
  shortTitle: string
  description: string
  tone: EvidenceTone
  factual: boolean
  caution: boolean
  priority: number
  sourceLabel: string | null
  confidenceLabel: string | null
  confidenceBand: EvidenceConfidenceBand
  timestampLabel: string | null
  href: string | null
  summary: string
}
