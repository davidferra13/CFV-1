'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Portal Introduction Strategy
// Determines when to introduce a client to the Dinner Circle portal and
// which snapshot version (A or B) to use in outgoing emails.
//
// Version A: full email with inline snapshot, no portal link
// Version B: snapshot teases menu, includes Dinner Circle link
// ---------------------------------------------------------------------------

/**
 * Returns true if the client has had 2+ email exchanges and
 * has not been introduced to the portal yet.
 */
export async function shouldIntroducePortal(clientId: string): Promise<boolean> {
  const user = await requireChef()
  const db = createServerClient()

  // Check if already introduced
  const { data: client } = await db
    .from('clients')
    .select('portal_introduced_at')
    .eq('id', clientId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!client) return false
  if (client.portal_introduced_at) return false

  // Count email exchanges (both directions)
  const { count } = await db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .in('channel', ['email', 'gmail'])
    .gte('status', 'sent')

  return (count ?? 0) >= 2
}

/**
 * Marks the client as having been introduced to the portal.
 * Sets portal_introduced_at to now.
 */
export async function markPortalIntroduced(clientId: string): Promise<void> {
  const user = await requireChef()
  const db = createServerClient()

  await db
    .from('clients')
    .update({ portal_introduced_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('chef_id', user.tenantId!)
}

/**
 * Returns the appropriate snapshot version for a client.
 * 'a' = email only (full inline snapshot, no portal link)
 * 'b' = portal transition (teased menu, includes circle link)
 */
export async function getSnapshotVersion(clientId: string): Promise<'a' | 'b'> {
  const user = await requireChef()
  const db = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('portal_introduced_at')
    .eq('id', clientId)
    .eq('chef_id', user.tenantId!)
    .single()

  // If the client has been introduced to the portal, use version B
  if (client?.portal_introduced_at) return 'b'

  // Otherwise default to version A
  return 'a'
}
