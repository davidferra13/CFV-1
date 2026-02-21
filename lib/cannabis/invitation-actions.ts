'use server'

// Public Cannabis Invitation Actions
// Used by app/(public)/cannabis-invite/[token]/page.tsx
// These run in the public route context — no auth required to VIEW the page,
// but the user must sign in/have an account before claiming the invite.

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Look Up Invite by Token ──────────────────────────────────────────────────

/**
 * Fetch a cannabis invitation by its token.
 * Returns null if the token is invalid, expired, already claimed, or not approved.
 */
export async function getCannabisInviteByToken(token: string) {
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('cannabis_tier_invitations')
    .select(
      'id, invitee_email, invitee_name, personal_note, expires_at, claimed_at, admin_approval_status'
    )
    .eq('token', token)
    .eq('admin_approval_status', 'approved')
    .is('claimed_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null
  return data as {
    id: string
    invitee_email: string
    invitee_name: string | null
    personal_note: string | null
    expires_at: string
    claimed_at: string | null
    admin_approval_status: string
  }
}

// ─── Claim an Invite ──────────────────────────────────────────────────────────

/**
 * The authenticated user claims the cannabis invite.
 * Must be called by someone who is signed in — their auth.uid() is used.
 * Validates the token is still valid, then:
 * 1. Marks the invitation as claimed
 * 2. Inserts a cannabis_tier_users row for the claiming user
 */
export async function claimCannabisInvite(token: string) {
  const supabase = createServerClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to claim this invitation.' }
  }

  // Validate the invite
  const invite = await getCannabisInviteByToken(token)
  if (!invite) {
    return {
      success: false,
      error: 'This invitation is invalid, expired, or has already been claimed.',
    }
  }

  // Get user role info
  const { data: roleData } = await (supabase as any)
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .single()

  // Check if they already have tier access
  const { data: existing } = await (supabase as any)
    .from('cannabis_tier_users')
    .select('status')
    .eq('auth_user_id', user.id)
    .single()

  if (existing?.status === 'active') {
    return { success: false, error: 'You already have cannabis tier access.' }
  }

  // Use admin client for the writes (bypasses RLS for insert into cannabis_tier_users)
  const adminClient = createAdminClient()

  // Mark invite as claimed
  const { error: claimError } = await (adminClient as any)
    .from('cannabis_tier_invitations')
    .update({ claimed_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('admin_approval_status', 'approved')
    .is('claimed_at', null)

  if (claimError) {
    return { success: false, error: 'Failed to claim invitation. Please try again.' }
  }

  // Grant cannabis tier
  const userType = (roleData?.role as 'chef' | 'client' | 'partner') ?? 'client'

  // Get tenant_id if chef
  let tenantId: string | undefined
  if (userType === 'chef' && roleData?.entity_id) {
    tenantId = roleData.entity_id
  } else if (userType === 'client' && roleData?.entity_id) {
    const { data: clientData } = await (adminClient as any)
      .from('clients')
      .select('tenant_id')
      .eq('id', roleData.entity_id)
      .single()
    tenantId = clientData?.tenant_id ?? undefined
  }

  const { error: grantError } = await (adminClient as any).from('cannabis_tier_users').upsert(
    {
      auth_user_id: user.id,
      user_type: userType,
      entity_id: roleData?.entity_id ?? user.id,
      tenant_id: tenantId ?? null,
      granted_by_admin_email: 'invite-claim',
      status: 'active',
      notes: `Claimed via invitation token — invite ID: ${invite.id}`,
    },
    { onConflict: 'auth_user_id' }
  )

  if (grantError) {
    return { success: false, error: 'Failed to activate cannabis tier. Please contact support.' }
  }

  return { success: true }
}
