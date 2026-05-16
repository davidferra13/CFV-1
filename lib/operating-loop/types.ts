export type LoopState =
  | 'active'
  | 'waiting'
  | 'blocked'
  | 'stale'
  | 'done'
  | 'dismissed'
  | 'snoozed'
  | 'uncertain'

export type SourceKind =
  | 'task'
  | 'notification'
  | 'reminder'
  | 'cil_signal'
  | 'client_profile'
  | 'rail'
  | 'event'
  | 'inquiry'
  | 'message'
  | 'menu'
  | 'recipe'
  | 'quote'
  | 'payment'
  | 'vendor'
  | 'handoff'
  | 'system'

export type OperatingLoopSourceKind = SourceKind

export type EvidenceLabel =
  | 'confirmed'
  | 'computed'
  | 'inferred'
  | 'claimed'
  | 'stale'
  | 'unknown'
  | 'disputed'
  | 'user_entered'

export type WaitingOnKind =
  | 'person'
  | 'system'
  | 'time'
  | 'decision'
  | 'payment'
  | 'reply'
  | 'import'
  | 'vendor'

export interface WaitingOn {
  kind: WaitingOnKind
  label: string
  followUpAt: string | null
}

export interface ResumeContext {
  lastAction: string | null
  timestamp: string | null
  sourceRoute: string | null
  nextStep: string | null
}

export type ResumeTrailEmptyReason = 'no_sources' | 'no_resumable_sources'

export interface ResumeTrailEvidence {
  label: EvidenceLabel
  sourceKind: SourceKind
  sourceId: string
  sourceItemId: string
  confidence: number | null
  proofHref: string | null
  weak: boolean
  reason: string
}

export interface ResumeTrail {
  id: string
  sourceId: string
  sourceKind: SourceKind
  sourceItemId: string
  title: string
  description: string | null
  lastAction: string
  lastActionAt: string | null
  nextAction: string
  route: string
  evidence: ResumeTrailEvidence
}

export interface ResumeTrailEmptyState {
  reason: ResumeTrailEmptyReason
  message: string
}

export interface ResumeTrailCollection {
  state: 'ready' | 'empty'
  trails: ResumeTrail[]
  emptyState: ResumeTrailEmptyState | null
}

export interface ResumeTrailOptions {
  limit?: number
}

export interface OperatingLoopItem {
  id: string
  sourceId: string
  sourceKind: SourceKind
  loopState: LoopState
  evidenceLabel: EvidenceLabel
  confidence: number | null
  title: string
  description: string | null
  nextAction: string | null
  waitingOn: WaitingOn | null
  resumeContext: ResumeContext | null
  proofHref: string | null
  sourceRoute: string | null
  createdAt: string | null
  dueAt: string | null
}

export interface OperatingLoopAdapterOptions {
  now?: Date
}

export interface TaskLikeSource {
  id: string
  title: string
  description?: string | null
  status?: string | null
  priority?: string | null
  createdAt?: string | null
  dueAt?: string | null
  completedAt?: string | null
  route?: string | null
  actionUrl?: string | null
  sourceRoute?: string | null
  nextAction?: string | null
}

export interface ReminderLikeSource {
  id: string
  title: string
  description?: string | null
  status?: string | null
  createdAt?: string | null
  dueAt?: string | null
  snoozedUntil?: string | null
  route?: string | null
  actionUrl?: string | null
  sourceRoute?: string | null
  nextAction?: string | null
}

export interface NotificationLikeSource {
  id: string
  title: string
  description?: string | null
  action?: string | null
  status?: string | null
  priority?: string | null
  createdAt?: string | null
  dueAt?: string | null
  route?: string | null
  actionUrl?: string | null
  sourceRoute?: string | null
  metadata?: Record<string, unknown> | null
}

export interface CILSignalLikeSource {
  id: string
  title: string
  detail?: string | null
  suggestedAction?: string | null
  confidence?: number | null
  status?: string | null
  actionType?: string | null
  createdAt?: string | number | null
  route?: string | null
  actionPayload?: Record<string, unknown> | null
}

export interface ProfileCompletenessLikeSource {
  clientId: string
  clientName: string
  score: number
  missing: string[]
  tier?: 'complete' | 'good' | 'basic' | 'minimal' | string | null
  updatedAt?: string | null
  route?: string | null
  href?: string | null
}

export interface ClientProfileLoopSource {
  clientId: string
  clientName: string
  href?: string | null
  route?: string | null
  score: number
  missing: string[]
  tier: 'complete' | 'good' | 'basic' | 'minimal'
  updatedAt?: string | null
}
