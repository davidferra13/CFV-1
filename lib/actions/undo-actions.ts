'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { UndoActionType, UndoRecord, BulkActionResult } from './undo-types'

const KNOWN_ENTITY_TABLES: Record<string, string> = {
  event: 'events',
  menu: 'menus',
  notification: 'notifications',
  recipe: 'recipes',
}

/**
 * Record an undoable action with a snapshot of previous state.
 * Returns a BulkActionResult the caller can surface in a toast with an undo button.
 */
export async function recordUndoableAction(
  actionType: UndoActionType,
  entityType: string,
  entityIds: string[],
  previousState: Record<string, unknown>[],
  description: string,
  windowMinutes = 30
): Promise<BulkActionResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('undo_records')
    .insert({
      tenant_id: user.tenantId!,
      action_type: actionType,
      entity_type: entityType,
      entity_ids: entityIds,
      previous_state: previousState,
      description,
      performed_by: user.id,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to record undoable action: ${error.message}`)

  return {
    success: true,
    affected: entityIds.length,
    undoId: data.id,
    description,
    expiresAt,
  }
}

/**
 * Undo an action if within the time window.
 * Restores previous_state rows to their respective entity table.
 */
export async function undoAction(undoId: string): Promise<{ success: boolean; message: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch the undo record scoped to tenant
  const { data: record, error: fetchErr } = await db
    .from('undo_records')
    .select('*')
    .eq('id', undoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !record) {
    return { success: false, message: 'Undo record not found' }
  }

  const rec = record as UndoRecord

  if (rec.undone) {
    return { success: false, message: 'Action was already undone' }
  }

  if (new Date(rec.expires_at) < new Date()) {
    return { success: false, message: 'Undo window has expired' }
  }

  // Resolve the table name
  const tableName = KNOWN_ENTITY_TABLES[rec.entity_type]
  if (!tableName) {
    console.error(`[undo] Unknown entity_type "${rec.entity_type}", cannot restore`)
    return { success: false, message: `Unknown entity type: ${rec.entity_type}` }
  }

  // Restore each entity to its previous state
  const states = rec.previous_state as Record<string, unknown>[]
  let restored = 0

  for (const prev of states) {
    const entityId = prev.id as string | undefined
    if (!entityId) continue

    // Strip id from the update payload (cannot update PK)
    const { id: _id, ...updatePayload } = prev

    const { error: updateErr } = await db
      .from(tableName)
      .update(updatePayload)
      .eq('id', entityId)
      .eq('tenant_id', user.tenantId!)

    if (updateErr) {
      console.error(`[undo] Failed to restore ${tableName}/${entityId}:`, updateErr.message)
      continue
    }
    restored++
  }

  // Mark the undo record as undone
  await db
    .from('undo_records')
    .update({ undone: true, undone_at: new Date().toISOString() })
    .eq('id', undoId)

  return {
    success: true,
    message: `Undone: restored ${restored}/${states.length} ${rec.entity_type}(s)`,
  }
}

/**
 * Get actions that can still be undone (within window, not yet undone).
 */
export async function getRecentUndoableActions(limit = 10): Promise<UndoRecord[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('undo_records')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('undone', false)
    .gte('expires_at', new Date().toISOString())
    .order('performed_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch undoable actions: ${error.message}`)
  return (data ?? []) as UndoRecord[]
}

/**
 * Cleanup expired undo records. Call periodically (cron or on-demand).
 * Deletes records whose window has passed and were never undone.
 */
export async function expireOldUndoRecords(): Promise<{ deleted: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('undo_records')
    .delete()
    .eq('tenant_id', user.tenantId!)
    .eq('undone', false)
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) throw new Error(`Failed to expire undo records: ${error.message}`)
  return { deleted: data?.length ?? 0 }
}

/**
 * Get details of a specific undo record.
 */
export async function getUndoRecord(undoId: string): Promise<UndoRecord | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('undo_records')
    .select('*')
    .eq('id', undoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) return null
  return data as UndoRecord
}
