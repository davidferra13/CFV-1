export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'status_change'

export interface AuditEntry {
  id: string
  tenant_id: string
  entity_type: string // 'event', 'menu', 'quote', etc.
  entity_id: string
  action: AuditAction
  actor_id: string
  actor_name: string | null
  changes: AuditChange[]
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditChange {
  field: string
  old_value: unknown
  new_value: unknown
}

export interface AuditSummary {
  entityType: string
  entityId: string
  totalChanges: number
  lastChangedAt: string | null
  lastChangedBy: string | null
  recentEntries: AuditEntry[]
}
