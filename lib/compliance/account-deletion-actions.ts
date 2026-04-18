'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { log } from '@/lib/logger'
import { revalidatePath, revalidateTag } from 'next/cache'
import { randomBytes } from 'crypto'
import { runPreDeletionChecks } from './pre-deletion-checks'
import { cleanupStorageBuckets } from './storage-cleanup'
import { logChefActivity } from '@/lib/activity/log-chef'
import { checkRateLimit } from '@/lib/rateLimit'

// ─── Deletion Audit Helper ────────────────────────────────────────────────────

async function logDeletionAudit(input: {
  chefId: string
  authUserId: string
  email: string
  businessName: string
  action: string
  metadata?: Record<string, unknown>
  performedBy?: string
}) {
  try {
    const adminClient: any = createServerClient({ admin: true })
    await adminClient.from('account_deletion_audit').insert({
      chef_id: input.chefId,
      auth_user_id: input.authUserId,
      email: input.email,
      business_name: input.businessName,
      action: input.action,
      metadata: input.metadata || {},
      performed_by: input.performedBy || 'system',
    })
  } catch (err) {
    ;(log as any).error('[deletion-audit] Failed to write audit entry', {
      error: err,
      action: input.action,
    })
  }
}

// ─── Request Account Deletion ──────────────────────────────────────────────────

/**
 * Soft-deletes a chef account with a 30-day grace period.
 * - Verifies password
 * - Runs pre-deletion checks (must have no blockers)
 * - Sets deletion_requested_at and deletion_scheduled_for
 * - Bans the auth user to prevent new logins
 * - Signs out and redirects to home
 */
export async function requestAccountDeletion(
  password: string,
  reason?: string
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Get current user from auth
  const {
    data: { user: authUser },
  } = await db.auth.getUser()
  if (!authUser?.email) throw new Error('Not authenticated')

  // Rate limit: 3 deletion attempts per hour per user (prevents brute-forcing password)
  await checkRateLimit(`account-deletion:${user.id}`, 3, 60 * 60 * 1000)

  // 2. Verify password
  const { error: verifyError } = await db.auth.signInWithPassword({
    email: authUser.email,
    password,
  })
  if (verifyError) throw new Error('Password is incorrect')

  // 3. Run pre-deletion checks
  const blockers = await runPreDeletionChecks(user.entityId)
  if (blockers.length > 0) {
    throw new Error(`Cannot delete account: ${blockers.map((b) => b.message).join(' ')}`)
  }

  // 4. Get chef details for audit
  const adminClient: any = createServerClient({ admin: true })
  const { data: chef } = await adminClient
    .from('chefs')
    .select('business_name, email')
    .eq('id', user.entityId)
    .single()

  const businessName = chef?.business_name || 'Unknown'
  const email = chef?.email || authUser.email

  // 5. Generate reactivation token and set soft-delete columns
  // SECURITY: 256-bit token (vs 122-bit UUID v4) - higher entropy for security-critical recovery token
  const reactivationToken = randomBytes(32).toString('hex')
  const scheduledFor = new Date()
  scheduledFor.setDate(scheduledFor.getDate() + 30)

  const { error: updateError } = await adminClient
    .from('chefs')
    .update({
      deletion_requested_at: new Date().toISOString(),
      deletion_scheduled_for: scheduledFor.toISOString(),
      deletion_reason: reason || null,
      deletion_reactivation_token: reactivationToken,
    })
    .eq('id', user.entityId)

  if (updateError) {
    ;(log as any).error('[account-deletion] Failed to set soft-delete columns', {
      error: updateError,
    })
    throw new Error('Failed to process deletion request')
  }

  // 6. DO NOT ban immediately - user keeps full access for the 30-day grace period.
  // The cron purge bans the auth user when the grace period expires.
  // This lets the chef export data, wrap up business, and cancel if they change their mind.

  // 7. Log audit entries (non-blocking)
  try {
    await logDeletionAudit({
      chefId: user.entityId,
      authUserId: authUser.id,
      email,
      businessName,
      action: 'deletion_requested',
      metadata: {
        reason,
        scheduled_for: scheduledFor.toISOString(),
        reactivation_token: reactivationToken,
      },
      performedBy: 'chef',
    })
  } catch {
    // Non-blocking
  }

  try {
    await logChefActivity({
      tenantId: user.entityId,
      actorId: authUser.id,
      action: 'account_deletion_requested',
      domain: 'account',
      entityType: 'chef',
      entityId: user.entityId,
      summary: `Account deletion requested. Scheduled for ${scheduledFor.toLocaleDateString()}.`,
      context: { reason, scheduled_for: scheduledFor.toISOString() },
    })
  } catch {
    // Non-blocking
  }

  // 8. Revalidate so the deletion banner appears immediately
  revalidateTag(`deletion-status-${user.entityId}`)
  revalidatePath('/', 'layout')

  return { success: true }
}

