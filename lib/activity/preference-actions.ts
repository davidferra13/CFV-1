'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Read the chef's activity_log_enabled preference.
 * Defaults to true if no row exists or column is null.
 */
export async function getActivityLogEnabled(): Promise<boolean> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chef_preferences')
    .select('activity_log_enabled')
    .eq('tenant_id', user.tenantId!)
    .single()

  return (data as Record<string, unknown> | null)?.activity_log_enabled !== false
}

/**
 * Toggle activity logging on or off for the current chef.
 * Existing log entries are always preserved regardless.
 */
export async function setActivityLogEnabled(enabled: boolean): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chef_preferences')
    .update({ activity_log_enabled: enabled } as Record<string, unknown>)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setActivityLogEnabled] Update failed:', error)
    throw new Error('Failed to update activity log preference')
  }

  revalidatePath('/activity')
  return { success: true }
}
