// Day-Of Timeline Auto-Generation - Types
// Planning-side complement to service-tracker (execution-side)

export const BLOCK_TYPES = [
  'travel',
  'setup',
  'prep',
  'cook',
  'fire',
  'plate',
  'serve',
  'cleanup',
  'advance_prep',
  'custom',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  travel: 'Travel',
  setup: 'Setup',
  prep: 'Prep',
  cook: 'Cook',
  fire: 'Fire',
  plate: 'Plate',
  serve: 'Serve',
  cleanup: 'Cleanup',
  advance_prep: 'Advance Prep',
  custom: 'Custom',
}

export const TIMELINE_STATUSES = ['draft', 'finalized', 'in_progress', 'completed'] as const
export type TimelineStatus = (typeof TIMELINE_STATUSES)[number]

export type TimelineBlock = {
  id: string
  timeline_id: string
  block_type: BlockType
  label: string
  start_time: string // ISO timestamp
  end_time: string // ISO timestamp
  duration_minutes: number
  sequence: number
  notes: string | null
  completed_at: string | null
  course_number: number | null
  is_parallel: boolean
  created_at: string
}

export type EventTimeline = {
  id: string
  event_id: string
  tenant_id: string
  service_time: string // ISO timestamp (the anchor)
  generated_at: string
  status: TimelineStatus
  travel_minutes: number | null
  setup_minutes: number
  cleanup_minutes: number
  created_at: string
  updated_at: string
  blocks?: TimelineBlock[]
}

// Input for generating a timeline
export type TimelineGenerationInput = {
  eventId: string
  serviceTime: string // ISO timestamp
  travelMinutes?: number
  setupMinutes?: number
  cleanupMinutes?: number
}

// Input for adding a custom block
export type AddBlockInput = {
  block_type: BlockType
  label: string
  start_time: string
  duration_minutes: number
  notes?: string
  course_number?: number
  is_parallel?: boolean
}

// Input for updating a block
export type UpdateBlockInput = {
  label?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  notes?: string
  sequence?: number
}

// Course timing estimate from the estimator
export type CourseEstimate = {
  courseNumber: number
  courseName: string
  prepMinutes: number
  fireMinutes: number
  plateMinutes: number
  variantCount: number
  variantExtraMinutes: number
}
