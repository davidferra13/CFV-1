// Invitation token lookup, usage, and revocation for the signup flow
// Extracted from lib/clients/actions.ts to decouple auth from Phase 3 code
//
// Tokens are stored as SHA-256 hashes. The raw token is sent to the client
// in the invitation URL; on lookup we hash the incoming value before querying.

'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

/**
 * Hash a raw invitation token for DB comparison.
 * Tokens created before hashing was introduced are stored as plaintext hex;
 * this function produces the SHA-256 hex digest used for new tokens.
 */
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Get invitation by token (public - for signup flow).
 * Checks the hashed token first; falls back to plaintext match
 * for tokens generated before the hashing migration.
 */
export async function getInvitationByToken(token: string) {
  const db: any = createServerClient()
  const hashed = hashToken(token)

  // Try hashed match first (new tokens)
  const { data: invitation } = await db
    .from('client_invitations')
    .select('*')
    .eq('token', hashed)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (invitation) return invitation

  // Fallback: plaintext match for legacy tokens created before hashing
  const { data: legacyInvitation } = await db
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  return legacyInvitation ?? null
}

/**
 * Mark invitation as used (called during signup)
 */
export async function markInvitationUsed(invitationId: string) {
  const db = createServerClient({ admin: true })

  const { error } = await db
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitationId)

  if (error) {
    console.error('[markInvitationUsed] Error:', error)
    throw new Error('Failed to mark invitation as used')
  }

  return { success: true }
}

/**
 * Revoke an unused invitation - Chef only
 * Sets used_at to now so the token is no longer valid
 */
export async function revokeInvitation(invitationId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('tenant_id', user.tenantId!)
    .is('used_at', null)

  if (error) throw new Error('Failed to revoke invitation')
  revalidatePath('/clients')
  return { success: true }
}
