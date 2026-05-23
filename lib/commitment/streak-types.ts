import type { CommitmentDomain } from './types'

export type MilestoneType = '30d' | '60d' | '90d' | '180d' | '365d'

export const MILESTONE_DAY_VALUES: Record<MilestoneType, number> = {
  '30d': 30,
  '60d': 60,
  '90d': 90,
  '180d': 180,
  '365d': 365,
}

export interface CommitmentStreak {
  id: string
  commitmentId: string
  tenantId: string
  currentStreakDays: number
  longestStreak: number
  lastHonoredAt: Date | null
  lastBrokenAt: Date | null
  createdAt: Date
}

export interface IntegrityScore {
  /** Overall score from 0 (all broken) to 100 (all honored) */
  score: number
  /** Per-domain scores, keyed by CommitmentDomain */
  domainScores: Partial<Record<CommitmentDomain, number>>
  /** When this score was calculated */
  calculatedAt: Date
}

export interface Milestone {
  type: MilestoneType
  reachedAt: Date
}

export interface CommitmentStreakSummary {
  commitmentId: string
  domain: CommitmentDomain
  streak: CommitmentStreak
  milestones: Milestone[]
}

export interface IntegrityTrendPoint {
  date: string
  score: number
}
