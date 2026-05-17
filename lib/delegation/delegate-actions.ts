'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  DelegateRole,
  DelegatePermission,
  DelegateRecord,
  DelegateActivityLogEntry,
} from './delegate-types'
import { DEFAULT_PERMISSIONS } from './delegate-types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const VALID_PERMISSIONS: DelegatePermission[] = [
  'view_events',
  'view_finances',
  'manage_guests',
  'approve_menus',
  'handle_payments',
  'answer_logistics',
  'post_updates',
]

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  role: z.enum(['full_delegate', 'view_coordinate']),
  permissions: z
    .array(
      z.enum([
        'view_events',
        'view_finances',
        'manage_guests',
        'approve_menus',
        'handle_payments',
        'answer_logistics',
        'post_updates',
      ])
    )
    .min(1),
})

const UpdatePermissionsSchema = z.object({
  delegateId: z.string().uuid(),
  permissions: z
    .array(
      z.enum([
        'view_events',
        'view_finances',
        'manage_guests',
        'approve_menus',
        'handle_payments',
        'answer_logistics',
        'post_updates',
      ])
    )
    .min(1),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRow(row: any): DelegateRecord {
  return {
    id: row.id,
    chefTenantId: row.chef_tenant_id,
    delegateUserId: row.delegate_user_id,
    delegateEmail: row.delegate_email,
    delegateName: row.delegate_name,
    delegatePhone: row.delegate_phone,
    role: row.role as DelegateRole,
    permissions: (row.permissions_json ?? []) as DelegatePermission[],
    status: row.status,
    inviteToken: row.invite_token,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
  }
}

function mapActivityRow(row: any): DelegateActivityLogEntry {
  return {
    id: row.id,
    delegateId: row.delegate_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    detailsJson: row.details_json,
    createdAt: row.created_at,
  }
}

async function logActivity(
  db: ReturnType<typeof createServerClient>,
  delegateId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  await db.from('delegate_activity_log').insert({
    delegate_id: delegateId,
    action,
    resource_type: resourceType ?? null,
    resource_id: resourceId ?? null,
    details_json: details ?? null,
  })
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Invite a delegate (PA/assistant) with specific role and permissions.
 */
export async function inviteDelegate(
  email: string,
  role: DelegateRole,
  permissions: DelegatePermission[],
  opts?: { name?: string; phone?: string }
): Promise<{ success: boolean; delegate?: DelegateRecord; error?: string }> {
  const user = await requireChef()
  const parsed = InviteSchema.safeParse({
    email,
    name: opts?.name,
    phone: opts?.phone,
    role,
    permissions,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const db = createServerClient()

  // Check for existing active delegate with same email
  const { data: existing } = await db
    .from('chef_delegates')
    .select('id, status')
    .eq('chef_tenant_id', user.tenantId)
    .eq('delegate_email', parsed.data.email.toLowerCase())
    .neq('status', 'revoked')
    .single()

  if (existing) {
    return { success: false, error: 'A delegate with this email already exists' }
  }

  // Use defaults if no permissions specified for the role
  const finalPermissions = permissions.length > 0 ? permissions : DEFAULT_PERMISSIONS[role]

  const { data: row, error } = await db
    .from('chef_delegates')
    .insert({
      chef_tenant_id: user.tenantId,
      delegate_email: parsed.data.email.toLowerCase(),
      delegate_name: parsed.data.name ?? null,
      delegate_phone: parsed.data.phone ?? null,
      role: parsed.data.role,
      permissions_json: finalPermissions,
      status: 'invited',
    })
    .select()
    .single()

  if (error || !row) {
    return { success: false, error: error?.message ?? 'Failed to create delegate invite' }
  }

  revalidatePath('/dashboard')
  return { success: true, delegate: mapRow(row) }
}

/**
 * Accept a delegate invitation using the invite token.
 * Called by the delegate user after they sign in/up.
 */
export async function acceptDelegateInvite(
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid token' }
  }

  const db = createServerClient()

  const { data: delegate } = await db
    .from('chef_delegates')
    .select('id, status')
    .eq('invite_token', token)
    .single()

  if (!delegate) {
    return { success: false, error: 'Invite not found or expired' }
  }

  if (delegate.status === 'active') {
    return { success: true } // Already accepted, idempotent
  }

  if (delegate.status === 'revoked') {
    return { success: false, error: 'This invitation has been revoked' }
  }

  const { error } = await db
    .from('chef_delegates')
    .update({
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', delegate.id)

  if (error) {
    return { success: false, error: error.message }
  }

  await logActivity(db, delegate.id, 'invite_accepted')
  return { success: true }
}

/**
 * Revoke delegate access. Sets status to 'revoked'.
 */
export async function revokeDelegateAccess(
  delegateId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  if (!delegateId || !z.string().uuid().safeParse(delegateId).success) {
    return { success: false, error: 'Invalid delegate ID' }
  }

  const db = createServerClient()

  // Verify ownership
  const { data: delegate } = await db
    .from('chef_delegates')
    .select('id, status')
    .eq('id', delegateId)
    .eq('chef_tenant_id', user.tenantId)
    .single()

  if (!delegate) {
    return { success: false, error: 'Delegate not found' }
  }

  if (delegate.status === 'revoked') {
    return { success: true } // Idempotent
  }

  const { error } = await db
    .from('chef_delegates')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', delegateId)

  if (error) {
    return { success: false, error: error.message }
  }

  await logActivity(db, delegateId, 'access_revoked')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get all delegates for the current chef (all statuses).
 */
export async function getDelegates(): Promise<{
  success: boolean
  delegates?: DelegateRecord[]
  error?: string
}> {
  const user = await requireChef()
  const db = createServerClient()

  const { data: rows, error } = await db
    .from('chef_delegates')
    .select('*')
    .eq('chef_tenant_id', user.tenantId)
    .order('invited_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, delegates: (rows ?? []).map(mapRow) }
}

/**
 * Get permissions for a specific delegate. Tenant-scoped.
 */
export async function getDelegatePermissions(delegateId: string): Promise<{
  success: boolean
  permissions?: DelegatePermission[]
  role?: DelegateRole
  error?: string
}> {
  const user = await requireChef()

  if (!z.string().uuid().safeParse(delegateId).success) {
    return { success: false, error: 'Invalid delegate ID' }
  }

  const db = createServerClient()

  const { data: delegate, error } = await db
    .from('chef_delegates')
    .select('role, permissions_json')
    .eq('id', delegateId)
    .eq('chef_tenant_id', user.tenantId)
    .single()

  if (error || !delegate) {
    return { success: false, error: 'Delegate not found' }
  }

  return {
    success: true,
    role: delegate.role as DelegateRole,
    permissions: (delegate.permissions_json ?? []) as DelegatePermission[],
  }
}

/**
 * Update permissions for a delegate. Tenant-scoped.
 */
export async function updateDelegatePermissions(
  delegateId: string,
  permissions: DelegatePermission[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  const parsed = UpdatePermissionsSchema.safeParse({ delegateId, permissions })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const db = createServerClient()

  // Verify ownership and active status
  const { data: delegate } = await db
    .from('chef_delegates')
    .select('id, status')
    .eq('id', delegateId)
    .eq('chef_tenant_id', user.tenantId)
    .single()

  if (!delegate) {
    return { success: false, error: 'Delegate not found' }
  }

  if (delegate.status === 'revoked') {
    return { success: false, error: 'Cannot update permissions for a revoked delegate' }
  }

  const { error } = await db
    .from('chef_delegates')
    .update({ permissions_json: parsed.data.permissions })
    .eq('id', delegateId)

  if (error) {
    return { success: false, error: error.message }
  }

  await logActivity(db, delegateId, 'permissions_updated', undefined, undefined, {
    permissions: parsed.data.permissions,
  })

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get activity log for a specific delegate. Tenant-scoped.
 */
export async function getActivityLog(
  delegateId: string,
  opts?: { limit?: number }
): Promise<{
  success: boolean
  entries?: DelegateActivityLogEntry[]
  error?: string
}> {
  const user = await requireChef()

  if (!z.string().uuid().safeParse(delegateId).success) {
    return { success: false, error: 'Invalid delegate ID' }
  }

  const db = createServerClient()

  // Verify ownership
  const { data: delegate } = await db
    .from('chef_delegates')
    .select('id')
    .eq('id', delegateId)
    .eq('chef_tenant_id', user.tenantId)
    .single()

  if (!delegate) {
    return { success: false, error: 'Delegate not found' }
  }

  const { data: rows, error } = await db
    .from('delegate_activity_log')
    .select('*')
    .eq('delegate_id', delegateId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, entries: (rows ?? []).map(mapActivityRow) }
}
