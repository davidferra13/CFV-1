/**
 * Operation Audit Log - Core logging utility
 *
 * Append-only mutation log. Non-blocking by design: if logging fails,
 * the main operation still succeeds (same pattern as notifications/emails).
 *
 * Usage in server actions:
 *   import { logOperation } from '@/lib/audit/log-operation'
 *
 *   // After a successful mutation:
 *   await logOperation({
 *     entityType: 'event',
 *     entityId: event.id,
 *     operation: 'update',
 *     diff: { changes: { status: { old: 'draft', new: 'proposed' } } },
 *     metadata: { action: 'updateEvent', source: 'user_action' }
 *   })
 */

import { pgClient } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/get-user'
import type { LogOperationInput, SnapshotInput, OperationLogEntry, EntitySnapshot } from './types'

// ─── Core: Log a mutation ────────────────────────────────────────────────────

/**
 * Log a mutation to the operation_log table.
 * Non-blocking: failures are caught and logged, never thrown.
 * Returns the log entry ID on success, null on failure.
 */
export async function logOperation(input: LogOperationInput): Promise<number | null> {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return null

    const [row] = await pgClient`
      INSERT INTO operation_log (tenant_id, actor_id, entity_type, entity_id, operation, diff, metadata)
      VALUES (
        ${user.tenantId},
        ${user.id},
        ${input.entityType},
        ${input.entityId},
        ${input.operation},
        ${input.diff ? JSON.stringify(input.diff) : null}::jsonb,
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
      RETURNING id
    `
    return row?.id ?? null
  } catch (err) {
    console.error('[non-blocking] Operation log write failed:', err)
    return null
  }
}

/**
 * Log a mutation with explicit tenant/actor IDs.
 * Use when session context is already resolved (avoids double auth lookup).
 */
export async function logOperationDirect(
  tenantId: string,
  actorId: string,
  input: LogOperationInput
): Promise<number | null> {
  try {
    const [row] = await pgClient`
      INSERT INTO operation_log (tenant_id, actor_id, entity_type, entity_id, operation, diff, metadata)
      VALUES (
        ${tenantId},
        ${actorId},
        ${input.entityType},
        ${input.entityId},
        ${input.operation},
        ${input.diff ? JSON.stringify(input.diff) : null}::jsonb,
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
      RETURNING id
    `
    return row?.id ?? null
  } catch (err) {
    console.error('[non-blocking] Operation log write failed:', err)
    return null
  }
}

// ─── Snapshots ───────────────────────────────────────────────────────────────

/**
 * Save a full entity snapshot. Use after creates or every N operations.
 * Non-blocking.
 */
export async function saveSnapshot(tenantId: string, input: SnapshotInput): Promise<number | null> {
  try {
    const [row] = await pgClient`
      INSERT INTO entity_snapshots (tenant_id, entity_type, entity_id, snapshot, operation_log_id)
      VALUES (
        ${tenantId},
        ${input.entityType},
        ${input.entityId},
        ${JSON.stringify(input.snapshot)}::jsonb,
        ${input.operationLogId ?? null}
      )
      RETURNING id
    `
    return row?.id ?? null
  } catch (err) {
    console.error('[non-blocking] Snapshot write failed:', err)
    return null
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get the operation timeline for an entity.
 * Returns newest-first by default.
 */
export async function getEntityTimeline(
  tenantId: string,
  entityType: string,
  entityId: string,
  opts?: { limit?: number; offset?: number }
): Promise<OperationLogEntry[]> {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  const rows = await pgClient`
    SELECT id, tenant_id, actor_id, entity_type, entity_id, operation, diff, metadata, created_at
    FROM operation_log
    WHERE tenant_id = ${tenantId}
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  return rows as unknown as OperationLogEntry[]
}

/**
 * Get the total operation count for an entity.
 */
export async function getEntityOperationCount(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const [row] = await pgClient`
    SELECT COUNT(*)::int as count
    FROM operation_log
    WHERE tenant_id = ${tenantId}
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
  `
  return row?.count ?? 0
}

/**
 * Get snapshots for an entity (newest first).
 */
export async function getEntitySnapshots(
  tenantId: string,
  entityType: string,
  entityId: string,
  opts?: { limit?: number }
): Promise<EntitySnapshot[]> {
  const limit = opts?.limit ?? 10

  const rows = await pgClient`
    SELECT id, tenant_id, entity_type, entity_id, snapshot, operation_log_id, created_at
    FROM entity_snapshots
    WHERE tenant_id = ${tenantId}
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows as unknown as EntitySnapshot[]
}

/**
 * Get recent operations across all entities for a tenant.
 * Useful for activity feeds and audit dashboards.
 */
export async function getTenantActivityLog(
  tenantId: string,
  opts?: { limit?: number; offset?: number; entityType?: string }
): Promise<OperationLogEntry[]> {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  if (opts?.entityType) {
    const rows = await pgClient`
      SELECT id, tenant_id, actor_id, entity_type, entity_id, operation, diff, metadata, created_at
      FROM operation_log
      WHERE tenant_id = ${tenantId}
        AND entity_type = ${opts.entityType}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    return rows as unknown as OperationLogEntry[]
  }

  const rows = await pgClient`
    SELECT id, tenant_id, actor_id, entity_type, entity_id, operation, diff, metadata, created_at
    FROM operation_log
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  return rows as unknown as OperationLogEntry[]
}
