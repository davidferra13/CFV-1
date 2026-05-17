// Prep Schedule Types
// Types for the component-aware prep scheduling system.

export type PrepScheduleStatus = 'draft' | 'active' | 'completed'

export interface PrepSchedule {
  id: string
  event_id: string
  tenant_id: string
  generated_at: string
  status: PrepScheduleStatus
  created_at: string
  updated_at: string
}

export interface PrepTask {
  id: string
  schedule_id: string
  component_id: string | null
  description: string
  estimated_minutes: number
  actual_minutes: number | null
  sequence_order: number
  start_time: string | null
  due_time: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
}

export interface PrepTimeline {
  schedule: PrepSchedule
  tasks: PrepTask[]
  total_estimated_minutes: number
  total_actual_minutes: number | null
  completed_count: number
  total_count: number
}

// Info about a component's prep requirements, derived from menu data
export interface ComponentPrepInfo {
  component_id: string
  component_name: string
  category: string
  technique: string | null
  quantity: number
  estimated_minutes: number
  prep_day_offset: number | null
  make_ahead_window_hours: number | null
  prep_time_of_day: string | null
  prep_station: string | null
  storage_notes: string | null
}

// Input for creating a custom prep task
export interface CreatePrepTaskInput {
  description: string
  estimated_minutes?: number
  sequence_order?: number
  start_time?: string
  due_time?: string
  notes?: string
  component_id?: string
}

// Input for updating a prep task
export interface UpdatePrepTaskInput {
  description?: string
  estimated_minutes?: number
  actual_minutes?: number
  sequence_order?: number
  start_time?: string
  due_time?: string
  completed_at?: string | null
  notes?: string
}
