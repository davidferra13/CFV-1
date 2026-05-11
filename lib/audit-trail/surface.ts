/**
 * Audit Trail Surface Layer
 *
 * Provides rich query functions for surfacing entity change history,
 * building on top of the existing immutable transition tables
 * (event_state_transitions, quote_state_transitions, ledger_entries)
 * and the chef_activity_log.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────────────────

export type AuditEntityType = 'event' | 'quote' | 'menu' | 'contract' | 'client' | 'ledger'

export type AuditChange = {
  field: string
  oldValue: string | null
  newValue: string | null
}

export type AuditHistoryEntry = {
  id: string
  timestamp: string
  userId: string | null
  userName: string
  action: 'created' | 'updated' | 'deleted' | 'transition'
  summary: string
  changes: AuditChange[]
  entityType: AuditEntityType
  entityId: string
  entityLabel: string | null
}

export type RecentChangeEntry = AuditHistoryEntry & {
  entityType: AuditEntityType
  entityId: string
  entityLabel: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseFieldDiffs(context: Record<string, unknown>): AuditChange[] {
  const diffs: AuditChange[] = []
  const rawDiffs = context.field_diffs

  if (rawDiffs && typeof rawDiffs === 'object' && !Array.isArray(rawDiffs)) {
    for (const [field, raw] of Object.entries(rawDiffs as Record<string, unknown>)) {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const pair = raw as Record<string, unknown>
        diffs.push({
          field: formatFieldName(field),
          oldValue: formatValue(pair.before),
          newValue: formatValue(pair.after),
        })
      } else {
        diffs.push({
          field: formatFieldName(field),
          oldValue: null,
          newValue: formatValue(raw),
        })
      }
    }
  }

  const changedFields = context.changed_fields
  if (diffs.length === 0 && Array.isArray(changedFields)) {
    for (const field of changedFields) {
      if (typeof field === 'string') {
        diffs.push({
          field: formatFieldName(field),
          oldValue: null,
          newValue: '(updated)',
        })
      }
    }
  }

  return diffs.slice(0, 30)
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(', ')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function resolveActorLabel(
  actorId: string | null,
  currentUserId: string,
  source?: string
): string {
  if (source === 'quote_client_acceptance') return 'Client'
  if (!actorId) return 'System'
  if (actorId === currentUserId) return 'You'
  return 'Teammate'
}

// ── Core Query Functions ───────────────────────────────────────────────────

/**
 * Get full change history for a specific entity.
 * Combines state transitions and activity log mutations.
 */
