import { createAdminClient } from '@/lib/db/admin'

export type PassiveProductSyncState = {
  chef_id: string
  dirty: boolean
  last_requested_at: string
  last_synced_at: string | null
  last_error: string | null
  last_reason: string | null
  last_source_type: string | null
  last_source_id: string | null
  updated_at: string
}

export type MarkPassiveStoreDirtyInput = {
  chefId: string
  reason?: string | null
  sourceType?: string | null
  sourceId?: string | null
}

export type PassiveStoreDirtySyncResult = {
  scanned: number
  synced: number
  failed: number
  results: Array<{ chefId: string; productCount: number }>
  errors: Array<{ chefId: string; error: string }>
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  return String(error)
}

function normalizeErrorMessage(error: unknown): string {
  const message = getErrorMessage(error) || 'Unknown passive store sync error'
  return message.length > 2000 ? `${message.slice(0, 1997)}...` : message
}

function isMissingSyncStateTable(error: unknown): boolean {
  return getErrorMessage(error).includes('relation "passive_product_sync_state" does not exist')
}

function toSyncState(row: any): PassiveProductSyncState {
  return {
    chef_id: row.chef_id,
    dirty: Boolean(row.dirty),
    last_requested_at: row.last_requested_at,
    last_synced_at: row.last_synced_at ?? null,
    last_error: row.last_error ?? null,
    last_reason: row.last_reason ?? null,
    last_source_type: row.last_source_type ?? null,
    last_source_id: row.last_source_id ?? null,
    updated_at: row.updated_at,
  }
}

export async function markPassiveStoreDirty(
  input: MarkPassiveStoreDirtyInput | string,
  reason?: string | null,
  sourceType?: string | null,
  sourceId?: string | null
): Promise<void> {
  const payload =
    typeof input === 'string' ? { chefId: input, reason, sourceType, sourceId } : input

  if (!payload.chefId) return

  const db: any = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await db.from('passive_product_sync_state').upsert(
    {
      chef_id: payload.chefId,
      dirty: true,
      last_requested_at: now,
      last_reason: payload.reason ?? 'manual_dirty',
      last_source_type: payload.sourceType ?? null,
      last_source_id: payload.sourceId ?? null,
      updated_at: now,
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    if (isMissingSyncStateTable(error)) return
    throw new Error(`Failed to mark passive store dirty: ${getErrorMessage(error)}`)
  }
}

export async function getPassiveStoreSyncState(
  chefId: string
): Promise<PassiveProductSyncState | null> {
  const db: any = createAdminClient()
  const { data, error } = await db
    .from('passive_product_sync_state')
    .select('*')
    .eq('chef_id', chefId)
    .maybeSingle()

  if (error) {
    if (isMissingSyncStateTable(error)) return null
    throw new Error(`Failed to load passive store sync state: ${getErrorMessage(error)}`)
  }

  return data ? toSyncState(data) : null
}

export async function markPassiveStoreSyncSuccess(chefId: string): Promise<void> {
  if (!chefId) return

  const db: any = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await db.from('passive_product_sync_state').upsert(
    {
      chef_id: chefId,
      dirty: false,
      last_requested_at: now,
      last_synced_at: now,
      last_error: null,
      updated_at: now,
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    if (isMissingSyncStateTable(error)) return
    throw new Error(`Failed to mark passive store sync success: ${getErrorMessage(error)}`)
  }
}

export async function markPassiveStoreSyncFailure(chefId: string, error: unknown): Promise<void> {
  if (!chefId) return

  const db: any = createAdminClient()
  const now = new Date().toISOString()
  const { error: updateError } = await db.from('passive_product_sync_state').upsert(
    {
      chef_id: chefId,
      dirty: true,
      last_requested_at: now,
      last_error: normalizeErrorMessage(error),
      updated_at: now,
    },
    { onConflict: 'chef_id' }
  )

  if (updateError) {
    if (isMissingSyncStateTable(updateError)) return
    throw new Error(`Failed to mark passive store sync failure: ${getErrorMessage(updateError)}`)
  }
}

export async function listDirtyPassiveStoreChefs(limit = 25): Promise<PassiveProductSyncState[]> {
  const db: any = createAdminClient()
  const safeLimit = Math.max(1, Math.min(Math.floor(limit || 25), 100))
  const { data, error } = await db
    .from('passive_product_sync_state')
    .select('*')
    .eq('dirty', true)
    .order('last_requested_at', { ascending: true })
    .limit(safeLimit)

  if (error) {
    if (isMissingSyncStateTable(error)) return []
    throw new Error(`Failed to list dirty passive stores: ${getErrorMessage(error)}`)
  }

  return (data ?? []).map(toSyncState)
}

export async function syncDirtyPassiveStores(limit = 25): Promise<PassiveStoreDirtySyncResult> {
  const dirtyChefs = await listDirtyPassiveStoreChefs(limit)
  const result: PassiveStoreDirtySyncResult = {
    scanned: dirtyChefs.length,
    synced: 0,
    failed: 0,
    results: [],
    errors: [],
  }

  const { syncPassiveProductsForChef } = await import('./store')

  for (const state of dirtyChefs) {
    try {
      const products = await syncPassiveProductsForChef(state.chef_id)
      result.synced += 1
      result.results.push({ chefId: state.chef_id, productCount: products.length })
    } catch (error) {
      result.failed += 1
      result.errors.push({ chefId: state.chef_id, error: normalizeErrorMessage(error) })
    }
  }

  return result
}
