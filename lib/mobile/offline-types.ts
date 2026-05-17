export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'

export interface OfflineAction {
  id: string
  tenantId: string
  actionType: string
  entityType: string
  entityId: string | null
  payload: Record<string, unknown>
  status: SyncStatus
  createdOfflineAt: string
  syncedAt: string | null
  conflictData: Record<string, unknown> | null
  retryCount: number
}

export interface SyncSession {
  id: string
  tenantId: string
  startedAt: string
  completedAt: string | null
  actionsTotal: number
  actionsSynced: number
  actionsFailed: number
  conflicts: number
}

export interface ConflictResolution {
  actionId: string
  resolution: 'keep_local' | 'keep_server' | 'merge'
  mergedData: Record<string, unknown> | null
}

export interface OfflineCapability {
  entityType: string
  supportedActions: string[]
  maxQueueSize: number
  priority: number
}
