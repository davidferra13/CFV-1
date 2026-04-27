'use server'

// Module Toggle Actions
// Manages which feature modules a chef has enabled (progressive disclosure).
// Independent of tier - controls what the chef SEES, not what they CAN access.

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidateTag } from 'next/cache'
import { CHEF_LAYOUT_CACHE_TAG } from '@/lib/chef/layout-cache'
import { ALL_MODULE_SLUGS, DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'

/**
 * Get the chef's currently enabled modules.
 * Falls back to default modules if no preference is set.
 */
export async function getEnabledModules(): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_preferences')
    .select('enabled_modules')
    .eq('chef_id', user.entityId)
    .single()

  const modules = (data as any)?.enabled_modules
  if (Array.isArray(modules) && modules.length > 0) return modules
  return DEFAULT_ENABLED_MODULES
}

/**
 * Update the chef's enabled modules.
 * Accepts the full list of module slugs to enable.
 * Validates that all slugs are known module slugs.
 */
export async function updateEnabledModules(modules: string[]): Promise<void> {
  const user = await requireChef()

  // Validate: only allow known module slugs
  const validSlugs = new Set(ALL_MODULE_SLUGS)
  const filtered = modules.filter((slug) => validSlugs.has(slug))

  // Always include 'dashboard' - it cannot be toggled off
  if (!filtered.includes('dashboard')) {
    filtered.unshift('dashboard')
  }

  const db: any = createServerClient()
  const { error } = await db
    .from('chef_preferences')
    .update({ enabled_modules: filtered } as any)
    .eq('chef_id', user.entityId)

  if (error) {
    throw new Error('Failed to update modules')
  }

  // Bust the layout cache so the sidebar updates immediately
  revalidateTag(`${CHEF_LAYOUT_CACHE_TAG}-${user.entityId}`)
  try {
    broadcastTenantMutation(user.entityId, {
      entity: 'chef_preferences',
      action: 'update',
      reason: 'Enabled modules updated',
    })
  } catch {}
}

/**
 * Toggle a single module on or off.
 * Convenience wrapper around updateEnabledModules.
 */
export async function toggleModule(slug: string, enabled: boolean): Promise<void> {
  const current = await getEnabledModules()

  let updated: string[]
  if (enabled) {
    updated = current.includes(slug) ? current : [...current, slug]
  } else {
    updated = current.filter((s) => s !== slug)
  }

  await updateEnabledModules(updated)
}

/**
 * Enable all modules at once ("Select All").
 */
export async function enableAllModules(): Promise<void> {
  await updateEnabledModules([...ALL_MODULE_SLUGS])
}
