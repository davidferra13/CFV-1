// Operational Visual Style Guardrails - Types
// Enforces consistent visual language across ChefFlow UI surfaces

export type GuardrailCategory =
  | 'spacing'
  | 'color'
  | 'typography'
  | 'border'
  | 'shadow'
  | 'animation'
  | 'layout'

export type GuardrailRule = {
  id: string
  tenantId: string
  category: GuardrailCategory
  name: string
  description: string | null
  pattern: string | null
  severity: 'error' | 'warning' | 'info'
  active: boolean
  createdAt: string
}

export type GuardrailViolation = {
  id: string
  tenantId: string
  ruleId: string
  route: string
  component: string | null
  details: string | null
  autoFixable: boolean
  fixedAt: string | null
  detectedAt: string
}

export type GuardrailSummary = {
  totalRules: number
  activeRules: number
  totalViolations: number
  byCategory: Record<GuardrailCategory, number>
  bySeverity: Record<'error' | 'warning' | 'info', number>
  autoFixableCount: number
}
