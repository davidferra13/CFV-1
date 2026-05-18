export type AutonomyDomain = 'communication' | 'financial' | 'logistics' | 'operations'

export type AutonomyRiskLevel = 'low' | 'medium' | 'high'

export type AutonomyMode = 'auto' | 'approval' | 'manual'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type ApprovalPreviewField = {
  label: string
  value: string
  before?: string
  after?: string
}

export type ApprovalImpact = {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'warning' | 'danger'
}

export type AutonomyActionPreview = {
  summary: string
  description?: string
  fields?: ApprovalPreviewField[]
  impacts?: ApprovalImpact[]
  draftText?: string
  warnings?: string[]
}

export type ApprovalRequest = {
  id: string
  title: string
  domain: AutonomyDomain
  riskLevel: AutonomyRiskLevel
  status?: ApprovalStatus
  affectedName?: string
  affectedDetail?: string
  confidence: number
  createdAtLabel?: string
  dueLabel?: string
  preview: AutonomyActionPreview
}

export type AutonomyDomainSetting = {
  domain: AutonomyDomain
  label: string
  description: string
  mode: AutonomyMode
  confidenceThreshold: number
  autoEligible?: boolean
  lockedReason?: string
}

export type LearningNudgeData = {
  actionType: string
  domain: AutonomyDomain
  approvalCount: number
  suggestedMode: AutonomyMode
  confidenceThreshold?: number
  sampleLabel?: string
}
