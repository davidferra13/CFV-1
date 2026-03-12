// Invitation token lookup, usage, and revocation for the signup flow
// Extracted from lib/clients/actions.ts to decouple auth from Phase 3 code

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

/**
 * Get invitation by token (public - for signup flow)
 */
export async function getInvitationByToken(token: string) {
  const supabase: any = createServerClient()

  const { data: invitation, error } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !invitation) {
    return null
  }

  return invitation
}

/**
 * Mark invitation as used (called during signup)
 */
export async function markInvitationUsed(invitationId: string) {
  const supabase = createServerClient({ admin: true })

  // SECURITY: .is('used_at', null) prevents TOCTOU race condition where two
  // concurrent signup requests with the same token both succeed. Without this
  // guard, duplicate accounts can be created in the same tenant.
  const { data: updated, error } = await supabase
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitationId)
    .is('used_at', null)
    .select('id')
    .single()

  if (error || !updated) {
    console.error('[markInvitationUsed] Error or already used:', error)
    throw new Error('Invitation already used or invalid')
  }

  return { success: true }
}

/**
 * Revoke an unused invitation - Chef only
 * Sets used_at to now so the token is no longer valid
 */
export async function revokeInvitation(invitationId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('tenant_id', user.tenantId!)
    .is('used_at', null)

  if (error) throw new Error('Failed to revoke invitation')
  revalidatePath('/clients')
  return { success: true }
}
