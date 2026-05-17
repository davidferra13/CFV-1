export type CaptureCategory =
  | 'recipe_idea'
  | 'client_note'
  | 'shopping'
  | 'prep_reminder'
  | 'event_note'
  | 'menu_idea'
  | 'feedback'
  | 'general'
export type CaptureStatus = 'inbox' | 'triaged' | 'actioned' | 'dismissed'
export type CapturePriority = 'low' | 'normal' | 'high' | 'urgent'

export interface CaptureEntry {
  id: string
  tenant_id: string
  content: string
  category: CaptureCategory
  status: CaptureStatus
  priority: CapturePriority
  linked_event_id: string | null
  linked_client_id: string | null
  linked_recipe_id: string | null
  tags: string[]
  captured_at: string
  triaged_at: string | null
  actioned_at: string | null
  created_at: string
}

export interface CaptureStats {
  inbox: number
  triaged: number
  actioned: number
  total: number
}