// ─── Cancel Account Deletion (Reactivation) ───────────────────────────────────

/**
 * Cancels a pending account deletion using the reactivation token.
 * This is called from the public reactivation page.
 */
export async function cancelAccountDeletion(token: string): Promise<{ success: true }> {
  if (!token) throw new Error('Reactivation token is required')

  const adminClient: any = createServerClient({ admin: true })

  // 1. Find the chef by reactivation token
  const { data: chef, error: findError } = await adminClient
    .from('chefs')
    .select('id, auth_user_id, email, business_name, deletion_scheduled_for')
    .eq('deletion_reactivation_token', token)
    .single()

  if (findError || !chef) {
    throw new Error('Invalid or expired reactivation token')
  }

  // 2. Verify still within grace period
  if (chef.deletion_scheduled_for && new Date(chef.deletion_scheduled_for) < new Date()) {
    throw new Error('The grace period has expired. Your account has already been deleted.')
  }

  // 3. Clear soft-delete columns
  const { error: updateError } = await adminClient
    .from('chefs')
    .update({
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_reason: null,
      deletion_reactivation_token: null,
    })
    .eq('id', chef.id)

  if (updateError) {
    throw new Error('Failed to reactivate account')
  }

  // 4. Unban the auth user
  if (chef.auth_user_id) {
    const { error: unbanError } = await adminClient.auth.admin.updateUserById(chef.auth_user_id, {
      ban_duration: 'none',
    })

    if (unbanError) {
      ;(log as any).error('[account-deletion] Failed to unban auth user during reactivation', {
        error: unbanError,
      })
    }
  }

  // 5. Log audit (non-blocking)
  try {
    await logDeletionAudit({
      chefId: chef.id,
      authUserId: chef.auth_user_id || '',
      email: chef.email || '',
      businessName: chef.business_name || '',
      action: 'deletion_cancelled',
      performedBy: 'chef',
    })
  } catch {
    // Non-blocking
  }

  // 6. Bust the deletion status cache
  revalidateTag(`deletion-status-${chef.id}`)

  return { success: true }
}

// ─── Cancel Deletion by Chef ID (Authenticated) ──────────────────────────────

/**
 * Cancels a pending account deletion for the given chef ID.
 * Called from the authenticated delete-account settings page.
 * Looks up the reactivation token internally.
 */
export async function cancelDeletionByChefId(chefId: string): Promise<{ success: true }> {
  const user = await requireChef()
  if (user.entityId !== chefId) throw new Error('Unauthorized')

  const adminClient: any = createServerClient({ admin: true })

  const { data: chef } = await adminClient
    .from('chefs')
    .select('deletion_reactivation_token')
    .eq('id', chefId)
    .single()

  if (!chef?.deletion_reactivation_token) {
    throw new Error('No pending deletion to cancel')
  }

  return cancelAccountDeletion(chef.deletion_reactivation_token)
}

// ─── Get Deletion Status ──────────────────────────────────────────────────────

export type DeletionStatus = {
  isPending: boolean
  requestedAt: string | null
  scheduledFor: string | null
  daysRemaining: number | null
  reason: string | null
}

/**
 * Returns the current deletion status for the authenticated chef.
 */
export async function getAccountDeletionStatus(): Promise<DeletionStatus> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: chef } = await db
    .from('chefs')
    .select('deletion_requested_at, deletion_scheduled_for, deletion_reason')
    .eq('id', user.entityId)
    .single()

  if (!chef?.deletion_requested_at) {
    return {
      isPending: false,
      requestedAt: null,
      scheduledFor: null,
      daysRemaining: null,
      reason: null,
    }
  }

  const scheduledDate = chef.deletion_scheduled_for ? new Date(chef.deletion_scheduled_for) : null
  const daysRemaining = scheduledDate
    ? Math.max(0, Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return {
    isPending: true,
    requestedAt: chef.deletion_requested_at,
    scheduledFor: chef.deletion_scheduled_for,
    daysRemaining,
    reason: chef.deletion_reason,
  }
}

// ─── Execute Final Purge ──────────────────────────────────────────────────────

