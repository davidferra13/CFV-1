import type { EvidenceLabel } from '@/lib/operating-loop/types'

export type ResumeTrailSourceKind =
  | 'event'
  | 'menu'
  | 'inquiry'
  | 'quote'
  | 'note'
  | 'recipe'
  | 'client_profile'
  | 'vendor'
  | 'system'

export type ResumeTrailNextActionKind = 'continue' | 'review' | 'follow_up' | 'complete' | 'verify'

export interface ResumeTrailSource {
  id: string
  kind: ResumeTrailSourceKind
  status: string | null
}

export interface ResumeTrail {
  id: string
  source: ResumeTrailSource
  title: string
  description: string | null
  lastAction: string
  nextAction: string
  nextActionKind: ResumeTrailNextActionKind
  route: string
  evidenceLabel: EvidenceLabel
  timestamp: string
  rank: number
}

export interface ResumeTrailInput {
  id: string
  type: ResumeTrailSourceKind
  title: string
  subtitle?: string | null
  status?: string | null
  lastAction?: string | null
  lastActionAt?: string | null
  href?: string | null
  route?: string | null
  context?: Record<string, unknown> | null
}

export interface DeriveResumeTrailsOptions {
  limit?: number
  now?: Date
}
