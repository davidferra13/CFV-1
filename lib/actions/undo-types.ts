export type UndoActionType =
  | 'bulk_archive'
  | 'bulk_update'
  | 'bulk_delete'
  | 'bulk_dismiss'
  | 'bulk_status_change'
  | 'single_action'

export interface UndoRecord {
  id: string
  tenant_id: string
  action_type: UndoActionType
  entity_type: string // 'event', 'menu', 'notification', etc.
  entity_ids: string[]
  previous_state: Record<string, unknown>[] // snapshot of entities before action
  description: string // human-readable: "Archived 10 events"
  performed_by: string
  performed_at: string
  expires_at: string // undo window (default 30 min)
  undone: boolean
  undone_at: string | null
}

export interface BulkActionResult {
  success: boolean
  affected: number
  undoId: string // ID to pass to undoAction
  description: string
  expiresAt: string
}
