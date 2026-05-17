export type ReadinessStatus = 'ready' | 'needs_spec' | 'needs_tests' | 'complex' | 'blocked'

export interface CodexTask {
  id: string
  area: string
  description: string
  readiness: ReadinessStatus
  specPath: string | null
  testPath: string | null
  complexity: 'low' | 'medium' | 'high'
  dependencies: string[]
  lastAssessed: string
}

export interface ReadinessReport {
  totalAreas: number
  ready: number
  needsSpec: number
  needsTests: number
  complex: number
  blocked: number
  readinessPercent: number
  topBlockers: string[]
}

export interface CodexDispatchRecord {
  id: string
  taskDescription: string
  area: string
  dispatchedAt: string
  completedAt: string | null
  success: boolean | null
  notes: string | null
}
