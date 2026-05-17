export type SimulationStatus = 'draft' | 'running' | 'completed' | 'failed'

export interface SimulationScenario {
  id: string
  tenantId: string
  name: string
  description: string
  steps: SimulationStep[]
  status: SimulationStatus
  startedAt: string | null
  completedAt: string | null
  results: SimulationResult | null
  createdAt: string
}

export interface SimulationStep {
  order: number
  action: string
  entityType: string
  data: Record<string, unknown>
  delay: number
  expectedOutcome: string
}

export interface SimulationResult {
  stepsExecuted: number
  stepsPassed: number
  stepsFailed: number
  duration: number
  errors: { step: number; error: string }[]
}

export interface ScenarioTemplate {
  id: string
  name: string
  description: string
  category: 'onboarding' | 'event_lifecycle' | 'billing' | 'communication' | 'stress_test'
  steps: SimulationStep[]
}
