export type WorkActorType =
  | 'david_active'
  | 'david_supervisory'
  | 'ai_agent_runtime'
  | 'staff'
  | 'system'

export type WorkDurationKind = 'exact' | 'observed_window' | 'inferred' | 'unknown'
export type WorkSessionStatus =
  | 'proposed'
  | 'review_required'
  | 'approved'
  | 'rejected'
  | 'superseded'
export type WorkConfidenceTier = 'observed' | 'corroborated' | 'inferred' | 'unknown'
export type WorkCreationMode =
  | 'manual_clock'
  | 'manual_log'
  | 'forward_inference'
  | 'historical_import'
  | 'compatibility_projection'

export interface WorkEvidenceInput {
  id: string
  sourceType: string
  sourceRecordId: string
  actorType: WorkActorType
  signalType: string
  activityHint?: string | null
  sourceCreatedAt?: string | null
  intervalStart?: string | null
  intervalEnd?: string | null
  eventId?: string | null
  clientId?: string | null
  projectKey?: string | null
}

export interface InferredWorkSession {
  actorType: WorkActorType
  activityType: string
  startedAt: string | null
  endedAt: string | null
  durationMinutes: number | null
  durationKind: WorkDurationKind
  status: WorkSessionStatus
  confidenceTier: WorkConfidenceTier
  creationMode: WorkCreationMode
  summary: string
  evidenceIds: string[]
  sourceTypes: string[]
  eventId: string | null
  clientId: string | null
  projectKey: string | null
  boundaryGap: string | null
}
