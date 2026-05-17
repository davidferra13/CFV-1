// Graph regression testing, security auditing, and documentation types

export type TestResult = 'pass' | 'fail' | 'skip'

export type AuditType = 'access-control' | 'data-flow' | 'state-transition' | 'input-validation'

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface RegressionTestCase {
  id: string
  tenantId: string
  name: string
  lifecycleStage: string
  inputState: Record<string, unknown>
  expectedOutput: Record<string, unknown>
  lastResult: TestResult
  lastRunAt: Date | null
  createdAt: Date
}

export interface SecurityAuditEntry {
  id: string
  tenantId: string
  lifecycleStage: string
  auditType: AuditType
  finding: string
  severity: AuditSeverity
  mitigated: boolean
  mitigatedAt: Date | null
  createdAt: Date
}

export interface GraphDocEntry {
  id: string
  tenantId: string
  section: string
  title: string
  content: string
  version: number
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

export interface GraphSecuritySummary {
  totalTests: number
  passingTests: number
  failingTests: number
  totalFindings: number
  unmitigatedFindings: number
  docSections: number
}
