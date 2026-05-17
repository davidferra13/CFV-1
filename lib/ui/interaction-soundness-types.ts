export type InteractionState = 'hover' | 'focus' | 'active' | 'disabled' | 'loading' | 'error'

export interface InteractionRule {
  id: string
  tenantId: string
  component: string
  interactionState: InteractionState
  cssProperty: string
  value: string
  transition: string | null
  description: string | null
  createdAt: Date
}

export interface InteractionAudit {
  id: string
  tenantId: string
  route: string
  component: string
  missingStates: string[]
  score: number
  notes: string | null
  auditedAt: Date
  createdAt: Date
}

export interface InteractionSummary {
  totalRules: number
  totalAudits: number
  avgScore: number
  componentsCovered: number
  missingStateCounts: Record<string, number>
}
