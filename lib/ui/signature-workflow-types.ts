export type WorkflowType =
  | 'event_creation'
  | 'menu_building'
  | 'client_onboarding'
  | 'quote_approval'
  | 'invoice_collection'
  | 'prep_day'
  | 'post_event'

export interface WorkflowStep {
  id: string
  label: string
  description?: string
  component?: string
  icon?: string
  estimatedMinutes?: number
  required: boolean
}

export interface SignatureWorkflow {
  id: string
  tenantId: string
  type: WorkflowType
  name: string
  steps: WorkflowStep[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkflowExecution {
  id: string
  tenantId: string
  workflowId: string
  entityId?: string | null
  currentStep: number
  completedSteps: string[]
  startedAt: string
  completedAt?: string | null
}

export interface WorkflowSummary {
  totalWorkflows: number
  active: number
  totalExecutions: number
  avgCompletionTime: number
  completionRate: number
}
