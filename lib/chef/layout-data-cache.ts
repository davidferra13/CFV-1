// Layout Data Cache — wraps uncached layout DB calls in unstable_cache
// These functions are called on every page navigation from (chef)/layout.tsx.
// Without caching, they add 3-4 unnecessary DB round-trips per page load.
//
// Uses the admin client because unstable_cache runs outside the request context
// and cannot access per-request cookies.

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { ARCHETYPE_IDS } from '@/lib/archetypes/presets'
import type { ArchetypeId } from '@/lib/archetypes/presets'
import { getAdminEmails } from '@/lib/platform/owner-account'

const ADMIN_EMAILS = getAdminEmails()

// ─── Cannabis Access (cached 60s) ────────────────────────────────────────────

export function getCachedCannabisAccess(authUserId: string, userEmail: string): Promise<boolean> {
  const normalizedEmail = userEmail.trim().toLowerCase()
  return unstable_cache(
    async (): Promise<boolean> => {
      // Admins always have cannabis access
      if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(normalizedEmail)) return true

      const supabase: any = createAdminClient()
      const { data, error } = await supabase
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
      const supabase: any = createAdminClient()
      const { data } = await supabase
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
      const supabase: any = createAdminClient()
      const { data: chef } = await supabase
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

// ─── Admin Check (cached 60s) ────────────────────────────────────────────────

export function getCachedIsAdmin(userEmail: string): Promise<boolean> {
  const normalizedEmail = userEmail.trim().toLowerCase()
  return unstable_cache(
    async (): Promise<boolean> => {
      return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(normalizedEmail)
    },
    [`is-admin-${normalizedEmail}`],
    { revalidate: 60, tags: [`is-admin-${normalizedEmail}`] }
  )()
}
