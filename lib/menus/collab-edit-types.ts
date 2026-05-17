// Collaborative Menu Editing: types for turn-based chef+client co-editing sessions.
// Client submits dish change proposals; chef reviews each one (accept/reject/counter).

export type SuggestionType =
  | 'add_dish'
  | 'remove_dish'
  | 'swap_dish'
  | 'modify_component'
  | 'comment'
  | 'reorder'
  | 'add_course'
  | 'remove_course'

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'modified'

export type CollabSessionStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'superseded'

export type EditorType = 'chef' | 'client' | 'co_host'

export type EditSuggestion = {
  id: string
  session_id: string
  change_type: SuggestionType
  target_dish_id: string | null
  target_course_name: string | null
  target_course_number: number | null
  change_data: Record<string, unknown>
  resolution: SuggestionStatus
  resolution_notes: string | null
  counter_proposal: Record<string, unknown> | null
  sort_order: number
  created_at: string
  resolved_at: string | null
}

export type CollabSession = {
  id: string
  menu_id: string
  event_id: string
  tenant_id: string
  editor_type: EditorType
  editor_id: string
  forked_from_menu_id: string | null
  version_number: number
  base_snapshot: Record<string, unknown>
  proposed_snapshot: Record<string, unknown> | null
  current_turn: EditorType
  turn_changed_at: string
  status: CollabSessionStatus
  client_token: string | null
  started_at: string
  submitted_at: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export type CollabSessionWithSuggestions = CollabSession & {
  suggestions: EditSuggestion[]
}

export type ReviewAction = 'approve' | 'reject' | 'counter_propose'
