'use server'

import { pgClient } from '@/lib/db'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RailItemState =
  | 'surfaced'
  | 'seen'
  | 'acted'
  | 'snoozed'
  | 'dismissed'
  | 'resolved'
  | 'expired'
  | 'archived'

/** States that suppress a rail item from appearing in the rail. */
const SUPPRESSED_STATES: ReadonlySet<RailItemState> = new Set(['dismissed', 'resolved', 'archived'])

export interface RailItemStateRecord {
  id: string
  tenantId: string
  userId: string
  itemKey: string
  state: RailItemState
  snoozedUntil: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Mutations (all auth-gated, tenant-scoped)
// ---------------------------------------------------------------------------

/**
 * Mark a rail item as seen. Upserts; will not overwrite a "higher" state
 * like dismissed or resolved.
 */
export async function markRailItemSeen(itemKey: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId

  await pgClient`
    INSERT INTO rail_item_states (tenant_id, user_id, item_key, state, updated_at)
    VALUES (${tenantId}, ${user.id}, ${itemKey}, 'seen', now())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE SET
      state = CASE
        WHEN rail_item_states.state IN ('dismissed', 'resolved', 'archived') THEN rail_item_states.state
        ELSE 'seen'
      END,
      updated_at = now()
  `
}

/**
 * Snooze a rail item until a specific time. Sets state to 'snoozed' and
 * records snoozed_until. When snoozed_until lapses, the item resurfaces.
 */
export async function snoozeRailItem(itemKey: string, until: Date): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId

  await pgClient`
    INSERT INTO rail_item_states (tenant_id, user_id, item_key, state, snoozed_until, updated_at)
    VALUES (${tenantId}, ${user.id}, ${itemKey}, 'snoozed', ${until.toISOString()}, now())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE SET
      state = 'snoozed',
      snoozed_until = ${until.toISOString()},
      updated_at = now()
  `
}

/**
 * Dismiss a rail item permanently. It will not reappear until explicitly
 * undismissed or the state is reset.
 */
export async function dismissRailItemState(itemKey: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId

  await pgClient`
    INSERT INTO rail_item_states (tenant_id, user_id, item_key, state, snoozed_until, updated_at)
    VALUES (${tenantId}, ${user.id}, ${itemKey}, 'dismissed', NULL, now())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE SET
      state = 'dismissed',
      snoozed_until = NULL,
      updated_at = now()
  `
}

/**
 * Mark a rail item as resolved (the underlying condition is handled).
 * Resolved items stay in the table for audit but are filtered from the rail.
 */
export async function resolveRailItem(itemKey: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId

  await pgClient`
    INSERT INTO rail_item_states (tenant_id, user_id, item_key, state, snoozed_until, updated_at)
    VALUES (${tenantId}, ${user.id}, ${itemKey}, 'resolved', NULL, now())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE SET
      state = 'resolved',
      snoozed_until = NULL,
      updated_at = now()
  `
}

// ---------------------------------------------------------------------------
// Queries (all auth-gated, tenant-scoped)
// ---------------------------------------------------------------------------

/**
 * Get all non-archived rail item states for a user. Used during rail assembly
 * to filter out dismissed/resolved/snoozed items.
 */
export async function getRailItemStates(
  tenantId: string,
  userId: string
): Promise<RailItemStateRecord[]> {
  const rows = await pgClient<
    {
      id: string
      tenant_id: string
      user_id: string
      item_key: string
      state: string
      snoozed_until: string | null
      created_at: string
      updated_at: string
    }[]
  >`
    SELECT id, tenant_id, user_id, item_key, state, snoozed_until, created_at, updated_at
    FROM rail_item_states
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND state != 'archived'
  `

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    itemKey: r.item_key,
    state: r.state as RailItemState,
    snoozedUntil: r.snoozed_until,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

/**
 * Get items currently snoozed (snoozed_until still in the future).
 */
export async function getActiveSnoozes(
  tenantId: string,
  userId: string
): Promise<RailItemStateRecord[]> {
  const rows = await pgClient<
    {
      id: string
      tenant_id: string
      user_id: string
      item_key: string
      state: string
      snoozed_until: string | null
      created_at: string
      updated_at: string
    }[]
  >`
    SELECT id, tenant_id, user_id, item_key, state, snoozed_until, created_at, updated_at
    FROM rail_item_states
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND state = 'snoozed'
      AND snoozed_until > now()
  `

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    itemKey: r.item_key,
    state: r.state as RailItemState,
    snoozedUntil: r.snoozed_until,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

// ---------------------------------------------------------------------------
// Filter helpers (used by rail assembly pipeline)
// ---------------------------------------------------------------------------

/**
 * Build a Set of item keys that should be suppressed from the rail.
 * Includes dismissed, resolved, archived, and actively snoozed items.
 */
export async function getSuppressedItemKeys(
  tenantId: string,
  userId: string
): Promise<Set<string>> {
  const rows = await pgClient<{ item_key: string }[]>`
    SELECT item_key
    FROM rail_item_states
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND (
        state IN ('dismissed', 'resolved', 'archived')
        OR (state = 'snoozed' AND snoozed_until > now())
      )
  `

  return new Set(rows.map((r) => r.item_key))
}

/**
 * Build a Map of item_key to state for all active (non-archived) records.
 * Useful for the UI layer to know which items are seen vs surfaced.
 */
export async function getRailItemStateMap(
  tenantId: string,
  userId: string
): Promise<Map<string, RailItemState>> {
  const rows = await pgClient<{ item_key: string; state: string }[]>`
    SELECT item_key, state
    FROM rail_item_states
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND state != 'archived'
  `

  const map = new Map<string, RailItemState>()
  for (const r of rows) {
    map.set(r.item_key, r.state as RailItemState)
  }
  return map
}

/**
 * Check if a given item key is currently suppressed for a user.
 */
function isItemKeySuppressed(state: RailItemState | undefined): boolean {
  if (!state) return false
  if (SUPPRESSED_STATES.has(state)) return true
  // Snoozed items are suppressed by the query (snoozed_until > now()),
  // so if a snoozed record is in the map, it is actively snoozed.
  if (state === 'snoozed') return true
  return false
}
