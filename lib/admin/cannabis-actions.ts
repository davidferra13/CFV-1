'use server'

// Admin Cannabis Tier Actions
// Full control over cannabis tier grants and invite approvals.
// Only callable by users in ADMIN_EMAILS env var.

import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logAdminAction } from './audit'
import { randomBytes } from 'crypto'

// ─── Fetch All Cannabis Tier Users ───────────────────────────────────────────

export async function getAllCannabisUsers() {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('cannabis_tier_users')
    .select('*')
    .order('granted_at', { ascending: false })

  if (error) throw new Error('Failed to fetch cannabis tier users: ' + error.message)
  return (data ?? []) as {
    id: string
    auth_user_id: string
    user_type: string
    entity_id: string
    tenant_id: string | null
    granted_by_admin_email: string
    granted_at: string
    status: string
    notes: string | null
  }[]
}

// ─── Fetch Pending Invitations ────────────────────────────────────────────────

export async function getPendingInvites() {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('cannabis_tier_invitations')
    .select('*')
    .eq('admin_approval_status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw new Error('Failed to fetch pending cannabis invites: ' + error.message)
  return (data ?? []) as {
    id: string
    invited_by_auth_user_id: string
    invited_by_user_type: string
    invitee_email: string
    invitee_name: string | null
    personal_note: string | null
    admin_approval_status: string
    created_at: string
  }[]
}

// ─── Fetch All Invitations ────────────────────────────────────────────────────

export async function getAllCannabisInvites() {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('cannabis_tier_invitations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error('Failed to fetch cannabis invites: ' + error.message)
  return (data ?? []) as {
    id: string
    invited_by_auth_user_id: string
    invited_by_user_type: string
    invitee_email: string
    invitee_name: string | null
    personal_note: string | null
    admin_approval_status: string
    approved_by_admin_email: string | null
    approved_at: string | null
    rejection_reason: string | null
    token: string | null
    sent_at: string | null
    claimed_at: string | null
    expires_at: string | null
    created_at: string
  }[]
}

// ─── Grant Cannabis Tier ──────────────────────────────────────────────────────

export async function grantCannabisTier(input: {
  authUserId: string
  userType: 'chef' | 'client' | 'partner'
  entityId: string
  tenantId?: string
  notes?: string
}) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db.from('cannabis_tier_users').upsert(
    {
      auth_user_id: input.authUserId,
      user_type: input.userType,
      entity_id: input.entityId,
      tenant_id: input.tenantId ?? null,
      granted_by_admin_email: admin.email,
      status: 'active',
      notes: input.notes ?? null,
    },
    { onConflict: 'auth_user_id' }
  )

  if (error) throw new Error('Failed to grant cannabis tier: ' + error.message)

  revalidateTag(`cannabis-access-${input.authUserId}`)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_tier_granted',
    targetId: input.authUserId,
    targetType: input.userType,
    details: { entity_id: input.entityId, notes: input.notes },
  })

  return { success: true }
}

// ─── Revoke Cannabis Tier ─────────────────────────────────────────────────────

export async function revokeCannabisTier(authUserId: string) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db
    .from('cannabis_tier_users')
    .update({ status: 'suspended' })
    .eq('auth_user_id', authUserId)

  if (error) throw new Error('Failed to revoke cannabis tier: ' + error.message)

  revalidateTag(`cannabis-access-${authUserId}`)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_tier_revoked',
    targetId: authUserId,
    targetType: 'user',
    details: {},
  })

  return { success: true }
}

// ─── Approve an Invite ────────────────────────────────────────────────────────
// Generates a token and sets the expiry. The calling code is responsible
// for triggering the email send (via non-blocking side effect).

export async function approveInvite(inviteId: string) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

  const { error } = await db
    .from('cannabis_tier_invitations')
    .update({
      admin_approval_status: 'approved',
      approved_by_admin_email: admin.email,
      approved_at: new Date().toISOString(),
      token,
      sent_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .eq('id', inviteId)
    .eq('admin_approval_status', 'pending')

  if (error) throw new Error('Failed to approve invite: ' + error.message)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_invite_approved',
    targetId: inviteId,
    targetType: 'cannabis_invitation',
    details: { expires_at: expiresAt },
  })

  return { success: true, token }
}

// ─── Reject an Invite ─────────────────────────────────────────────────────────

export async function rejectInvite(inviteId: string, reason?: string) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db
    .from('cannabis_tier_invitations')
    .update({
      admin_approval_status: 'rejected',
      approved_by_admin_email: admin.email,
      approved_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
    })
    .eq('id', inviteId)
    .eq('admin_approval_status', 'pending')

  if (error) throw new Error('Failed to reject invite: ' + error.message)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_invite_rejected',
    targetId: inviteId,
    targetType: 'cannabis_invitation',
    details: { reason },
  })

  return { success: true }
}

// ─── Grant Tier Directly (Admin sends invite themselves) ──────────────────────

export async function adminGrantTierByEmail(input: { email: string; notes?: string }) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  // Look up the auth user by email
  const { data: authData, error: authError } = await db.auth.admin.listUsers()
  if (authError) throw new Error('Failed to look up users')

  const targetUser = authData.users.find(
    (u: any) => u.email?.toLowerCase() === input.email.toLowerCase()
  )
  if (!targetUser) throw new Error(`No account found for email: ${input.email}`)

  // Get their role
  const { data: roleData } = await db
    .from('user_roles')
    .select('role, entity_id')
    .eq('auth_user_id', targetUser.id)
    .single()

  const userType = (roleData?.role as 'chef' | 'client' | 'partner') ?? 'client'
  const entityId = roleData?.entity_id ?? targetUser.id

  return grantCannabisTier({
    authUserId: targetUser.id,
    userType,
    entityId,
    notes: input.notes,
  })
}
