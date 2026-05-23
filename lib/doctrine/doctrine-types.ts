// lib/doctrine/doctrine-types.ts
// Product Doctrine Registry types (P59)
// No DB tables; principles are hardcoded as the canonical product philosophy.

export type DoctrineCategory =
  | 'user-sovereignty'
  | 'data-integrity'
  | 'monetization-ethics'
  | 'operational-autonomy'
  | 'ai-philosophy'
  | 'infrastructure'
  | 'ux-identity'

export type DoctrinePrinciple = {
  id: string
  name: string
  description: string
  category: DoctrineCategory
  active: boolean
}

export type DoctrineViolation = {
  principleId: string
  principleName: string
  reason: string
  severity: 'hard-block' | 'warning' | 'advisory'
}

export type DoctrineEvaluation = {
  featureDescription: string
  violations: DoctrineViolation[]
  passed: boolean
  evaluatedAt: string
}

export type DoctrineCoverageEntry = {
  principleId: string
  principleName: string
  reflected: boolean
  evidence: string[]
}

export type DoctrineCoverageReport = {
  total: number
  reflected: number
  percentage: number
  entries: DoctrineCoverageEntry[]
  scannedAt: string
}
