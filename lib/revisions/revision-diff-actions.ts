'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  RevisionEntityType,
  RevisionEntry,
  RevisionComparison,
  RevisionSummary,
  RevisionTimeline,
  FieldDiff,
} from './revision-diff-types'

const TABLE = 'revision_entries'

// --- Helpers ---

function rowToEntry(row: Record<string, unknown>): RevisionEntry {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    entityType: row.entity_type as RevisionEntityType,
    entityId: row.entity_id as string,
    version: row.version as number,
    snapshot: (row.snapshot ?? {}) as Record<string, unknown>,
    changedBy: row.changed_by as string,
    changedByName: (row.changed_by_name as string) ?? null,
    changedAt: row.created_at as string,
    changeNote: (row.change_note as string) ?? null,
  }
}

function computeDiffs(
  oldSnap: Record<string, unknown>,
  newSnap: Record<string, unknown>
): FieldDiff[] {
  const allKeys = Array.from(new Set([...Object.keys(oldSnap), ...Object.keys(newSnap)]))
  const diffs: FieldDiff[] = []

  for (const field of allKeys) {
    const hasOld = field in oldSnap
    const hasNew = field in newSnap
    const oldValue = oldSnap[field]
    const newValue = newSnap[field]

    if (!hasOld && hasNew) {
      diffs.push({ field, oldValue: undefined, newValue, diffType: 'added' })
    } else if (hasOld && !hasNew) {
      diffs.push({ field, oldValue, newValue: undefined, diffType: 'removed' })
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({ field, oldValue, newValue, diffType: 'modified' })
    } else {
      diffs.push({ field, oldValue, newValue, diffType: 'unchanged' })
    }
  }

  return diffs
}

// --- Actions ---

/**
 * Save a new revision snapshot for an entity.
 * Auto-increments version based on existing entries.
 */
export async function createRevision(
  entityType: RevisionEntityType,
  entityId: string,
  snapshot: Record<string, unknown>,
  changeNote?: string
): Promise<RevisionEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get next version number
  const { data: latest } = await db
    .from(TABLE)
    .select('version')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = latest ? (latest.version as number) + 1 : 1

  const { data: row, error } = await db
    .from(TABLE)
    .insert({
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: entityId,
      version: nextVersion,
      snapshot,
      changed_by: user.userId,
      changed_by_name: user.email ?? null,
      change_note: changeNote ?? null,
    })
    .select()
    .single()

  if (error || !row) {
    throw new Error(`Failed to create revision: ${error?.message ?? 'unknown error'}`)
  }

  return rowToEntry(row)
}

/**
 * Get revision timeline for an entity, ordered newest-first.
 */
export async function getRevisionHistory(
  entityType: RevisionEntityType,
  entityId: string,
  limit = 50
): Promise<RevisionTimeline> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: rows, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch revision history: ${error.message}`)
  }

  return {
    entries: (rows ?? []).map(rowToEntry),
    entityType,
    entityId,
  }
}

/**
 * Compare two versions of an entity, producing field-level diffs.
 */
export async function compareRevisions(
  entityType: RevisionEntityType,
  entityId: string,
  fromVersion: number,
  toVersion: number
): Promise<RevisionComparison> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: fromRow } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('version', fromVersion)
    .single()

  const { data: toRow } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('version', toVersion)
    .single()

  if (!fromRow || !toRow) {
    throw new Error(
      `Revision not found: v${!fromRow ? fromVersion : toVersion} for ${entityType}/${entityId}`
    )
  }

  const fromSnap = (fromRow.snapshot ?? {}) as Record<string, unknown>
  const toSnap = (toRow.snapshot ?? {}) as Record<string, unknown>

  return {
    entityType,
    entityId,
    fromVersion,
    toVersion,
    diffs: computeDiffs(fromSnap, toSnap),
    fromSnapshot: fromSnap,
    toSnapshot: toSnap,
    comparedAt: new Date().toISOString(),
  }
}

/**
 * Get the most recent revision snapshot for an entity.
 */
export async function getLatestRevision(
  entityType: RevisionEntityType,
  entityId: string
): Promise<RevisionEntry | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: row } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  return row ? rowToEntry(row) : null
}

/**
 * Summary stats for an entity's revision history.
 */
export async function getRevisionSummary(
  entityType: RevisionEntityType,
  entityId: string
): Promise<RevisionSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: rows } = await db
    .from(TABLE)
    .select('version, changed_by, created_at')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version', { ascending: false })

  const entries = rows ?? []

  return {
    entityType,
    entityId,
    totalVersions: entries.length,
    latestVersion: entries.length > 0 ? (entries[0].version as number) : 0,
    lastChangedBy: entries.length > 0 ? (entries[0].changed_by as string) : null,
    lastChangedAt: entries.length > 0 ? (entries[0].created_at as string) : null,
  }
}

/**
 * Recent revisions across all entities (or filtered by type).
 * Useful for activity feeds.
 */
export async function getRecentRevisions(
  entityType?: RevisionEntityType,
  limit = 20
): Promise<RevisionEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const { data: rows, error } = await query

  if (error) {
    throw new Error(`Failed to fetch recent revisions: ${error.message}`)
  }

  return (rows ?? []).map(rowToEntry)
}

/**
 * Create a new revision by copying an old snapshot (rollback).
 * Does not delete newer versions; creates a new version from the old snapshot.
 */
export async function rollbackToRevision(
  entityType: RevisionEntityType,
  entityId: string,
  version: number
): Promise<RevisionEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: targetRow } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('version', version)
    .single()

  if (!targetRow) {
    throw new Error(`Revision v${version} not found for ${entityType}/${entityId}`)
  }

  const snapshot = (targetRow.snapshot ?? {}) as Record<string, unknown>

  return createRevision(entityType, entityId, snapshot, `Rolled back to version ${version}`)
}
