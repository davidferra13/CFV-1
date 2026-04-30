// Layout Data Cache - wraps uncached layout DB calls in unstable_cache
// These functions are called on every page navigation from (chef)/layout.tsx.
// Without caching, they add 3-4 unnecessary DB round-trips per page load.
//
// Uses the admin client because unstable_cache runs outside the request context
// and cannot access per-request cookies.
//
// Cache tag -> revalidation map (verified 2026-04-03):
//   cannabis-access-{authUserId} -> lib/cannabis/invitation-actions.ts:claimCannabisInvite(), lib/admin/cannabis-actions.ts
//   chef-archetype-{chefId}      -> lib/archetypes/actions.ts:selectArchetype()
//   deletion-status-{chefId}     -> lib/compliance/account-deletion-actions.ts
//   is-admin-{authUserId}        -> no server action; TTL-only (manual DB changes)
//   chef-layout-{chefId}         -> lib/archetypes/actions.ts, lib/profile/actions.ts

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/db/admin'
import {
  hasAdminAccess,
  hasPersistedAdminAccessForAuthUser,
  hasPrivilegedAccess,
} from '@/lib/auth/admin-access'
import { resolveFounderAuthorityForAuthUser } from '@/lib/platform/owner-account'
import { ARCHETYPE_IDS } from '@/lib/archetypes/presets'
import type { ArchetypeId } from '@/lib/archetypes/presets'

// ─── Cannabis Access (cached 60s) ────────────────────────────────────────────

export function getCachedCannabisAccess(authUserId: string): Promise<boolean> {
  return unstable_cache(
    async (): Promise<boolean> => {
      const db: any = createAdminClient()
      if (await hasPersistedAdminAccessForAuthUser(authUserId)) return true

      const { data, error } = await db
        .from('cannabis_tier_users')
        .select('status')
        .eq('auth_user_id', authUserId)
        .single()

      if (error || !data) return false
      return data.status === 'active'
    },
    [`cannabis-access-${authUserId}`],
    { revalidate: 60, tags: [`cannabis-access-${authUserId}`] }
  )()
}

// ─── Chef Archetype (cached 60s) ─────────────────────────────────────────────

export function getCachedChefArchetype(chefId: string): Promise<ArchetypeId | null> {
  return unstable_cache(
    async (): Promise<ArchetypeId | null> => {
      const db: any = createAdminClient()
      const { data } = await db
        .from('chef_preferences')
        .select('archetype')
        .eq('chef_id', chefId)
        .single()

      const archetype = (data as any)?.archetype
      if (archetype && ARCHETYPE_IDS.includes(archetype)) {
        return archetype as ArchetypeId
      }
      return null
    },
    [`chef-archetype-${chefId}`],
    { revalidate: 60, tags: [`chef-archetype-${chefId}`] }
  )()
}

// ─── Account Deletion Status (cached 60s) ────────────────────────────────────

export type CachedDeletionStatus = {
  isPending: boolean
  requestedAt: string | null
  scheduledFor: string | null
  daysRemaining: number | null
  reason: string | null
}

export function getCachedDeletionStatus(chefId: string): Promise<CachedDeletionStatus> {
  return unstable_cache(
    async (): Promise<CachedDeletionStatus> => {
      const db: any = createAdminClient()
      const { data: chef } = await db
        .from('chefs')
        .select('deletion_requested_at, deletion_scheduled_for, deletion_reason')
        .eq('id', chefId)
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

      const scheduledDate = chef.deletion_scheduled_for
        ? new Date(chef.deletion_scheduled_for)
        : null
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
    },
    [`deletion-status-${chefId}`],
    { revalidate: 60, tags: [`deletion-status-${chefId}`] }
  )()
}

// ─── Admin Check (cached 60s) ────────────────────────────────────────────
// Note: admin status is managed directly in the platform_admins table (no server action).
// The 60s TTL is the only revalidation path, which is acceptable for rare manual changes.
// isAdmin = admin + owner only (admin panel access). VIP excluded.

export function getCachedIsAdmin(authUserId: string): Promise<boolean> {
  return unstable_cache(
    async (): Promise<boolean> => {
      const db: any = createAdminClient()
      if (await resolveFounderAuthorityForAuthUser(db, authUserId)) return true
      return hasAdminAccess(authUserId)
    },
    [`is-admin-${authUserId}`],
    { revalidate: 60, tags: [`is-admin-${authUserId}`] }
  )()
}

// ─── Privileged Check (cached 60s) ──────────────────────────────────────
// isPrivileged = vip + admin + owner (focus mode bypass, all modules visible).
// Separate from admin check because VIP gets feature access but NOT admin panel.

export function getCachedIsPrivileged(authUserId: string): Promise<boolean> {
  return unstable_cache(
    async (): Promise<boolean> => {
      const db: any = createAdminClient()
      if (await resolveFounderAuthorityForAuthUser(db, authUserId)) return true
      return hasPrivilegedAccess(authUserId)
    },
    [`is-privileged-${authUserId}`],
    { revalidate: 60, tags: [`is-privileged-${authUserId}`] }
  )()
}
