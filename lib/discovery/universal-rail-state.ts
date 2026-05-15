import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RailImpressionRecord {
  userId: string
  itemDefinitionId: string
  role: string
  impressionCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface RailDismissalRecord {
  userId: string
  itemDefinitionId: string
  role: string
  dismissedAt: string
  dismissType: 'permanent' | 'snooze_1h' | 'snooze_24h' | 'until_resolved'
  snoozeUntil: string | null
}

export interface RailSavedRecord {
  userId: string
  itemDefinitionId: string
  role: string
  savedAt: string
  pinned: boolean
}

export interface RailAuditEvent {
  userId: string
  tenantId?: string
  itemDefinitionId: string
  role: string
  event: RailAuditEventType
  pageContext?: string
  metadata?: Record<string, unknown>
}

export type RailAuditEventType =
  | 'impression'
  | 'click'
  | 'dismiss'
  | 'snooze'
  | 'save'
  | 'unsave'
  | 'pin'
  | 'unpin'
  | 'expand'
  | 'hover'

export type RailDismissType = 'permanent' | 'snooze_1h' | 'snooze_24h' | 'until_resolved'

export interface RailUserState {
  impressions: Map<string, RailImpressionRecord>
  dismissals: Map<string, RailDismissalRecord>
  saved: Map<string, RailSavedRecord>
}

// ---------------------------------------------------------------------------
// Load full state for a user+role (called once per rail assembly)
// ---------------------------------------------------------------------------

export async function loadRailUserState(userId: string, role: string): Promise<RailUserState> {
  const [impressionRows, dismissalRows, savedRows] = await Promise.all([
    pgClient<
      {
        user_id: string
        item_definition_id: string
        role: string
        impression_count: number
        first_seen_at: string
        last_seen_at: string
      }[]
    >`
      SELECT user_id, item_definition_id, role, impression_count, first_seen_at, last_seen_at
      FROM rail_impressions
      WHERE user_id = ${userId} AND role = ${role}
    `,
    pgClient<
      {
        user_id: string
        item_definition_id: string
        role: string
        dismissed_at: string
        dismiss_type: string
        snooze_until: string | null
      }[]
    >`
      SELECT user_id, item_definition_id, role, dismissed_at, dismiss_type, snooze_until
      FROM rail_dismissals
      WHERE user_id = ${userId} AND role = ${role}
        AND (dismiss_type = 'permanent' OR snooze_until > NOW())
    `,
    pgClient<
      {
        user_id: string
        item_definition_id: string
        role: string
        saved_at: string
        pinned: boolean
      }[]
    >`
      SELECT user_id, item_definition_id, role, saved_at, pinned
      FROM rail_saved_items
      WHERE user_id = ${userId} AND role = ${role}
    `,
  ])

  const impressions = new Map<string, RailImpressionRecord>()
  for (const row of impressionRows) {
    impressions.set(row.item_definition_id, {
      userId: row.user_id,
      itemDefinitionId: row.item_definition_id,
      role: row.role,
      impressionCount: row.impression_count,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
    })
  }

  const dismissals = new Map<string, RailDismissalRecord>()
  for (const row of dismissalRows) {
    dismissals.set(row.item_definition_id, {
      userId: row.user_id,
      itemDefinitionId: row.item_definition_id,
      role: row.role,
      dismissedAt: row.dismissed_at,
      dismissType: row.dismiss_type as RailDismissType,
      snoozeUntil: row.snooze_until,
    })
  }

  const saved = new Map<string, RailSavedRecord>()
  for (const row of savedRows) {
    saved.set(row.item_definition_id, {
      userId: row.user_id,
      itemDefinitionId: row.item_definition_id,
      role: row.role,
      savedAt: row.saved_at,
      pinned: row.pinned,
    })
  }

  return { impressions, dismissals, saved }
}

// ---------------------------------------------------------------------------
// Impression tracking
// ---------------------------------------------------------------------------

export async function recordImpression(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string
): Promise<void> {
  await pgClient`
    INSERT INTO rail_impressions (user_id, tenant_id, item_definition_id, role, impression_count, first_seen_at, last_seen_at)
    VALUES (${userId}, ${tenantId}, ${itemDefinitionId}, ${role}, 1, NOW(), NOW())
    ON CONFLICT (user_id, item_definition_id) DO UPDATE SET
      impression_count = rail_impressions.impression_count + 1,
      last_seen_at = NOW()
  `
}

export async function recordImpressionBatch(
  userId: string,
  tenantId: string | null,
  role: string,
  itemDefinitionIds: string[]
): Promise<void> {
  if (itemDefinitionIds.length === 0) return

  // Use a transaction for batch upserts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (pgClient as any).begin(async (tx: any) => {
    for (const itemId of itemDefinitionIds) {
      await tx`
        INSERT INTO rail_impressions (user_id, tenant_id, item_definition_id, role, impression_count, first_seen_at, last_seen_at)
        VALUES (${userId}, ${tenantId}, ${itemId}, ${role}, 1, NOW(), NOW())
        ON CONFLICT (user_id, item_definition_id) DO UPDATE SET
          impression_count = rail_impressions.impression_count + 1,
          last_seen_at = NOW()
      `
    }
  })
}

