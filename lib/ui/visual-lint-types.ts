export type LintRuleCategory = 'spacing' | 'alignment' | 'color' | 'typography' | 'layout' | 'accessibility' | 'motion'

export type LintRule = {
  id: string
  tenantId: string
  name: string
  category: LintRuleCategory
  pattern: string
  severity: 'error' | 'warning' | 'info'
  autoFixable: boolean
  description: string
  createdAt: string
}

export type LintViolation = {
  id: string
  tenantId: string
  ruleId: string
  route: string
  component: string
  line: number
  column: number
  message: string
  autoFixed: boolean
  createdAt: string
  resolvedAt: string | null
}

export type LintAuditRun = {
  id: string
  tenantId: string
  routesScanned: number
  violationsFound: number
  autoFixed: number
  duration: number
  createdAt: string
}

export type LintSummary = {
  totalRules: number
  totalViolations: number
  unresolvedViolations: number
  lastAuditRun: string | null
  topViolatedRules: Array<{ ruleName: string; count: number }>
}
