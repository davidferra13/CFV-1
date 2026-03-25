'use server'

// Admin Feature Flag Actions - toggle per-chef flags
// Writes to chef_feature_flags table via service role.
// All mutations are audit-logged.

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logAdminAction } from './audit'

/**
 * Toggle a single feature flag for one chef.
 * Creates the row if it doesn't exist; updates it if it does.
 */
export async function toggleChefFlag(
  chefId: string,
  flagName: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const { error } = await db
    .from('chef_feature_flags')
    .upsert(
      { chef_id: chefId, flag_name: flagName, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'chef_id,flag_name' }
    )

  if (error) {
    console.error('[Admin] toggleChefFlag error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'admin_toggled_flag',
    targetId: chefId,
    targetType: 'chef',
    details: { flag_name: flagName, enabled },
  })

  return { success: true }
}

/**
 * Set all flags for one chef in a single bulk operation.
 * Useful for a "copy flags from another chef" or "apply preset" feature later.
 */
export async function setBulkChefFlags(
  chefId: string,
  flags: Record<string, boolean>
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const db: any = createAdminClient()

  const rows = Object.entries(flags).map(([flag_name, enabled]) => ({
    chef_id: chefId,
    flag_name,
    enabled,
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) return { success: true }

  const { error } = await db
    .from('chef_feature_flags')
    .upsert(rows, { onConflict: 'chef_id,flag_name' })

  if (error) {
    console.error('[Admin] setBulkChefFlags error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'admin_bulk_flag',
    targetId: chefId,
    targetType: 'chef',
    details: { flags },
  })

  return { success: true }
}