// ---------------------------------------------------------------------------
// Dismissals
// ---------------------------------------------------------------------------

const SNOOZE_DURATIONS: Record<string, number> = {
  snooze_1h: 60 * 60 * 1000,
  snooze_24h: 24 * 60 * 60 * 1000,
}

export async function dismissRailItem(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  dismissType: RailDismissType = 'permanent'
): Promise<void> {
  const durationMs = SNOOZE_DURATIONS[dismissType]
  const snoozeUntil = durationMs ? new Date(Date.now() + durationMs).toISOString() : null

  await pgClient`
    INSERT INTO rail_dismissals (user_id, tenant_id, item_definition_id, role, dismissed_at, dismiss_type, snooze_until)
    VALUES (${userId}, ${tenantId}, ${itemDefinitionId}, ${role}, NOW(), ${dismissType}, ${snoozeUntil})
    ON CONFLICT (user_id, item_definition_id) DO UPDATE SET
      dismissed_at = NOW(),
      dismiss_type = ${dismissType},
      snooze_until = ${snoozeUntil}
  `
}

export async function undismissRailItem(userId: string, itemDefinitionId: string): Promise<void> {
  await pgClient`
    DELETE FROM rail_dismissals
    WHERE user_id = ${userId} AND item_definition_id = ${itemDefinitionId}
  `
}

// ---------------------------------------------------------------------------
// Saved/pinned items
// ---------------------------------------------------------------------------

export async function saveRailItem(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  pinned = false
): Promise<void> {
  await pgClient`
    INSERT INTO rail_saved_items (user_id, tenant_id, item_definition_id, role, saved_at, pinned)
    VALUES (${userId}, ${tenantId}, ${itemDefinitionId}, ${role}, NOW(), ${pinned})
    ON CONFLICT (user_id, item_definition_id) DO UPDATE SET
      pinned = ${pinned}
  `
}

export async function unsaveRailItem(userId: string, itemDefinitionId: string): Promise<void> {
  await pgClient`
    DELETE FROM rail_saved_items
    WHERE user_id = ${userId} AND item_definition_id = ${itemDefinitionId}
  `
}

// ---------------------------------------------------------------------------
// Audit events
// ---------------------------------------------------------------------------

export async function recordRailAuditEvent(event: RailAuditEvent): Promise<void> {
  const meta = JSON.stringify(event.metadata ?? {})
  await pgClient`
    INSERT INTO rail_audit_events (
      user_id, tenant_id, item_definition_id, role,
      event, page_context, metadata, occurred_at
    )
    VALUES (
      ${event.userId}, ${event.tenantId ?? null}, ${event.itemDefinitionId}, ${event.role},
      ${event.event}, ${event.pageContext ?? null}, ${meta}::jsonb, NOW()
    )
  `
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export async function loadRailUserPreferences(
  userId: string,
  role: string
): Promise<{
  weightOverrides: Record<string, number>
  disabledCategories: string[]
  disabledItemIds: string[]
} | null> {
  const rows = await pgClient<
    {
      weight_overrides: Record<string, number>
      disabled_categories: string[]
      disabled_item_ids: string[]
    }[]
  >`
    SELECT weight_overrides, disabled_categories, disabled_item_ids
    FROM rail_user_preferences
    WHERE user_id = ${userId} AND role = ${role}
  `

  if (rows.length === 0) return null
  const row = rows[0]
  return {
    weightOverrides: row.weight_overrides ?? {},
    disabledCategories: row.disabled_categories ?? [],
    disabledItemIds: row.disabled_item_ids ?? [],
  }
}

// ---------------------------------------------------------------------------
// Pure helper functions (no DB)
// ---------------------------------------------------------------------------

export function isItemDismissed(
  dismissal: RailDismissalRecord | undefined,
  now: Date = new Date()
): boolean {
  if (!dismissal) return false
  if (dismissal.dismissType === 'permanent') return true
  if (dismissal.snoozeUntil) {
    return new Date(dismissal.snoozeUntil).getTime() > now.getTime()
  }
  return true
}

export function isItemSuppressed(
  impression: RailImpressionRecord | undefined,
  maxImpressions: number
): boolean {
  if (maxImpressions === -1) return false
  if (!impression) return false
  return impression.impressionCount >= maxImpressions
}