/**
 * Executes the final account purge after the 30-day grace period.
 * Admin-only - called by the cron job, not by the user.
 *
 * Steps:
 * 1. Anonymize financial records (preserves amounts for 7-year retention)
 * 2. Clean up storage buckets
 * 3. Mark chef as deleted (is_deleted = true)
 * 4. Delete auth user (cascades non-financial data via DB constraints)
 */
export async function executeFinalPurge(chefId: string): Promise<{
  success: boolean
  error?: string
}> {
  // Tenant isolation: verify chefId matches session when called from user context
  const { getCurrentUser } = await import('@/lib/auth/get-user')
  const sessionUser = await getCurrentUser()
  if (sessionUser && chefId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  const adminClient: any = createServerClient({ admin: true })

  // 1. Verify the chef exists and grace period has passed
  const { data: chef, error: findError } = await adminClient
    .from('chefs')
    .select('id, auth_user_id, email, business_name, deletion_scheduled_for, is_deleted')
    .eq('id', chefId)
    .single()

  if (findError || !chef) {
    return { success: false, error: 'Chef not found' }
  }

  if (chef.is_deleted) {
    return { success: false, error: 'Account already purged' }
  }

  if (!chef.deletion_scheduled_for || new Date(chef.deletion_scheduled_for) > new Date()) {
    return { success: false, error: 'Grace period has not yet expired' }
  }

  const auditBase = {
    chefId: chef.id,
    authUserId: chef.auth_user_id || '',
    email: chef.email || '',
    businessName: chef.business_name || '',
  }

  try {
    // 2. Ban auth user immediately to prevent further access during purge
    if (chef.auth_user_id) {
      await adminClient.auth.admin.updateUserById(chef.auth_user_id, {
        ban_duration: '876000h',
      })
      await logDeletionAudit({ ...auditBase, action: 'grace_period_expired' })
    }

    // 3. Anonymize financial records via the DB function
    const { error: anonError } = await adminClient.rpc('anonymize_financial_records', {
      p_chef_id: chefId,
    })

    if (anonError) {
      ;(log as any).error('[purge] Financial anonymization failed', { error: anonError, chefId })
      return { success: false, error: `Financial anonymization failed: ${anonError.message}` }
    }

    await logDeletionAudit({ ...auditBase, action: 'financial_records_anonymized' })

    // 3. Clean up storage buckets
    const storageResult = await cleanupStorageBuckets(chefId)
    await logDeletionAudit({
      ...auditBase,
      action: 'storage_cleaned',
      metadata: storageResult,
    })

    // 4. Mark chef as deleted (keep the row for FK integrity with anonymized financials)
    await adminClient
      .from('chefs')
      .update({
        is_deleted: true,
        // Clear remaining PII from the chef row itself
        phone: null,
        bio: null,
        display_name: null,
        profile_image_url: null,
        google_review_url: null,
        business_name: `Deleted Account (${chefId.slice(0, 8)})`,
        email: `deleted-${chefId}@redacted.local`,
      })
      .eq('id', chefId)

    await logDeletionAudit({ ...auditBase, action: 'pii_purged' })

    // 4b. Clean up chef-to-chef collaboration records (chef_id FK, not cascaded by auth deletion)
    try {
      const collabTables = [
        { table: 'chef_connections', col: 'requester_id' },
        { table: 'chef_connections', col: 'addressee_id' },
        { table: 'event_collaborators', col: 'chef_id' },
        { table: 'event_collaborators', col: 'invited_by_chef_id' },
        { table: 'chef_trusted_circle', col: 'chef_id' },
        { table: 'chef_trusted_circle', col: 'trusted_chef_id' },
        { table: 'chef_collab_spaces', col: 'created_by' },
        { table: 'chef_collab_space_members', col: 'chef_id' },
        { table: 'chef_collab_handoffs', col: 'sender_chef_id' },
        { table: 'chef_collab_handoffs', col: 'recipient_chef_id' },
        { table: 'chef_social_notifications', col: 'actor_chef_id' },
        { table: 'chef_social_notifications', col: 'recipient_chef_id' },
        { table: 'chef_social_follows', col: 'follower_chef_id' },
        { table: 'chef_social_follows', col: 'followed_chef_id' },
        { table: 'chef_intro_bridges', col: 'source_chef_id' },
        { table: 'chef_intro_bridges', col: 'target_chef_id' },
        { table: 'chef_network_contact_shares', col: 'sender_chef_id' },
        { table: 'chef_network_contact_shares', col: 'recipient_chef_id' },
        { table: 'chef_availability_signals', col: 'chef_id' },
        { table: 'chef_opportunity_interests', col: 'chef_id' },
      ]
      for (const { table, col } of collabTables) {
        try {
          await adminClient.from(table).delete().eq(col, chefId)
        } catch {
          // Table may not exist yet; non-blocking
        }
      }
      await logDeletionAudit({ ...auditBase, action: 'collaboration_records_cleaned' })
    } catch (err) {
      console.error('[purge] Collaboration cleanup failed (non-blocking)', err)
    }

    // 4b. Clean up hub memberships and archive orphaned community circles (non-blocking)
    try {
      if (chef.auth_user_id) {
        const { data: hubProfile } = await adminClient
          .from('hub_guest_profiles')
          .select('id')
          .eq('auth_user_id', chef.auth_user_id)
          .maybeSingle()

        if (hubProfile) {
          // Archive community circles this user owns (tenant_id=null, no other owner)
          const { data: ownedCircles } = await adminClient
            .from('hub_group_members')
            .select('group_id')
            .eq('profile_id', hubProfile.id)
            .eq('role', 'owner')

          for (const membership of ownedCircles ?? []) {
            // Check if community circle with no other owners
            const { data: group } = await adminClient
              .from('hub_groups')
              .select('id, tenant_id')
              .eq('id', membership.group_id)
              .is('tenant_id', null)
              .eq('is_active', true)
              .maybeSingle()

            if (group) {
              const { count } = await adminClient
                .from('hub_group_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', group.id)
                .in('role', ['owner', 'admin'])
                .neq('profile_id', hubProfile.id)

              if (!count || count === 0) {
                await adminClient
                  .from('hub_groups')
                  .update({ is_active: false, updated_at: new Date().toISOString() })
                  .eq('id', group.id)
              }
            }
          }

          // Remove all hub memberships
          await adminClient.from('hub_group_members').delete().eq('profile_id', hubProfile.id)

          // Anonymize hub profile
          await adminClient
            .from('hub_guest_profiles')
            .update({
              display_name: 'Deleted User',
              email: null,
              avatar_url: null,
            })
            .eq('id', hubProfile.id)
        }
      }
      await logDeletionAudit({ ...auditBase, action: 'hub_memberships_cleaned' })
    } catch (err) {
      console.error('[purge] Hub membership cleanup failed (non-blocking)', err)
    }

    // 4c. Purge all AI/Remy data (non-blocking - 16 tables)
    try {
      const aiTables = [
        { table: 'remy_support_shares', col: 'tenant_id' },
        { table: 'remy_feedback', col: 'tenant_id' },
        { table: 'remy_action_audit_log', col: 'tenant_id' },
        { table: 'remy_approval_policies', col: 'tenant_id' },
        { table: 'remy_alerts', col: 'tenant_id' },
        { table: 'remy_abuse_log', col: 'tenant_id' },
        { table: 'ai_task_queue', col: 'tenant_id' },
        { table: 'remy_usage_metrics', col: 'tenant_id' },
        { table: 'remy_artifacts', col: 'tenant_id' },
        { table: 'remy_memories', col: 'tenant_id' },
        // Messages cascade from conversations
        { table: 'remy_conversations', col: 'tenant_id' },
        { table: 'ai_preferences', col: 'tenant_id' },
        { table: 'remy_onboarding', col: 'chef_id' },
        { table: 'remy_milestones', col: 'chef_id' },
        { table: 'chef_culinary_profiles', col: 'chef_id' },
      ]
      for (const { table, col } of aiTables) {
        try {
          await adminClient.from(table).delete().eq(col, chefId)
        } catch {
          // Table may not exist yet; non-blocking
        }
      }
      await logDeletionAudit({ ...auditBase, action: 'ai_data_purged' })
    } catch (err) {
      console.error('[purge] AI data cleanup failed (non-blocking)', err)
    }

    // 5. Delete auth user (triggers CASCADE on non-financial tables)
    if (chef.auth_user_id) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(chef.auth_user_id)
      if (deleteError) {
        ;(log as any).error('[purge] Auth user deletion failed', { error: deleteError, chefId })
        // This is non-fatal - the account is already anonymized and marked deleted
      } else {
        await logDeletionAudit({ ...auditBase, action: 'auth_user_deleted' })
      }
    }

    // 6. Delete user_roles entry
    if (chef.auth_user_id) {
      await adminClient.from('user_roles').delete().eq('auth_user_id', chef.auth_user_id)
    }

    await logDeletionAudit({ ...auditBase, action: 'purge_completed' })
    ;(log as any).info('[purge] Account purge completed', { chefId })
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    ;(log as any).error('[purge] Account purge failed', { error: err, chefId })
    return { success: false, error: msg }
  }
}
