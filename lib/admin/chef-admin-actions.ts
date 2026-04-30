'use server'

// Admin Chef Management Actions - deactivation, reactivation, ledger corrections
// All mutations require admin auth and are audit-logged.

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { FOUNDER_AUTHORITY_LABEL, isFounderAuthorityTarget } from '@/lib/platform/owner-account'
import { logAdminAction } from './log-admin-action'
import { revalidatePath, revalidateTag } from 'next/cache'

const FOUNDER_AUTHORITY_PROTECTED_ERROR =
  'Founder Authority is protected and cannot be downgraded, disabled, or converted.'

async function logFounderAuthorityBlockedMutation(input: {
  admin: { email: string; id: string }
  chefId: string
  attemptedAction: string
}) {
  await logAdminAction({
    actorEmail: input.admin.email,
    actorUserId: input.admin.id,
    actionType: 'role_assigned',
    targetId: input.chefId,
    targetType: 'chef',
    details: {
      type: 'founder_authority_mutation_blocked',
      authority: FOUNDER_AUTHORITY_LABEL,
      attemptedAction: input.attemptedAction,
    },
  })
}

// ─── Account Status ──────────────────────────────────────────────────────────

/**
 * Suspend a chef account. Prevents portal login by blocking requireChef().
 */
export async function suspendChef(chefId: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  if (await isFounderAuthorityTarget(db, { chefId })) {
    await logFounderAuthorityBlockedMutation({
      admin,
      chefId,
      attemptedAction: 'suspend_chef',
    })
    return { success: false, error: FOUNDER_AUTHORITY_PROTECTED_ERROR }
  }

  const { error } = await db
    .from('chefs')
    .update({ account_status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', chefId)

  if (error) {
    console.error('[Admin] suspendChef error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'account_deactivated',
    targetId: chefId,
    targetType: 'chef',
    details: { reason: 'admin suspension' },
  })

  revalidatePath(`/admin/users/${chefId}`)
  revalidatePath('/admin/users')
  revalidateTag(`chef-layout-${chefId}`)
  return { success: true }
}

/**
 * Reactivate a previously suspended chef account.
 */
export async function reactivateChef(
  chefId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db
    .from('chefs')
    .update({ account_status: 'active', updated_at: new Date().toISOString() })
    .eq('id', chefId)

  if (error) {
    console.error('[Admin] reactivateChef error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'account_reactivated',
    targetId: chefId,
    targetType: 'chef',
    details: {},
  })

  revalidatePath(`/admin/users/${chefId}`)
  revalidatePath('/admin/users')
  revalidateTag(`chef-layout-${chefId}`)
  return { success: true }
}

// ─── Comp / VIP Management ──────────────────────────────────────────────────

/**
 * Grant comped (free Pro) status to a chef.
 * If the chef has an active Stripe subscription, cancels it first to prevent double state.
 */
export async function compChef(
  chefId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason.trim()) return { success: false, error: 'Reason is required.' }

  const admin = await requireAdmin()
  const db: any = createAdminClient()

  // Check for active Stripe subscription
  const { data: chef } = await db
    .from('chefs')
    .select('stripe_subscription_id, subscription_status')
    .eq('id', chefId)
    .single()

  if (!chef) return { success: false, error: 'Chef not found.' }

  // Cancel Stripe subscription if active (prevent continued billing)
  if (chef.stripe_subscription_id) {
    try {
      const key = process.env.STRIPE_SECRET_KEY
      if (key) {
        const StripeLib = require('stripe')
        const StripeCtor = StripeLib.default || StripeLib
        const stripe = new StripeCtor(key, {
          apiVersion: '2025-12-18.acacia',
        })
        await stripe.subscriptions.cancel(chef.stripe_subscription_id)
      }
    } catch (err) {
      console.error('[Admin] Failed to cancel Stripe subscription during comp:', err)
      // Continue anyway; the subscription_status override will take effect locally.
      // Stripe webhook may fire later and attempt to set 'canceled', but our
      // handleSubscriptionDeleted preserves comped if already set.
    }
  }

  const { error } = await db
    .from('chefs')
    .update({
      subscription_status: 'comped',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chefId)

  if (error) {
    console.error('[Admin] compChef error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'account_reactivated',
    targetId: chefId,
    targetType: 'chef',
    details: { type: 'comped', reason: reason.trim(), previousStatus: chef.subscription_status },
  })

  revalidatePath(`/admin/users/${chefId}`)
  revalidatePath('/admin/users')
  revalidateTag(`chef-layout-${chefId}`)
  return { success: true }
}

/**
 * Revoke comped status, dropping the chef to free tier.
 */
export async function revokeComp(chefId: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db
    .from('chefs')
    .update({
      subscription_status: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chefId)

  if (error) {
    console.error('[Admin] revokeComp error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'account_deactivated',
    targetId: chefId,
    targetType: 'chef',
    details: { type: 'comp_revoked' },
  })

  revalidatePath(`/admin/users/${chefId}`)
  revalidatePath('/admin/users')
  revalidateTag(`chef-layout-${chefId}`)
  return { success: true }
}

/**
 * Grant or revoke VIP access for a chef.
 * VIP = all features unlocked, focus mode bypass, no admin panel.
 */
export async function setVIPAccess(
  chefId: string,
  grant: boolean,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  // Resolve authUserId from chefId
  const { data: userRole } = await db
    .from('user_roles')
    .select('auth_user_id')
    .eq('role', 'chef')
    .eq('entity_id', chefId)
    .maybeSingle()

  if (!userRole?.auth_user_id) {
    return { success: false, error: 'Could not resolve auth user for this chef.' }
  }

  // Resolve email from chefs table
  const { data: chefRow } = await db.from('chefs').select('email').eq('id', chefId).single()

  const email = chefRow?.email?.toLowerCase() ?? ''

  if (
    await isFounderAuthorityTarget(db, {
      chefId,
      authUserId: userRole.auth_user_id,
      email,
    })
  ) {
    await logFounderAuthorityBlockedMutation({
      admin,
      chefId,
      attemptedAction: grant ? 'grant_vip' : 'revoke_vip',
    })
    return { success: false, error: FOUNDER_AUTHORITY_PROTECTED_ERROR }
  }

  if (grant) {
    // Check if they already have a platform_admins row
    const { data: existing } = await db
      .from('platform_admins')
      .select('id, access_level, is_active')
      .eq('auth_user_id', userRole.auth_user_id)
      .maybeSingle()

    if (existing) {
      if (existing.access_level === 'owner' || existing.access_level === 'admin') {
        return {
          success: false,
          error: `User already has ${existing.access_level} access. Cannot downgrade to VIP.`,
        }
      }
      // Reactivate or update existing VIP row
      const { error } = await db
        .from('platform_admins')
        .update({
          access_level: 'vip',
          is_active: true,
          notes: notes?.trim() || existing.notes || 'VIP access',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) return { success: false, error: error.message }
    } else {
      // Insert new VIP row
      const { error } = await db.from('platform_admins').insert({
        auth_user_id: userRole.auth_user_id,
        email,
        access_level: 'vip',
        is_active: true,
        notes: notes?.trim() || 'VIP access granted by admin',
        created_by_auth_user_id: admin.id,
      })

      if (error) return { success: false, error: error.message }
    }
  } else {
    // Revoke: deactivate (don't delete, for audit trail)
    const { error } = await db
      .from('platform_admins')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('auth_user_id', userRole.auth_user_id)
      .eq('access_level', 'vip')

    if (error) return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: grant ? 'account_reactivated' : 'account_deactivated',
    targetId: chefId,
    targetType: 'chef',
    details: { type: grant ? 'vip_granted' : 'vip_revoked', notes: notes?.trim() },
  })

  revalidatePath(`/admin/users/${chefId}`)
  revalidatePath('/admin/users')
  revalidateTag(`chef-layout-${chefId}`)
  revalidateTag(`is-admin-${userRole.auth_user_id}`)
  revalidateTag(`is-privileged-${userRole.auth_user_id}`)
  return { success: true }
}

// ─── Admin Ledger Corrections ────────────────────────────────────────────────

/**
 * Issue an admin credit or adjustment to a chef's ledger.
 * Appends a new immutable ledger entry of type 'adjustment'.
 * This is the correct, additive approach - the ledger is never modified.
 */
export async function issueAdminCredit(params: {
  chefId: string
  eventId?: string
  amountCents: number
  description: string
}): Promise<{ success: boolean; error?: string }> {
  const { chefId, eventId, amountCents, description } = params

  if (!description.trim()) {
    return { success: false, error: 'A description is required for all admin credits.' }
  }
  if (amountCents === 0) {
    return { success: false, error: 'Amount cannot be zero.' }
  }

  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db.from('ledger_entries').insert({
    tenant_id: chefId,
    event_id: eventId ?? null,
    entry_type: 'adjustment',
    amount_cents: amountCents,
    description: `[Admin Credit] ${description.trim()} - issued by ${admin.email}`,
  } as any)

  if (error) {
    console.error('[Admin] issueAdminCredit error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'admin_toggled_flag', // closest available - ideally add 'admin_ledger_correction' in future
    targetId: chefId,
    targetType: 'chef',
    details: { type: 'ledger_correction', amountCents, description, eventId },
  })

  revalidatePath(`/admin/users/${chefId}`)
  return { success: true }
}
