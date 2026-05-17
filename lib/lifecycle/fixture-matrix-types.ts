// Fixture Matrix types for finish-gate proof tracking

export type CheckType = 'manual' | 'automated' | 'data-driven'
export type GateStatus = 'open' | 'passed' | 'failed' | 'waived'

export interface GateCriterion {
  id: string
  tenantId: string
  lifecycleStage: string
  criterionName: string
  description: string | null
  checkType: CheckType
  required: boolean
  sortOrder: number
  createdAt: Date
}

export interface GateResult {
  id: string
  tenantId: string
  eventId: string
  criterionId: string
  passed: boolean
  evidence: Record<string, unknown> | null
  checkedBy: string | null
  checkedAt: Date
  notes: string | null
  createdAt: Date
}

export interface FinishGate {
  id: string
  tenantId: string
  eventId: string
  lifecycleStage: string
  totalCriteria: number
  passedCriteria: number
  status: GateStatus
  evaluatedAt: Date | null
  createdAt: Date
}

export interface FixtureMatrixSummary {
  totalGates: number
  passedGates: number
  failedGates: number
  waivedGates: number
  criteriaByStage: Record<string, number>
}
