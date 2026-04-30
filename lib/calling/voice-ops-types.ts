import type { VoiceAgentDecision, VoiceAgentRole } from '@/lib/calling/voice-agent-contract'

export type VoiceConsentState = 'allowed' | 'unknown' | 'manual_only' | 'opted_out'
export type VoiceProfessionalRiskLevel = 'low' | 'medium' | 'high'
export type VoiceActionUrgency = 'standard' | 'review' | 'urgent'

export type VoiceCampaignLaunchMode = 'safe_serialized' | 'parallel_limited'

export type VoicePostCallActionType =
  | 'create_quick_note'
  | 'create_inquiry'
  | 'create_task'
  | 'link_call_record'
  | 'mark_ai_call_opt_out'
  | 'review_menu'
  | 'review_dietary_safety'
  | 'review_pricing'
  | 'schedule_human_callback'
  | 'send_chef_alert'
  | 'attach_recording'

export interface VoiceCampaignRecipientInput {
  id?: string
  contactPhone: string
  contactName?: string | null
  contactType?: 'vendor' | 'venue' | 'business' | 'client' | 'unknown'
  role: VoiceAgentRole
  subject?: string | null
  consentState?: VoiceConsentState
  source?: string
}

export interface VoiceCampaignRecipientPlan extends VoiceCampaignRecipientInput {
  normalizedPhone: string
  status: 'reserved' | 'skipped' | 'manual_review'
  skipReason: string | null
  professionalRisk: VoiceProfessionalRiskLevel
}

export interface VoiceCampaignPlan {
  name: string
  purpose: string
  launchMode: VoiceCampaignLaunchMode
  maxConcurrentLaunches: number
  requestedCount: number
  reservedCount: number
  skippedCount: number
  manualReviewCount: number
  recipients: VoiceCampaignRecipientPlan[]
  summary: {
    canLaunchAutomatically: boolean
    blockedReasons: string[]
  }
}

export interface VoiceCallLike {
  id: string
  aiCallId?: string | null
  supplierCallId?: string | null
  direction?: 'inbound' | 'outbound' | string | null
  role?: string | null
  contactPhone?: string | null
  contactName?: string | null
  contactType?: string | null
  subject?: string | null
  status?: string | null
  result?: 'yes' | 'no' | string | null
  fullTranscript?: string | null
  speechTranscript?: string | null
  extractedData?: Record<string, unknown> | null
  actionLog?: unknown
  recordingUrl?: string | null
  durationSeconds?: number | null
  createdAt?: string | null
}

export interface VoicePostCallAction {
  id?: string
  type: VoicePostCallActionType
  label: string
  detail: string
  urgency: VoiceActionUrgency
  status: 'planned' | 'completed' | 'needs_review' | 'skipped' | 'failed'
  targetType?: string
  targetId?: string
  createdAt?: string
  completedAt?: string
  metadata?: Record<string, unknown>
  evidence?: VoicePostCallActionEvidence
}

export interface VoicePostCallActionEvidence {
  source: string
  reason: string
  hapticReason: string
  duplicatePolicy: string
  aiCallId?: string
  supplierCallId?: string
  target?: string
  createdAt?: string
  completedAt?: string
  closeoutIntent?: string
  closeoutNote?: string
  snoozedUntil?: string
  eventTypes: string[]
  complianceSignals: string[]
  trustChecklist: VoiceTrustChecklistItem[]
  scriptQuality?: {
    allowedToLaunch?: boolean
    level?: string
    score?: number
    requiredFixes: string[]
  }
}

export interface VoiceTrustChecklistItem {
  label: string
  status: 'passed' | 'missing' | 'unknown'
  detail: string
}

export interface VoicePostCallPlan {
  callId: string
  decision: VoiceAgentDecision | null
  professionalRisk: VoiceProfessionalRiskLevel
  actions: VoicePostCallAction[]
  reportLine: string
}

export interface VoiceSessionEventDraft {
  eventType: string
  sequence: number
  occurredAt: string
  payload: Record<string, unknown>
}

export interface VoiceOpsReport {
  totalCalls: number
  activeCalls: number
  completedCalls: number
  failedCalls: number
  recordingCount: number
  missingRecordingCount: number
  optOutCount: number
  urgentReviewCount: number
  menuReviewCount: number
  pricingReviewCount: number
  unresolvedDecisionCount: number
  answerRate: number
  topNextActions: VoicePostCallAction[]
  failedRecoveryActions: VoicePostCallAction[]
  snoozedActions: VoicePostCallAction[]
  professionalRisks: Array<{
    callId: string
    level: VoiceProfessionalRiskLevel
    reason: string
  }>
}

export interface MenuCallCoordination {
  category:
    | 'menu_confirmation'
    | 'menu_revision'
    | 'dietary_review'
    | 'restricted_creative_request'
    | 'not_menu_related'
  allowedToHandleByVoice: boolean
  urgency: VoiceActionUrgency
  response: string
  followUpPrompt: string
}
