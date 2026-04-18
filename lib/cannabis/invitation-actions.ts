'use server'

// Public Cannabis Invitation Actions
// Used by app/(public)/cannabis-invite/[token]/page.tsx
// These run in the public route context - no auth required to VIEW the page,
// but the user must sign in/have an account before claiming the invite.

import { revalidateTag } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'

// ─── Look Up Invite by Token ──────────────────────────────────────────────────

/**
 * Fetch a cannabis invitation by its token.
 * Uses admin client to bypass RLS (the claiming user is not the inviter,
 * so the inviter-only SELECT policy would block this query).
 * Returns null for any invalid/expired/claimed token (generic response
 * to prevent token status enumeration).
 */
export async function getCannabisInviteByToken(token: string) {
  const db: any = createAdminClient()

  const { data, error } = await db
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
 * Must be called by someone who is signed in - their auth.uid() is used.
 * Validates the token is still valid, then atomically:
 * 1. Marks the invitation as claimed (with expiration re-check + row count guard)
 * 2. Inserts a cannabis_tier_users row for the claiming user
 */
export async function claimCannabisInvite(token: string) {
  const db: any = createServerClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser()

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

  // Use admin client for all writes (bypasses RLS)
  const adminClient: any = createAdminClient()

  // Get user role info
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', user.id)
    .single()

  // Check if they already have tier access
  const { data: existing } = await adminClient
    .from('cannabis_tier_users')
    .select('status')
    .eq('auth_user_id', user.id)
    .single()

  if (existing?.status === 'active') {
    return { success: false, error: 'You already have cannabis tier access.' }
  }

  // Atomically claim the invite with ALL guards:
  // - must still be approved
  // - must not be claimed yet (race condition guard)
  // - must not be expired (expiration re-check at write time)
  const now = new Date().toISOString()
  const { data: claimResult, error: claimError } = await adminClient
    .from('cannabis_tier_invitations')
    .update({ claimed_at: now })
    .eq('id', invite.id)
    .eq('admin_approval_status', 'approved')
    .is('claimed_at', null)
    .gt('expires_at', now)
    .select('id')

  if (claimError) {
    return { success: false, error: 'Failed to claim invitation. Please try again.' }
  }

  // Check affected row count: if zero rows matched, someone else claimed it
  // or it expired between validation and write
  if (!claimResult || claimResult.length === 0) {
    return {
      success: false,
      error: 'This invitation is invalid, expired, or has already been claimed.',
    }
  }

  // Grant cannabis tier
  const userType = (roleData?.role as 'chef' | 'client' | 'partner') ?? 'client'

  // Get tenant_id if chef
  let tenantId: string | undefined
  if (userType === 'chef' && roleData?.entity_id) {
    tenantId = roleData.entity_id
  } else if (userType === 'client' && roleData?.entity_id) {
    const { data: clientData } = await adminClient
      .from('clients')
      .select('tenant_id')
      .eq('id', roleData.entity_id)
      .single()
    tenantId = clientData?.tenant_id ?? undefined
  }

  const { error: grantError } = await adminClient.from('cannabis_tier_users').upsert(
    {
      auth_user_id: user.id,
      user_type: userType,
      entity_id: roleData?.entity_id ?? user.id,
      tenant_id: tenantId ?? null,
      granted_by_admin_email: 'invite-claim',
      status: 'active',
      notes: `Claimed via invitation token - invite ID: ${invite.id}`,
    },
    { onConflict: 'auth_user_id' }
  )

  if (grantError) {
    return { success: false, error: 'Failed to activate cannabis tier. Please contact support.' }
  }

  // Bust the layout cache so the user sees their new access immediately
  revalidateTag(`cannabis-access-${user.id}`)

  return { success: true }
}
