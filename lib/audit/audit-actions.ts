'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { AuditAction, AuditChange, AuditEntry, AuditSummary } from './audit-types'

/**
 * Record an audit entry for a create/update/delete/status_change on any entity.
 * Called by other modules after mutations.
 */
export async function recordAuditEntry(
  entityType: string,
  entityId: string,
  action: AuditAction,
  changes: AuditChange[],
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('audit_entries').insert({
    tenant_id: user.tenantId!,
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: user.id,
    actor_name: user.email ?? null,
    changes,
    metadata,
  })

  if (error) throw error
}

/**
 * Get the full change history for a specific entity, newest first.
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<AuditEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('audit_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AuditEntry[]
}

/**
 * Get recent audit entries across all entities (for admin/dashboard views).
 * Optionally filter by entity type.
 */
export async function getRecentAuditEntries(
  entityType?: string,
  limit = 25
): Promise<AuditEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('audit_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as AuditEntry[]
}

/**
 * Get a summary of changes for a specific entity:
 * total count, last changed by/when, and recent entries.
 */
export async function getAuditSummary(
  entityType: string,
  entityId: string
): Promise<AuditSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch count
  const { count, error: countError } = await db
    .from('audit_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (countError) throw countError

  // Fetch recent entries (last 5)
  const { data: recent, error: recentError } = await db
    .from('audit_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentError) throw recentError

  const entries = (recent ?? []) as AuditEntry[]
  const latest = entries[0] ?? null

  return {
    entityType,
    entityId,
    totalChanges: count ?? 0,
    lastChangedAt: latest?.created_at ?? null,
    lastChangedBy: latest?.actor_name ?? null,
    recentEntries: entries,
  }
}

/**
 * Get all changes made by a specific user/actor, newest first.
 */
export async function getActorActivity(
  actorId: string,
  limit = 50
): Promise<AuditEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('audit_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AuditEntry[]
}
