// Focus Mode — Server Actions
// Separated from focus-mode.ts because 'use server' files cannot export non-async values.

'use server'

import { revalidateTag } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { CHEF_LAYOUT_CACHE_TAG } from '@/lib/chef/layout-cache'
import { ALL_MODULE_SLUGS } from '@/lib/billing/modules'
import { CORE_MODULES } from '@/lib/billing/focus-mode'

/**
 * Check if Focus Mode is enabled for the current chef.
 * Defaults to true (ON) for new users — clean sidebar out of the box.
 */
export async function isFocusModeEnabled(): Promise<boolean> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_preferences')
    .select('focus_mode')
    .eq('chef_id', user.entityId)
    .single()

  // Default to ON for new users (guided experience)
  return (data as any)?.focus_mode ?? true
}

/**
 * Toggle Focus Mode and update enabled modules accordingly.
 * ON: enables only core modules
 * OFF: enables all modules
 */
export async function toggleFocusMode(enabled: boolean): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const modules = enabled ? [...CORE_MODULES] : [...ALL_MODULE_SLUGS]

  await supabase
    .from('chef_preferences')
    .update({
      focus_mode: enabled,
      enabled_modules: modules,
    } as any)
    .eq('chef_id', user.entityId)

  revalidateTag(`${CHEF_LAYOUT_CACHE_TAG}-${user.entityId}`)
}
