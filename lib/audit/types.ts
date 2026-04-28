/**
 * Operation Audit Log - Types
 *
 * Append-only mutation log for crash recovery, audit trail, and version timeline.
 * Every server action that mutates data should call logOperation().
 */

export type EntityType =
  | 'event'
  | 'client'
  | 'recipe'
  | 'menu'
  | 'quote'
  | 'ingredient'
  | 'vendor'
  | 'staff'
  | 'expense'
  | 'contract'
  | 'document'
  | 'conversation'
  | 'guest'
  | 'equipment'
  | 'product'
  | 'retainer'
  | 'invoice'
  | 'loyalty_reward'
  | 'kitchen_rental'
  | 'social_post'
  | 'template'

export type OperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'transition'  // FSM state changes
  | 'archive'
  | 'restore'
  | 'duplicate'
  | 'assign'      // ownership/role changes
  | 'link'        // relationship created (e.g., menu linked to event)
  | 'unlink'      // relationship removed

export type OperationDiff = {
  /** Fields that changed: { fieldName: { old: value, new: value } } */
  changes?: Record<string, { old: unknown; new: unknown }>
  /** For create operations: the full initial state */
  created?: Record<string, unknown>
  /** For transition operations: from/to states */
  from?: string
  to?: string
}

export type OperationMetadata = {
  /** What triggered this: 'user_action', 'automation', 'system', 'api' */
  source?: 'user_action' | 'automation' | 'system' | 'api' | 'migration'
  /** The server action or function name that performed the mutation */
  action?: string
  /** IP address (if available from request context) */
  ip?: string
  /** User agent (if available) */
  userAgent?: string
  /** Any additional context */
  [key: string]: unknown
}

export type OperationLogEntry = {
  id: number
  tenant_id: string
  actor_id: string
  entity_type: EntityType
  entity_id: string
  operation: OperationType
  diff: OperationDiff | null
  metadata: OperationMetadata
  created_at: string
}

export type EntitySnapshot = {
  id: number
  tenant_id: string
  entity_type: EntityType
  entity_id: string
  snapshot: Record<string, unknown>
  operation_log_id: number | null
  created_at: string
}

/** Input for logOperation() - tenant_id and actor_id resolved from session */
export type LogOperationInput = {
  entityType: EntityType
  entityId: string
  operation: OperationType
  diff?: OperationDiff
  metadata?: OperationMetadata
}

/** Input for creating an entity snapshot */
export type SnapshotInput = {
  entityType: EntityType
  entityId: string
  snapshot: Record<string, unknown>
  operationLogId?: number
}
