export type EvidenceLevel =
  | 'verified'
  | 'calculated'
  | 'estimated'
  | 'user-provided'
  | 'system-default'

export type EvidenceLabelPosition = 'inline' | 'badge' | 'tooltip'

export type EvidenceLabelConfig = {
  id: string
  tenantId: string
  evidenceLevel: EvidenceLevel
  displayLabel: string
  bgColor: string
  textColor: string
  borderColor: string | null
  icon: string | null
  tooltipTemplate: string | null
  priority: number
  createdAt: Date
}

export type EvidenceLabelPlacement = {
  id: string
  tenantId: string
  route: string
  fieldName: string
  evidenceLevel: EvidenceLevel
  position: EvidenceLabelPosition
  visible: boolean
  createdAt: Date
}

export type EvidenceLabelSummary = {
  totalConfigs: number
  totalPlacements: number
  coverageByLevel: Record<EvidenceLevel, number>
}
