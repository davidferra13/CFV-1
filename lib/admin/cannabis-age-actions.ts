'use server'

import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logAdminAction } from './audit'
import { notifyCannabisAgeApproved } from '@/lib/cannabis/notifications'

export type AgePermissionRecord = {
  id: string
  auth_user_id: string
  status: string
  verification_method: string | null
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getAllAgePermissions() {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('cannabis_age_permissions')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error('Failed to fetch age permissions: ' + error.message)
  return (data ?? []) as AgePermissionRecord[]
}

export async function getAgePermissionByUser(authUserId: string) {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('cannabis_age_permissions')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) throw new Error('Failed to fetch age permission')
  return data as AgePermissionRecord | null
}

export async function approveAgePermission(input: {
  authUserId: string
  method?: 'admin_manual' | 'in_person' | 'document_upload'
  expiresInDays?: number
  notes?: string
}) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await db.from('cannabis_age_permissions').upsert(
    {
      auth_user_id: input.authUserId,
      status: 'approved',
      verification_method: input.method ?? 'admin_manual',
      approved_by: admin.email,
      approved_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      expires_at: expiresAt,
      notes: input.notes ?? null,
    },
    { onConflict: 'auth_user_id' }
  )

  if (error) throw new Error('Failed to approve age permission: ' + error.message)

  revalidateTag(`cannabis-access-${input.authUserId}`)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_age_approved',
    targetId: input.authUserId,
    targetType: 'user',
    details: { method: input.method, expires_at: expiresAt },
  })

  // Fire-and-forget age approval notification
  try {
    const { data: tierRow } = await db
      .from('cannabis_tier_users')
      .select('tenant_id, entity_id')
      .eq('auth_user_id', input.authUserId)
      .maybeSingle()

    await notifyCannabisAgeApproved({
      recipientId: input.authUserId,
      tenantId: tierRow?.tenant_id ?? tierRow?.entity_id ?? input.authUserId,
    })
  } catch (notifErr) {
    console.error('[CANNABIS] Non-blocking: age approval notification failed:', notifErr)
  }

  return { success: true }
}

export async function rejectAgePermission(input: { authUserId: string; reason?: string }) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db.from('cannabis_age_permissions').upsert(
    {
      auth_user_id: input.authUserId,
      status: 'rejected',
      rejected_by: admin.email,
      rejected_at: new Date().toISOString(),
      rejection_reason: input.reason ?? null,
    },
    { onConflict: 'auth_user_id' }
  )

  if (error) throw new Error('Failed to reject age permission: ' + error.message)

  revalidateTag(`cannabis-access-${input.authUserId}`)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_age_rejected',
    targetId: input.authUserId,
    targetType: 'user',
    details: { reason: input.reason },
  })

  return { success: true }
}

export async function blockAgePermission(input: { authUserId: string; reason?: string }) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db.from('cannabis_age_permissions').upsert(
    {
      auth_user_id: input.authUserId,
      status: 'blocked',
      rejected_by: admin.email,
      rejected_at: new Date().toISOString(),
      rejection_reason: input.reason ?? null,
    },
    { onConflict: 'auth_user_id' }
  )

  if (error) throw new Error('Failed to block age permission: ' + error.message)

  revalidateTag(`cannabis-access-${input.authUserId}`)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_age_blocked',
    targetId: input.authUserId,
    targetType: 'user',
    details: { reason: input.reason },
  })

  return { success: true }
}

export async function revokeCannabisTierWithReason(input: { authUserId: string; reason?: string }) {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db
    .from('cannabis_tier_users')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: admin.email,
      revocation_reason: input.reason ?? null,
    })
    .eq('auth_user_id', input.authUserId)

  if (error) throw new Error('Failed to revoke cannabis tier: ' + error.message)

  revalidateTag(`cannabis-access-${input.authUserId}`)

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'cannabis_tier_revoked',
    targetId: input.authUserId,
    targetType: 'user',
    details: { reason: input.reason },
  })

  return { success: true }
}

export async function getCannabisAccessOverview() {
  await requireAdmin()
  const db: any = createAdminClient()

  const [tierResult, ageResult, requestsResult] = await Promise.all([
    db
      .from('cannabis_tier_users')
      .select('auth_user_id, user_type, entity_id, status, granted_at, revoked_at, notes'),
    db
      .from('cannabis_age_permissions')
      .select('auth_user_id, status, verification_method, approved_at, expires_at'),
    db
      .from('cannabis_dinner_requests')
      .select('id, auth_user_id, client_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const tierUsers = tierResult.data ?? []
  const agePermissions = ageResult.data ?? []
  const requests = requestsResult.data ?? []

  const ageByUser = Object.fromEntries(agePermissions.map((a: any) => [a.auth_user_id, a]))

  const combinedUsers = tierUsers.map((t: any) => ({
    ...t,
    agePermission: ageByUser[t.auth_user_id] ?? null,
    canAccessPortal:
      t.status === 'active' &&
      ['approved', 'manually_verified', 'self_attested'].includes(
        ageByUser[t.auth_user_id]?.status ?? ''
      ),
  }))

  return {
    users: combinedUsers,
    requests,
    summary: {
      totalTierUsers: tierUsers.length,
      activeTier: tierUsers.filter((t: any) => t.status === 'active').length,
      ageApproved: agePermissions.filter((a: any) =>
        ['approved', 'manually_verified', 'self_attested'].includes(a.status)
      ).length,
      agePending: agePermissions.filter(
        (a: any) => a.status === 'pending' || a.status === 'not_submitted'
      ).length,
      pendingRequests: requests.filter((r: any) => r.status === 'submitted').length,
    },
  }
}
