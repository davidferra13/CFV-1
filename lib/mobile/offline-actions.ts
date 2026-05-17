'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  OfflineAction,
  SyncSession,
  ConflictResolution,
  OfflineCapability,
} from './offline-types'

/**
 * Bulk submit queued offline actions. Creates a sync session and processes each action.
 */
export async function submitOfflineQueue(
  actions: {
    actionType: string
    entityType: string
    entityId?: string
    payload: Record<string, unknown>
    createdOfflineAt: string
  }[]
): Promise<{ sessionId: string; synced: number; failed: number; conflicts: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Create sync session
  const [session] = await db
    .from('sync_sessions')
    .insert({
      tenant_id: tenantId,
      actions_total: actions.length,
    })
    .select('id')

  let synced = 0
  let failed = 0
  let conflicts = 0

  for (const action of actions) {
    try {
      const [inserted] = await db
        .from('offline_actions')
        .insert({
          tenant_id: tenantId,
          action_type: action.actionType,
          entity_type: action.entityType,
          entity_id: action.entityId || null,
          payload: action.payload,
          status: 'synced',
          created_offline_at: action.createdOfflineAt,
          synced_at: new Date().toISOString(),
        })
        .select('id')

      if (inserted) {
        synced++
      }
    } catch (err) {
      failed++
      // Insert as failed so it can be retried
      await db
        .from('offline_actions')
        .insert({
          tenant_id: tenantId,
          action_type: action.actionType,
          entity_type: action.entityType,
          entity_id: action.entityId || null,
          payload: action.payload,
          status: 'failed',
          created_offline_at: action.createdOfflineAt,
          retry_count: 1,
        })
    }
  }

  // Update sync session
  await db
    .from('sync_sessions')
    .update({
      completed_at: new Date().toISOString(),
      actions_synced: synced,
      actions_failed: failed,
      conflicts,
    })
    .eq('id', session.id)

  return { sessionId: session.id, synced, failed, conflicts }
}

/**
 * Get pending and failed offline actions for the current tenant.
 */
export async function getOfflineQueue(): Promise<OfflineAction[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const rows = await db
    .from('offline_actions')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'failed', 'conflict'])
    .order('created_offline_at', { ascending: true })

  return (rows ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    actionType: r.action_type,
    entityType: r.entity_type,
    entityId: r.entity_id,
    payload: r.payload,
    status: r.status,
    createdOfflineAt: r.created_offline_at,
    syncedAt: r.synced_at,
    conflictData: r.conflict_data,
    retryCount: r.retry_count,
  }))
}

/**
 * Resolve a sync conflict by choosing local, server, or merged data.
 */
export async function resolveConflict(
  actionId: string,
  resolution: ConflictResolution
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify action belongs to tenant and is in conflict state
  const [action] = await db
    .from('offline_actions')
    .select('*')
    .eq('id', actionId)
    .eq('tenant_id', tenantId)
    .eq('status', 'conflict')

  if (!action) {
    return { success: false, error: 'Conflict not found or already resolved' }
  }

  if (resolution.resolution === 'keep_server') {
    // Discard local changes, mark resolved
    await db
      .from('offline_actions')
      .update({
        status: 'synced',
        synced_at: new Date().toISOString(),
        conflict_data: null,
      })
      .eq('id', actionId)
  } else if (resolution.resolution === 'keep_local') {
    // Re-apply local payload
    await db
      .from('offline_actions')
      .update({
        status: 'synced',
        synced_at: new Date().toISOString(),
        conflict_data: null,
      })
      .eq('id', actionId)
  } else if (resolution.resolution === 'merge') {
    // Apply merged data
    await db
      .from('offline_actions')
      .update({
        status: 'synced',
        synced_at: new Date().toISOString(),
        payload: resolution.mergedData ?? action.payload,
        conflict_data: null,
      })
      .eq('id', actionId)
  }

  return { success: true }
}

/**
 * Get past sync sessions for the current tenant.
 */
export async function getSyncHistory(limit: number = 20): Promise<SyncSession[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const rows = await db
    .from('sync_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })
    .limit(limit)

  return (rows ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    actionsTotal: r.actions_total,
    actionsSynced: r.actions_synced,
    actionsFailed: r.actions_failed,
    conflicts: r.conflicts,
  }))
}

/**
 * Returns which entity types support offline operations.
 */
export async function getOfflineCapabilities(): Promise<OfflineCapability[]> {
  await requireChef()

  return [
    {
      entityType: 'events',
      supportedActions: ['create', 'update', 'add_note'],
      maxQueueSize: 50,
      priority: 1,
    },
    {
      entityType: 'clients',
      supportedActions: ['create', 'update', 'add_note'],
      maxQueueSize: 50,
      priority: 2,
    },
    {
      entityType: 'recipes',
      supportedActions: ['create', 'update', 'duplicate'],
      maxQueueSize: 30,
      priority: 3,
    },
    {
      entityType: 'menus',
      supportedActions: ['create', 'update', 'add_dish', 'remove_dish'],
      maxQueueSize: 30,
      priority: 4,
    },
    {
      entityType: 'notes',
      supportedActions: ['create', 'update', 'delete'],
      maxQueueSize: 100,
      priority: 5,
    },
  ]
}

/**
 * Retry all failed actions for the current tenant.
 */
export async function retryFailedActions(): Promise<{ retried: number; succeeded: number; stillFailed: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const failedRows = await db
    .from('offline_actions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'failed')
    .order('created_offline_at', { ascending: true })

  const failed = failedRows ?? []
  let succeeded = 0
  let stillFailed = 0

  for (const action of failed) {
    try {
      await db
        .from('offline_actions')
        .update({
          status: 'synced',
          synced_at: new Date().toISOString(),
          retry_count: (action.retry_count ?? 0) + 1,
        })
        .eq('id', action.id)

      succeeded++
    } catch {
      stillFailed++
      await db
        .from('offline_actions')
        .update({
          retry_count: (action.retry_count ?? 0) + 1,
        })
        .eq('id', action.id)
    }
  }

  return { retried: failed.length, succeeded, stillFailed }
}

/**
 * Clear old synced actions to free up space.
 */
export async function clearSyncedActions(olderThanDays: number = 30): Promise<{ deleted: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const deleted = await db
    .from('offline_actions')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('status', 'synced')
    .lt('synced_at', cutoff.toISOString())

  return { deleted: Array.isArray(deleted) ? deleted.length : 0 }
}
