export type ImportSource = 'csv' | 'google_sheets' | 'manual' | 'honeybook' | 'square'
export type ImportEntity = 'clients' | 'recipes' | 'events' | 'ingredients'

export interface ImportJob {
  id: string
  tenantId: string
  source: ImportSource
  entityType: ImportEntity
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: number
  processedRows: number
  errorRows: number
  errors: { row: number; field: string; message: string }[]
  createdAt: string
  completedAt: string | null
}

export interface ActivationCheckpoint {
  id: string
  tenantId: string
  checkpoint: string
  completed: boolean
  completedAt: string | null
  order: number
}

export interface ActivationProgress {
  tenantId: string
  checkpoints: ActivationCheckpoint[]
  overallPercent: number
  currentStep: string
  daysActive: number
  nextRecommendation: string
}

export type ActivationStep =
  | 'profile'
  | 'first_recipe'
  | 'first_menu'
  | 'first_client'
  | 'first_event'
  | 'first_quote'
  | 'settings'
  | 'branding'
