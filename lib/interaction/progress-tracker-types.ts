export type ProgressStepStatus = 'pending' | 'active' | 'completed' | 'skipped'

export interface ProgressStep {
  id: string
  key: string
  label: string
  description: string
  order: number
  status: ProgressStepStatus
  completedAt: string | null
  icon: string
}

export interface EventProgress {
  id: string
  tenantId: string
  eventId: string
  steps: ProgressStep[]
  currentStepKey: string
  overallPercent: number
  clientVisible: boolean
  lastUpdatedAt: string
}

export interface ProgressTemplate {
  id: string
  tenantId: string
  name: string
  steps: { key: string; label: string; description: string; icon: string }[]
  isDefault: boolean
  createdAt: string
}

export interface ClientProgressView {
  eventTitle: string
  currentStep: string
  overallPercent: number
  steps: { label: string; status: ProgressStepStatus; description: string }[]
  nextMilestone: string | null
}
