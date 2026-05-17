export type TouchpointType =
  | 'welcome'
  | 'amuse_bouche'
  | 'course_intro'
  | 'palate_cleanser'
  | 'chef_visit'
  | 'intermezzo'
  | 'dessert_reveal'
  | 'farewell'
  | 'custom'

export interface EventTouchpoint {
  id: string
  event_id: string
  tenant_id: string
  type: TouchpointType
  name: string
  description: string | null
  timing_minutes: number | null // minutes after service start
  duration_minutes: number | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface TouchpointTemplate {
  id: string
  tenant_id: string
  name: string
  touchpoints: Omit<EventTouchpoint, 'id' | 'event_id' | 'tenant_id' | 'created_at'>[]
  times_used: number
  created_at: string
}
