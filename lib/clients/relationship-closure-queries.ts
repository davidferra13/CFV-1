/**
 * Client Relationship Closure: database query helpers.
 * NOT a 'use server' file. Pure query functions for use by server actions and guards.
 */

import type { ClientRelationshipClosure } from './relationship-closure-types'

/**
 * Get the active (non-reopened) closure for a client under a tenant.
 * Returns null if no active closure exists.
 */
export async function getActiveClientClosure(
  db: any,
  tenantId: string,
  clientId: string
): Promise<ClientRelationshipClosure | null> {
  const { data, error } = await db
    .from('client_relationship_closures')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .is('reopened_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    // Table may not exist yet (migration not applied). Degrade gracefully.
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return null
    }
    console.error('[closure-queries] getActiveClientClosure failed:', error)
    return null
  }

  return data as ClientRelationshipClosure | null
}

/**
 * Get active closure by client ID only (no tenant scope).
 * Used in portal access checks where the tenant is not yet resolved.
 */
export async function getActiveClientClosureByClientId(
  db: any,
  clientId: string
): Promise<ClientRelationshipClosure | null> {
  const { data, error } = await db
    .from('client_relationship_closures')
    .select('*')
    .eq('client_id', clientId)
    .is('reopened_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return null
    }
    console.error('[closure-queries] getActiveClientClosureByClientId failed:', error)
    return null
  }

  return data as ClientRelationshipClosure | null
}

/**
 * Assert that a client's relationship is open for new event creation.
 * Throws a descriptive error if the client has an active closure that blocks new events.
 * Degrades gracefully if the table does not exist yet.
 */
export async function assertClientRelationshipOpenForNewEvent(
  db: any,
  tenantId: string,
  clientId: string
): Promise<void> {
  const closure = await getActiveClientClosure(db, tenantId, clientId)
  if (!closure) return

  if (closure.block_new_events) {
    const modeLabel =
      closure.closure_mode === 'do_not_book'
        ? 'blocked from booking'
        : closure.closure_mode === 'legal_hold'
          ? 'under legal hold'
          : closure.closure_mode === 'closed'
            ? 'closed'
            : 'transitioning'

    throw new Error(
      `Cannot create event: this client relationship is ${modeLabel}. ` +
        `Reopen the relationship first if you want to book a new event.`
    )
  }
}

/**
 * Check if a client's portal access is blocked by an active closure.
 * Returns the closure if it blocks portal access, null otherwise.
 * Degrades gracefully if the table does not exist yet.
 */
export async function getPortalBlockingClosure(
  db: any,
  clientId: string
): Promise<ClientRelationshipClosure | null> {
  const closure = await getActiveClientClosureByClientId(db, clientId)
  if (!closure) return null
  if (closure.revoke_portal_access) return closure
  return null
}
