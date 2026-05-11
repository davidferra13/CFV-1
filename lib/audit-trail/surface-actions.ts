'use server'

/**
 * Server actions wrapping audit trail surface queries.
 * Each action has auth gate and tenant scoping via the underlying functions.
 */

import {
  getEntityHistory,
  getRecentChanges,
  getChangesByUser,
  getEntityDiff,
  getEntityAuditSummary,
  type AuditEntityType,
  type AuditHistoryEntry,
  type RecentChangeEntry,
  type AuditChange,
} from './surface'

export type { AuditEntityType, AuditHistoryEntry, RecentChangeEntry, AuditChange }

export async function fetchEntityHistory(
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditHistoryEntry[]> {
  if (!entityType || !entityId) return []
  try {
    return await getEntityHistory(entityType, entityId)
  } catch (err) {
    console.error('[audit-surface] fetchEntityHistory failed:', err)
    return []
  }
}

export async function fetchRecentChanges(
  limit: number = 50
): Promise<RecentChangeEntry[]> {
  try {
    return await getRecentChanges(Math.min(limit, 200))
  } catch (err) {
    console.error('[audit-surface] fetchRecentChanges failed:', err)
    return []
  }
}

export async function fetchChangesByUser(
  userId: string,
  limit: number = 100
): Promise<RecentChangeEntry[]> {
  if (!userId) return []
  try {
    return await getChangesByUser(userId, Math.min(limit, 200))
  } catch (err) {
    console.error('[audit-surface] fetchChangesByUser failed:', err)
    return []
  }
}

export async function fetchEntityDiff(
  entityType: AuditEntityType,
  entityId: string,
  fromTimestamp: string,
  toTimestamp: string
): Promise<AuditChange[]> {
  if (!entityType || !entityId || !fromTimestamp || !toTimestamp) return []
  try {
    return await getEntityDiff(entityType, entityId, fromTimestamp, toTimestamp)
  } catch (err) {
    console.error('[audit-surface] fetchEntityDiff failed:', err)
    return []
  }
}

export async function fetchEntityAuditSummary(
  entityType: AuditEntityType,
  entityId: string
): Promise<{ lastModified: string | null; lastModifiedBy: string | null; changeCount: number }> {
  if (!entityType || !entityId) {
    return { lastModified: null, lastModifiedBy: null, changeCount: 0 }
  }
  try {
    return await getEntityAuditSummary(entityType, entityId)
  } catch (err) {
    console.error('[audit-surface] fetchEntityAuditSummary failed:', err)
    return { lastModified: null, lastModifiedBy: null, changeCount: 0 }
  }
}
