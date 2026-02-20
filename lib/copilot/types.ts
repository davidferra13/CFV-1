export type CopilotSeverity = 'critical' | 'high' | 'normal' | 'low'

export type CopilotRecommendation = {
  recommendationType: string
  title: string
  body: string
  severity: CopilotSeverity
  confidence: number
  payload: Record<string, unknown>
}

export type CopilotPlanSummary = {
  criticalCount: number
  highCount: number
  normalCount: number
  lowCount: number
  generatedAt: string
}

export type CopilotPlan = {
  tenantId: string
  alerts: CopilotRecommendation[]
  recommendedActions: CopilotRecommendation[]
  safeAutoActions: CopilotRecommendation[]
  blockedActions: CopilotRecommendation[]
  summary: CopilotPlanSummary
}

export type CopilotRunResult = {
  runId: string
  plan: CopilotPlan
  status: 'success' | 'partial' | 'failed'
  errors: string[]
  durationMs: number
}
