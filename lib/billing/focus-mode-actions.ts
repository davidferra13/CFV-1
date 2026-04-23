// Focus Mode - Server Actions
// Separated from focus-mode.ts because 'use server' files cannot export non-async values.

'use server'

import { revalidateTag } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { CHEF_LAYOUT_CACHE_TAG } from '@/lib/chef/layout-cache'
import { ALL_MODULE_SLUGS } from '@/lib/billing/modules'
import { CORE_MODULES, DEFAULT_FOCUS_MODE_ENABLED } from '@/lib/billing/focus-mode'

/**
 * Check if Focus Mode is enabled for the current chef.
 * Defaults to the shared governance default for new chefs.
 */
export async function isFocusModeEnabled(): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_preferences')
    .select('focus_mode')
    .eq('chef_id', user.entityId)
    .single()

  return (data as any)?.focus_mode ?? DEFAULT_FOCUS_MODE_ENABLED
}

/**
 * Toggle Focus Mode and update enabled modules accordingly.
 * ON: enables only core modules
 * OFF: enables all modules
 */
export async function toggleFocusMode(enabled: boolean): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const modules = enabled ? [...CORE_MODULES] : [...ALL_MODULE_SLUGS]

  const { error } = await db
    .from('chef_preferences')
    .update({
      focus_mode: enabled,
      enabled_modules: modules,
    } as any)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[toggleFocusMode] DB error:', error)
    throw new Error('Failed to update focus mode')
  }

  revalidateTag(`${CHEF_LAYOUT_CACHE_TAG}-${user.entityId}`)
}
