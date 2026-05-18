import type { RailItemState } from './types'

/**
 * Rail Item Lifecycle State Tracker
 *
 * Reads and writes the rail_item_state table to track
 * per-user item lifecycle transitions (seen, acted, snoozed, resolved, expired).
 */

async function db() {
  const { pgClient } = await import('@/lib/db')
  return pgClient
}

export async function getItemState(
  tenantId: string,
  userId: string,
  itemKey: string
): Promise<{ state: RailItemState; snoozedUntil: Date | null } | null> {
  const pgClient = await db()
  const rows = await pgClient`
    SELECT state, snoozed_until
    FROM rail_item_state
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND item_key = ${itemKey}
    LIMIT 1
  `
  if (!rows.length) return null
  const row = rows[0]
  return {
    state: row.state as RailItemState,
    snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until as string) : null,
  }
}

export async function markSeen(tenantId: string, userId: string, itemKey: string): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, seen_at)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'seen', NOW())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'seen', seen_at = NOW()
  `
}

export async function markActed(tenantId: string, userId: string, itemKey: string): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, acted_at)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'acted', NOW())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'acted', acted_at = NOW()
  `
}

export async function snoozeItem(
  tenantId: string,
  userId: string,
  itemKey: string,
  durationMinutes: number
): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, snoozed_until)
    VALUES (
      ${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey},
      'snoozed', NOW() + ${`${durationMinutes} minutes`}::interval
    )
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'snoozed', snoozed_until = NOW() + ${`${durationMinutes} minutes`}::interval
  `
}

export async function resolveItem(
  tenantId: string,
  userId: string,
  itemKey: string
): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, resolved_at)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'resolved', NOW())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'resolved', resolved_at = NOW()
  `
}

export async function expireItem(tenantId: string, userId: string, itemKey: string): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, resolved_at)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'expired', NOW())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'expired', resolved_at = NOW()
  `
}

export async function cleanupExpired(): Promise<number> {
  const pgClient = await db()
  const result = await pgClient`
    DELETE FROM rail_item_state
    WHERE state IN ('resolved', 'expired')
      AND resolved_at < NOW() - INTERVAL '5 minutes'
  `
  return result.count
}

export async function getSnoozedExpired(tenantId: string, userId: string): Promise<string[]> {
  const pgClient = await db()
  const rows = await pgClient`
    SELECT item_key
    FROM rail_item_state
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND state = 'snoozed'
      AND snoozed_until <= NOW()
  `
  return rows.map((r) => r.item_key as string)
}

export async function delegateItem(
  tenantId: string,
  userId: string,
  itemKey: string,
  delegateToUserId: string
): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, delegated_to)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'delegated', ${delegateToUserId})
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'delegated', delegated_to = ${delegateToUserId}
  `
}

export async function saveItem(tenantId: string, userId: string, itemKey: string): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, saved_at)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'saved', NOW())
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'saved', saved_at = NOW()
  `
}

export async function addNote(
  tenantId: string,
  userId: string,
  itemKey: string,
  noteText: string
): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, note_text)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'noted', ${noteText})
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET note_text = ${noteText}
  `
}

export async function scheduleFollowUp(
  tenantId: string,
  userId: string,
  itemKey: string,
  followUpAt: Date
): Promise<void> {
  const pgClient = await db()
  await pgClient`
    INSERT INTO rail_item_state (id, tenant_id, user_id, item_key, state, follow_up_at)
    VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${itemKey}, 'follow_up', ${followUpAt.toISOString()})
    ON CONFLICT (tenant_id, user_id, item_key) DO UPDATE
    SET state = 'follow_up', follow_up_at = ${followUpAt.toISOString()}
  `
}
