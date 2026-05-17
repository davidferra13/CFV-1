// Service Execution Tracker - Types
// Stage-based day-of service tracking for events

export const SERVICE_STAGES = [
  'en_route',
  'arrived',
  'prepping',
  'cooking',
  'plating',
  'serving',
  'cleanup',
  'done',
] as const

export type ServiceStage = (typeof SERVICE_STAGES)[number]

export const STAGE_LABELS: Record<ServiceStage, string> = {
  en_route: 'En Route',
  arrived: 'Arrived',
  prepping: 'Prepping',
  cooking: 'Cooking',
  plating: 'Plating',
  serving: 'Serving',
  cleanup: 'Cleanup',
  done: 'Done',
}

export type ServiceExecution = {
  id: string
  event_id: string
  tenant_id: string
  current_stage: ServiceStage
  started_at: string
  completed_at: string | null
  created_at: string
}

export type ServiceTimelineEntry = {
  id: string
  execution_id: string
  from_stage: ServiceStage | null
  to_stage: ServiceStage
  transitioned_at: string
  notes: string | null
  photo_url: string | null
}
