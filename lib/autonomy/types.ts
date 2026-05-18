export type AutonomyDomain =
  | 'communication'
  | 'financial'
  | 'logistics'
  | 'client'
  | 'vendor'
  | 'marketing'
  | 'operations'
  | 'safety'
  | 'general'

export type ActionDomain = AutonomyDomain

export type AutonomyRiskLevel = 'low' | 'medium' | 'high' | 'restricted'

export type AutonomyMode = 'auto' | 'approval' | 'manual'

export type DraftMethod = 'template' | 'formula' | 'ai-enhanced'

export type ApprovalDecision = 'auto_execute' | 'queue_for_approval' | 'manual_only' | 'block'

export type AutonomyActionStatus =
  | 'drafted'
  | 'queued'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'blocked'
  | 'awaiting_executor'

export type ApprovalQueueStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type ExecutionStatus =
  | 'executed'
  | 'queued_for_approval'
  | 'blocked'
  | 'failed'
  | 'awaiting_executor'

export type LearningOutcome =
  | 'approved'
  | 'approved_with_edits'
  | 'rejected'
  | 'auto_executed'
  | 'failed'
  | 'promotion_suggested'

export interface AutonomyEntityRef {
  type: string
  id: string
  label?: string
}

export interface AutonomyEvidence {
  label: string
  value: string
  source?: string
  confidence?: number
}

export interface AutonomySituation {
  tenantId: string
  domain: AutonomyDomain
  source: string
  signalType: string
  title: string
  detail: string
  urgency: number
  confidenceScore: number
  entityRefs: AutonomyEntityRef[]
  payload: Record<string, unknown>
  detectedAt: string
}

export interface DetectSituationInput {
  tenantId: string
  domain?: AutonomyDomain
  source: string
  signalType: string
  title: string
  detail: string
  urgency?: number
  confidenceScore?: number
  entityRefs?: AutonomyEntityRef[]
  payload?: Record<string, unknown>
}

export interface AutonomyDraft {
  summary: string
  preview: string
  payload: Record<string, unknown>
  reversible: boolean
  evidence: AutonomyEvidence[]
  nextStepLabel: string
}

export interface AutonomyAction {
  id?: string
  tenantId: string
  domain: AutonomyDomain
  actionType: string
  title: string
  description: string
  riskLevel: AutonomyRiskLevel
  confidenceScore: number
  draftMethod: DraftMethod
  draft: AutonomyDraft
  source: string
  situation: AutonomySituation
  entityRefs: AutonomyEntityRef[]
  dedupKey: string
  status: AutonomyActionStatus
  createdAt: string
}

export interface ApprovalGate {
  decision: ApprovalDecision
  reason: string
  minConfidence: number
  matchedPolicy: string
  requiresChefReview: boolean
}

export interface ExecutionResult {
  status: ExecutionStatus
  actionId?: string
  approvalId?: string
  message: string
  error?: string
  gate: ApprovalGate
}

export interface LearningSignal {
  tenantId: string
  actionId?: string
  approvalId?: string
  domain: AutonomyDomain
  actionType: string
  outcome: LearningOutcome
  confidenceScore: number
  editedFields?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string
}

export interface AutonomyActionPolicy {
  actionType: string
  mode: AutonomyMode
  minConfidence?: number
  maxRiskLevel?: Exclude<AutonomyRiskLevel, 'restricted'>
}

export interface AutonomyPreferences {
  tenantId: string
  defaultMode: AutonomyMode
  minAutoConfidence: number
  domainModes: Partial<Record<AutonomyDomain, AutonomyMode>>
  actionPolicies: AutonomyActionPolicy[]
  blockedActionTypes: string[]
  allowHighRiskAuto: boolean
  learningPromotionThreshold: number
}

export type ChefPreferences = AutonomyPreferences

export interface ApprovalQueueItem {
  id: string
  tenantId: string
  autonomyActionId: string
  status: ApprovalQueueStatus
  domain: AutonomyDomain
  actionType: string
  title: string
  preview: string
  draft: AutonomyDraft
  riskLevel: AutonomyRiskLevel
  confidenceScore: number
  reason: string
  entityRefs: AutonomyEntityRef[]
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  rejectionReason: string | null
}

export interface AutonomyExecutor {
  execute(action: AutonomyAction): Promise<{ success: boolean; message: string; error?: string }>
}

export interface ProcessSituationOptions {
  executor?: AutonomyExecutor
  preferences?: AutonomyPreferences
}

export interface PromotionSuggestion {
  tenantId: string
  domain: AutonomyDomain
  actionType: string
  suggestedMode: AutonomyMode
  approvalCount: number
  editCount: number
  rejectionCount: number
  confidenceScore: number
  reason: string
}
