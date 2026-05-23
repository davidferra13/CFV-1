import type { CommitmentDomain } from '@/lib/commitment/types'

export interface DomainStrength {
  domain: CommitmentDomain
  score: number
  streakDays: number
  overridesInPeriod: number
  label: string
}

export interface MonthlyPattern {
  description: string
  frequency: number
  dayOfWeek?: string
  domain?: CommitmentDomain
}

export interface MonthlyTrend {
  domain: CommitmentDomain
  direction: 'improving' | 'stable' | 'declining'
  deltaPercent: number
}

export interface MonthlySuggestion {
  text: string
  domain: CommitmentDomain
  priority: 'high' | 'medium' | 'low'
}

export interface MonthlyReport {
  id: string
  tenantId: string
  month: string
  year: number
  generatedAt: Date
  strongest: DomainStrength[]
  weakest: DomainStrength[]
  patterns: MonthlyPattern[]
  trends: MonthlyTrend[]
  suggestions: MonthlySuggestion[]
  overallIntegrity: number
  totalCommitments: number
  totalOverrides: number
  perfectDomains: CommitmentDomain[]
}
