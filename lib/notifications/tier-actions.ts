'use server'
// Notification Tier Override Actions
// Per-chef customization of the action-to-tier mapping.
// Overrides are stored in chef_notification_tier_overrides and applied
// on top of DEFAULT_TIER_MAP at notification send time.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_TIER_MAP, type NotificationTier } from './tier-config'
import { NOTIFICATION_CONFIG, type NotificationAction, type NotificationCategory } from './types'

export type TierMapEntry = {
  action: NotificationAction
  category: NotificationCategory
  currentTier: NotificationTier
  defaultTier: NotificationTier
  isOverridden: boolean
}

/**
 * Returns the full action-to-tier map with chef overrides applied on top
 * of system defaults. Each entry shows the effective tier, the default,
 * and whether it has been overridden.
 */
export async function getNotificationTierMap(): Promise<TierMapEntry[]> {
  const user = await requireChef()
  if (!user.tenantId) return buildDefaultEntries()

  const db: any = createServerClient()

  const { data: overrides, error } = await db
    .from('chef_notification_tier_overrides' as any)
    .select('action, tier')
    .eq('chef_id', user.tenantId)

  if (error) {
    console.error('[getNotificationTierMap] Query failed:', error)
    return buildDefaultEntries()
  }

  const overrideMap = new Map<string, NotificationTier>()
  for (const row of overrides ?? []) {
    overrideMap.set(row.action, row.tier as NotificationTier)
  }

  const entries: TierMapEntry[] = []
  for (const [action, defaultTier] of Object.entries(DEFAULT_TIER_MAP) as [
    NotificationAction,
    NotificationTier,
  ][]) {
    const override = overrideMap.get(action)
    entries.push({
      action,
      category: NOTIFICATION_CONFIG[action].category,
      currentTier: override ?? defaultTier,
      defaultTier,
      isOverridden: override !== undefined && override !== defaultTier,
    })
  }

  return entries
}

/**
 * Upsert a tier override for a single notification action.
 * If the new tier matches the system default, the override is removed instead.
 */
export async function updateNotificationTier(
  action: string,
  tier: 'critical' | 'alert' | 'info'
): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }

  // Validate action exists in the system
  if (!(action in DEFAULT_TIER_MAP)) {
    return { error: `Unknown notification action: ${action}` }
  }

  const validTiers = ['critical', 'alert', 'info']
  if (!validTiers.includes(tier)) {
    return { error: `Invalid tier: ${tier}` }
  }

  const defaultTier = DEFAULT_TIER_MAP[action as NotificationAction]

  // If setting to the default, just remove the override
  if (tier === defaultTier) {
    return resetNotificationTier(action)
  }

  const db: any = createServerClient()

  const { error } = await db.from('chef_notification_tier_overrides' as any).upsert(
    {
      chef_id: user.tenantId,
      action,
      tier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id,action' }
  )

  if (error) {
    console.error('[updateNotificationTier] Upsert failed:', error)
    return { error: error.message }
  }

  revalidatePath('/settings/notifications')
  return { error: null }
}

/**
 * Delete a single tier override, reverting to the system default.
 */
export async function resetNotificationTier(action: string): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }

  const db: any = createServerClient()

  const { error } = await db
    .from('chef_notification_tier_overrides' as any)
    .delete()
    .eq('chef_id', user.tenantId)
    .eq('action', action)

  if (error) {
    console.error('[resetNotificationTier] Delete failed:', error)
    return { error: error.message }
  }

  revalidatePath('/settings/notifications')
  return { error: null }
}

/**
 * Delete all tier overrides for the chef, reverting everything to system defaults.
 */
export async function resetAllNotificationTiers(): Promise<{ error: string | null }> {
  const user = await requireChef()
  if (!user.tenantId) return { error: 'No tenant context' }

  const db: any = createServerClient()

  const { error } = await db
    .from('chef_notification_tier_overrides' as any)
    .delete()
    .eq('chef_id', user.tenantId)

  if (error) {
    console.error('[resetAllNotificationTiers] Delete failed:', error)
    return { error: error.message }
  }

  revalidatePath('/settings/notifications')
  return { error: null }
}

// ── Internal helpers ──────────────────────────────────────────────────────

function buildDefaultEntries(): TierMapEntry[] {
  return (Object.entries(DEFAULT_TIER_MAP) as [NotificationAction, NotificationTier][]).map(
    ([action, defaultTier]) => ({
      action,
      category: NOTIFICATION_CONFIG[action].category,
      currentTier: defaultTier,
      defaultTier,
      isOverridden: false,
    })
  )
}