export async function getEntityHistory(
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditHistoryEntry[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const entries: AuditHistoryEntry[] = []

  // 1. Fetch state transitions (for entity types that have them)
  const transitionTable = getTransitionTable(entityType)
  if (transitionTable) {
    const transitionRows = await pgClient.unsafe(
      `SELECT t.id, t.from_status, t.to_status, t.transitioned_at, t.transitioned_by, t.reason, t.metadata,
              ${getEntityLabelSelect(entityType)}
       FROM ${transitionTable.table} t
       ${getEntityLabelJoin(entityType, transitionTable.foreignKey)}
       WHERE t.${transitionTable.foreignKey} = $1 AND t.tenant_id = $2
       ORDER BY t.transitioned_at DESC
       LIMIT 200`,
      [entityId, tenantId]
    )

    for (const row of transitionRows) {
      const meta =
        row.metadata && typeof row.metadata === 'object' ? (row.metadata as any) : {}
      const fromStatus = row.from_status
        ? String(row.from_status).replace(/_/g, ' ')
        : null
      const toStatus = String(row.to_status ?? '').replace(/_/g, ' ')

      entries.push({
        id: `transition-${row.id}`,
        timestamp: row.transitioned_at,
        userId: row.transitioned_by ?? null,
        userName: resolveActorLabel(row.transitioned_by, chef.id, meta.source),
        action: 'transition',
        summary: fromStatus
          ? `Status changed: ${fromStatus} to ${toStatus}`
          : `Status set to ${toStatus}`,
        changes: fromStatus
          ? [{ field: 'Status', oldValue: fromStatus, newValue: toStatus }]
          : [{ field: 'Status', oldValue: null, newValue: toStatus }],
        entityType,
        entityId,
        entityLabel: (row as any).entity_label ?? null,
      })
    }
  }

  // 2. Fetch ledger entries (for event-scoped or ledger entity types)
  if (entityType === 'event' || entityType === 'ledger') {
    const ledgerCol = entityType === 'event' ? 'event_id' : 'id'
    const ledgerRows = await pgClient.unsafe(
      `SELECT le.id, le.entry_type, le.amount_cents, le.description, le.created_at,
              le.created_by, le.transaction_reference
       FROM ledger_entries le
       WHERE le.${ledgerCol} = $1 AND le.tenant_id = $2
       ORDER BY le.created_at DESC
       LIMIT 100`,
      [entityId, tenantId]
    )

    for (const row of ledgerRows) {
      const amountDollars = (Number(row.amount_cents) / 100).toFixed(2)
      entries.push({
        id: `ledger-${row.id}`,
        timestamp: row.created_at,
        userId: row.created_by ?? null,
        userName: resolveActorLabel(row.created_by, chef.id),
        action: 'created',
        summary: `${row.entry_type}: $${amountDollars}${row.description ? ` (${row.description})` : ''}`,
        changes: [
          { field: 'Entry Type', oldValue: null, newValue: row.entry_type },
          { field: 'Amount', oldValue: null, newValue: `$${amountDollars}` },
        ],
        entityType: 'ledger',
        entityId: String(row.id),
        entityLabel: row.description ?? `Ledger ${String(row.id).slice(0, 8)}`,
      })
    }
  }

  // 3. Fetch activity log mutations
  const mutationRows = await pgClient.unsafe(
    `SELECT id, action, summary, context, created_at, actor_id
     FROM chef_activity_log
     WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3
     ORDER BY created_at DESC
     LIMIT 200`,
    [entityType, entityId, tenantId]
  )

  for (const row of mutationRows) {
    const context =
      row.context && typeof row.context === 'object' && !Array.isArray(row.context)
        ? (row.context as Record<string, unknown>)
        : {}

    const actionType = deriveActionType(row.action)
    entries.push({
      id: `mutation-${row.id}`,
      timestamp: row.created_at,
      userId: row.actor_id ?? null,
      userName: resolveActorLabel(row.actor_id, chef.id),
      action: actionType,
      summary: row.summary,
      changes: parseFieldDiffs(context),
      entityType,
      entityId,
      entityLabel: null,
    })
  }

  // Sort by timestamp descending
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return entries.slice(0, 300)
}

/**
 * Get most recent changes across all entities for a tenant.
 */
export async function getRecentChanges(
  limit: number = 50
): Promise<RecentChangeEntry[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const entries: RecentChangeEntry[] = []

  // Recent transitions from events
  const eventTransitions = await pgClient.unsafe(
    `SELECT est.id, est.from_status, est.to_status, est.transitioned_at,
            est.transitioned_by, est.event_id, est.reason,
            COALESCE(e.occasion, 'Event ' || LEFT(est.event_id::text, 8)) AS entity_label
     FROM event_state_transitions est
     LEFT JOIN events e ON e.id = est.event_id
     WHERE est.tenant_id = $1
     ORDER BY est.transitioned_at DESC
     LIMIT $2`,
    [tenantId, limit]
  )

  for (const row of eventTransitions) {
    const from = row.from_status ? String(row.from_status).replace(/_/g, ' ') : null
    const to = String(row.to_status ?? '').replace(/_/g, ' ')
    entries.push({
      id: `event-t-${row.id}`,
      timestamp: row.transitioned_at,
      userId: row.transitioned_by ?? null,
      userName: resolveActorLabel(row.transitioned_by, chef.id),
      action: 'transition',
      summary: from ? `${from} to ${to}` : `Set to ${to}`,
      changes: [{ field: 'Status', oldValue: from, newValue: to }],
      entityType: 'event',
      entityId: row.event_id,
      entityLabel: row.entity_label,
    })
  }

  // Recent transitions from quotes
  const quoteTransitions = await pgClient.unsafe(
    `SELECT qst.id, qst.from_status, qst.to_status, qst.transitioned_at,
            qst.transitioned_by, qst.quote_id, qst.reason,
            'Quote ' || LEFT(qst.quote_id::text, 8) AS entity_label
     FROM quote_state_transitions qst
     WHERE qst.tenant_id = $1
     ORDER BY qst.transitioned_at DESC
     LIMIT $2`,
    [tenantId, limit]
  )

  for (const row of quoteTransitions) {
    const from = row.from_status ? String(row.from_status).replace(/_/g, ' ') : null
    const to = String(row.to_status ?? '').replace(/_/g, ' ')
    entries.push({
      id: `quote-t-${row.id}`,
      timestamp: row.transitioned_at,
      userId: row.transitioned_by ?? null,
      userName: resolveActorLabel(row.transitioned_by, chef.id),
      action: 'transition',
      summary: from ? `${from} to ${to}` : `Set to ${to}`,
      changes: [{ field: 'Status', oldValue: from, newValue: to }],
      entityType: 'quote',
      entityId: row.quote_id,
      entityLabel: row.entity_label,
    })
  }

  // Recent ledger entries
  const ledgerEntries = await pgClient.unsafe(
    `SELECT le.id, le.entry_type, le.amount_cents, le.description, le.created_at,
            le.created_by, le.event_id,
            COALESCE(e.occasion, 'Ledger ' || LEFT(le.id::text, 8)) AS entity_label
     FROM ledger_entries le
     LEFT JOIN events e ON e.id = le.event_id
     WHERE le.tenant_id = $1
     ORDER BY le.created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  )

  for (const row of ledgerEntries) {
    const amountDollars = (Number(row.amount_cents) / 100).toFixed(2)
    entries.push({
      id: `ledger-${row.id}`,
      timestamp: row.created_at,
      userId: row.created_by ?? null,
      userName: resolveActorLabel(row.created_by, chef.id),
      action: 'created',
      summary: `${row.entry_type}: $${amountDollars}`,
      changes: [
        { field: 'Amount', oldValue: null, newValue: `$${amountDollars}` },
      ],
      entityType: 'ledger',
      entityId: row.event_id ?? row.id,
      entityLabel: row.entity_label,
    })
  }

  // Recent activity log entries
  const activityEntries = await pgClient.unsafe(
    `SELECT id, action, entity_type, entity_id, summary, context, created_at, actor_id
     FROM chef_activity_log
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  )

  for (const row of activityEntries) {
    const context =
      row.context && typeof row.context === 'object' && !Array.isArray(row.context)
        ? (row.context as Record<string, unknown>)
        : {}

    entries.push({
      id: `activity-${row.id}`,
      timestamp: row.created_at,
      userId: row.actor_id ?? null,
      userName: resolveActorLabel(row.actor_id, chef.id),
      action: deriveActionType(row.action),
      summary: row.summary,
      changes: parseFieldDiffs(context),
      entityType: mapEntityType(row.entity_type),
      entityId: row.entity_id ?? row.id,
      entityLabel: (context.entity_label as string) ?? null,
    })
  }

  // Sort by timestamp descending, deduplicate, and limit
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return entries.slice(0, limit)
}

/**
 * Get all audit entries for a specific user.
 */
export async function getChangesByUser(
  userId: string,
  limit: number = 100
): Promise<RecentChangeEntry[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const entries: RecentChangeEntry[] = []

  // Activity log entries by this user
  const activityEntries = await pgClient.unsafe(
    `SELECT id, action, entity_type, entity_id, summary, context, created_at, actor_id
     FROM chef_activity_log
     WHERE tenant_id = $1 AND actor_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [tenantId, userId, limit]
  )

  for (const row of activityEntries) {
    const context =
      row.context && typeof row.context === 'object' && !Array.isArray(row.context)
        ? (row.context as Record<string, unknown>)
        : {}

    entries.push({
      id: `activity-${row.id}`,
      timestamp: row.created_at,
      userId: row.actor_id ?? null,
      userName: resolveActorLabel(row.actor_id, chef.id),
      action: deriveActionType(row.action),
      summary: row.summary,
      changes: parseFieldDiffs(context),
      entityType: mapEntityType(row.entity_type),
      entityId: row.entity_id ?? row.id,
      entityLabel: (context.entity_label as string) ?? null,
    })
  }

  // Event transitions by this user
  const eventTransitions = await pgClient.unsafe(
    `SELECT est.id, est.from_status, est.to_status, est.transitioned_at, est.event_id,
            COALESCE(e.occasion, 'Event ' || LEFT(est.event_id::text, 8)) AS entity_label
     FROM event_state_transitions est
     LEFT JOIN events e ON e.id = est.event_id
     WHERE est.tenant_id = $1 AND est.transitioned_by = $2
     ORDER BY est.transitioned_at DESC
     LIMIT $3`,
    [tenantId, userId, limit]
  )

  for (const row of eventTransitions) {
    const from = row.from_status ? String(row.from_status).replace(/_/g, ' ') : null
    const to = String(row.to_status ?? '').replace(/_/g, ' ')
    entries.push({
      id: `event-t-${row.id}`,
      timestamp: row.transitioned_at,
      userId: userId,
      userName: resolveActorLabel(userId, chef.id),
      action: 'transition',
      summary: from ? `${from} to ${to}` : `Set to ${to}`,
      changes: [{ field: 'Status', oldValue: from, newValue: to }],
      entityType: 'event',
      entityId: row.event_id,
      entityLabel: row.entity_label,
    })
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return entries.slice(0, limit)
}

/**
 * Get a diff between two specific timeline entries for an entity.
 * Returns changes between two points in time.
 */
export async function getEntityDiff(
  entityType: AuditEntityType,
  entityId: string,
  fromTimestamp: string,
  toTimestamp: string
): Promise<AuditChange[]> {
  const allHistory = await getEntityHistory(entityType, entityId)

  // Filter entries between the two timestamps
  const fromTime = new Date(fromTimestamp).getTime()
  const toTime = new Date(toTimestamp).getTime()

  const entriesInRange = allHistory.filter((e) => {
    const t = new Date(e.timestamp).getTime()
    return t >= fromTime && t <= toTime
  })

  // Aggregate all changes
  const changeMap = new Map<string, AuditChange>()
  // Process in chronological order (oldest first)
  const sorted = [...entriesInRange].reverse()
  for (const entry of sorted) {
    for (const change of entry.changes) {
      const existing = changeMap.get(change.field)
      if (existing) {
        // Keep the original oldValue but update newValue
        existing.newValue = change.newValue
      } else {
        changeMap.set(change.field, { ...change })
      }
    }
  }

  return Array.from(changeMap.values())
}

/**
 * Get a summary for an entity: last modified time and who modified it.
 */
export async function getEntityAuditSummary(
  entityType: AuditEntityType,
  entityId: string
): Promise<{ lastModified: string | null; lastModifiedBy: string | null; changeCount: number }> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  // Check activity log first (most comprehensive)
  const activityResult = await pgClient.unsafe(
    `SELECT created_at, actor_id, COUNT(*) OVER () as total_count
     FROM chef_activity_log
     WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [entityType, entityId, tenantId]
  )

  // Also check transitions
  const transitionTable = getTransitionTable(entityType)
  let transitionResult: any[] = []
  if (transitionTable) {
    transitionResult = await pgClient.unsafe(
      `SELECT transitioned_at, transitioned_by, COUNT(*) OVER () as total_count
       FROM ${transitionTable.table}
       WHERE ${transitionTable.foreignKey} = $1 AND tenant_id = $2
       ORDER BY transitioned_at DESC
       LIMIT 1`,
      [entityId, tenantId]
    )
  }

  const activityRow = activityResult[0]
  const transitionRow = transitionResult[0]

  // Pick the most recent
  let lastModified: string | null = null
  let lastModifiedBy: string | null = null
  let changeCount = 0

  if (activityRow && transitionRow) {
    const aTime = new Date(activityRow.created_at).getTime()
    const tTime = new Date(transitionRow.transitioned_at).getTime()
    if (aTime >= tTime) {
      lastModified = activityRow.created_at
      lastModifiedBy = resolveActorLabel(activityRow.actor_id, chef.id)
    } else {
      lastModified = transitionRow.transitioned_at
      lastModifiedBy = resolveActorLabel(transitionRow.transitioned_by, chef.id)
    }
    changeCount = Number(activityRow.total_count ?? 0) + Number(transitionRow.total_count ?? 0)
  } else if (activityRow) {
    lastModified = activityRow.created_at
    lastModifiedBy = resolveActorLabel(activityRow.actor_id, chef.id)
    changeCount = Number(activityRow.total_count ?? 0)
  } else if (transitionRow) {
    lastModified = transitionRow.transitioned_at
    lastModifiedBy = resolveActorLabel(transitionRow.transitioned_by, chef.id)
    changeCount = Number(transitionRow.total_count ?? 0)
  }

  return { lastModified, lastModifiedBy, changeCount }
}

// ── Internal helpers ───────────────────────────────────────────────────────

function getTransitionTable(
  entityType: AuditEntityType
): { table: string; foreignKey: string } | null {
  const map: Partial<Record<AuditEntityType, { table: string; foreignKey: string }>> = {
    event: { table: 'event_state_transitions', foreignKey: 'event_id' },
    quote: { table: 'quote_state_transitions', foreignKey: 'quote_id' },
    menu: { table: 'menu_state_transitions', foreignKey: 'menu_id' },
  }
  return map[entityType] ?? null
}

function getEntityLabelSelect(entityType: AuditEntityType): string {
  switch (entityType) {
    case 'event':
      return "COALESCE(e.occasion, 'Event ' || LEFT(t.event_id::text, 8)) AS entity_label"
    case 'quote':
      return "'Quote ' || LEFT(t.quote_id::text, 8) AS entity_label"
    case 'menu':
      return "COALESCE(m.name, 'Menu ' || LEFT(t.menu_id::text, 8)) AS entity_label"
    default:
      return "'Unknown' AS entity_label"
  }
}

function getEntityLabelJoin(entityType: AuditEntityType, foreignKey: string): string {
  switch (entityType) {
    case 'event':
      return `LEFT JOIN events e ON e.id = t.${foreignKey}`
    case 'menu':
      return `LEFT JOIN menus m ON m.id = t.${foreignKey}`
    default:
      return ''
  }
}

function deriveActionType(action: string): 'created' | 'updated' | 'deleted' | 'transition' {
  if (action.includes('created') || action.includes('create') || action.includes('added')) {
    return 'created'
  }
  if (action.includes('deleted') || action.includes('delete') || action.includes('removed')) {
    return 'deleted'
  }
  if (action.includes('transition')) {
    return 'transition'
  }
  return 'updated'
}

function mapEntityType(raw: string): AuditEntityType {
  const map: Record<string, AuditEntityType> = {
    event: 'event',
    quote: 'quote',
    menu: 'menu',
    contract: 'contract',
    client: 'client',
    ledger: 'ledger',
    ledger_entry: 'ledger',
    inquiry: 'event', // Map inquiries under event for audit purposes
  }
  return map[raw] ?? 'event'
}
