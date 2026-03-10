'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ARCHETYPES, type ArchetypeId, type ArchetypeDefinition } from './presets'
import { ALL_MODULE_SLUGS } from '@/lib/billing/modules'
import { DASHBOARD_WIDGET_IDS } from '@/lib/scheduling/types'

// ============================================
// TYPES
// ============================================

export type CustomArchetypeConfig = {
  name: string
  enabledModules: string[]
  primaryNavHrefs: string[]
  mobileTabHrefs: string[]
  dashboardWidgets: string[]
}

// ============================================
// HELPERS
// ============================================

function fromChefPreferences(supabase: any): any {
  return (supabase as any).from('chef_preferences')
}

function validateConfig(config: CustomArchetypeConfig): void {
  if (!config.name || config.name.trim().length === 0) {
    throw new Error('Custom archetype name is required')
  }
  if (config.name.trim().length > 100) {
    throw new Error('Name must be 100 characters or fewer')
  }
  if (!Array.isArray(config.enabledModules) || config.enabledModules.length === 0) {
    throw new Error('At least one module must be enabled')
  }
  // Validate module slugs
  const validModules = new Set(ALL_MODULE_SLUGS)
  for (const slug of config.enabledModules) {
    if (!validModules.has(slug)) {
      throw new Error(`Invalid module: ${slug}`)
    }
  }
  if (config.mobileTabHrefs.length > 5) {
    throw new Error('Mobile tab bar can have at most 5 items')
  }
  if (config.primaryNavHrefs.length > 20) {
    throw new Error('Primary navigation can have at most 20 items')
  }
  // Validate widget IDs
  const validWidgets = new Set(DASHBOARD_WIDGET_IDS as readonly string[])
  for (const id of config.dashboardWidgets) {
    if (!validWidgets.has(id)) {
      throw new Error(`Invalid widget: ${id}`)
    }
  }
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Save a custom archetype configuration to chef_preferences.
 * Stores the full config as JSON in custom_archetype_config,
 * and applies modules, nav, and widgets to the live columns.
 */
export async function saveCustomArchetype(config: CustomArchetypeConfig) {
  validateConfig(config)

  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const payload = {
    archetype: 'custom',
    enabled_modules: config.enabledModules,
    primary_nav_hrefs: config.primaryNavHrefs,
    custom_archetype_config: {
      name: config.name.trim(),
      enabledModules: config.enabledModules,
      primaryNavHrefs: config.primaryNavHrefs,
      mobileTabHrefs: config.mobileTabHrefs,
      dashboardWidgets: config.dashboardWidgets,
    },
  }

  // Upsert into chef_preferences
  const { data: existing } = await fromChefPreferences(supabase)
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromChefPreferences(supabase)
      .update(payload)
      .eq('chef_id', user.entityId)

    if (error) {
      console.error('[saveCustomArchetype] Update error:', error)
      throw new Error('Failed to save custom archetype')
    }
  } else {
    const { error } = await fromChefPreferences(supabase).insert({
      chef_id: user.entityId,
      tenant_id: tenantId,
      ...payload,
    })

    if (error) {
      console.error('[saveCustomArchetype] Insert error:', error)
      throw new Error('Failed to save custom archetype')
    }
  }

  revalidatePath('/settings/archetype-builder')
  revalidatePath('/dashboard')
  revalidateTag(`chef-layout-${user.entityId}`)

  return { success: true }
}

/**
 * Read the saved custom archetype config (if any).
 */
export async function getCustomArchetype(): Promise<CustomArchetypeConfig | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await fromChefPreferences(supabase)
    .select('archetype, custom_archetype_config, enabled_modules, primary_nav_hrefs')
    .eq('chef_id', user.entityId)
    .single()

  if (error || !data) return null

  // If they have a saved custom config, return it
  const raw = data.custom_archetype_config
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const cfg = raw as Record<string, unknown>
    return {
      name: (cfg.name as string) || 'My Custom Setup',
      enabledModules: Array.isArray(cfg.enabledModules) ? (cfg.enabledModules as string[]) : [],
      primaryNavHrefs: Array.isArray(cfg.primaryNavHrefs) ? (cfg.primaryNavHrefs as string[]) : [],
      mobileTabHrefs: Array.isArray(cfg.mobileTabHrefs) ? (cfg.mobileTabHrefs as string[]) : [],
      dashboardWidgets: Array.isArray(cfg.dashboardWidgets)
        ? (cfg.dashboardWidgets as string[])
        : [],
    }
  }

  // Fall back to current live config if no custom config saved
  if (data.archetype && data.archetype !== 'custom') {
    return null // using a standard preset
  }

  return null
}

/**
 * Reset the chef back to a standard preset archetype.
 * Clears the custom config and applies the preset's defaults.
 */
export async function resetToPreset(archetypeKey: string) {
  const preset = ARCHETYPES.find((a) => a.id === archetypeKey) as ArchetypeDefinition | undefined
  if (!preset) {
    throw new Error(`Invalid archetype key: ${archetypeKey}`)
  }

  const user = await requireChef()
  const supabase: any = createServerClient()

  const payload = {
    archetype: preset.id,
    enabled_modules: preset.enabledModules,
    primary_nav_hrefs: preset.primaryNavHrefs,
    custom_archetype_config: null,
  }

  const { error } = await fromChefPreferences(supabase).update(payload).eq('chef_id', user.entityId)

  if (error) {
    console.error('[resetToPreset] Error:', error)
    throw new Error('Failed to reset to preset')
  }

  revalidatePath('/settings/archetype-builder')
  revalidatePath('/dashboard')
  revalidateTag(`chef-layout-${user.entityId}`)

  return { success: true }
}

/**
 * Export the current archetype config as a JSON object (for sharing or backup).
 */
export async function exportArchetypeConfig(): Promise<string> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await fromChefPreferences(supabase)
    .select(
      'archetype, custom_archetype_config, enabled_modules, primary_nav_hrefs, dashboard_widgets'
    )
    .eq('chef_id', user.entityId)
    .single()

  if (error || !data) {
    throw new Error('No archetype configuration found')
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    archetype: data.archetype,
    customConfig: data.custom_archetype_config || null,
    enabledModules: data.enabled_modules || [],
    primaryNavHrefs: data.primary_nav_hrefs || [],
    dashboardWidgets: data.dashboard_widgets || [],
  }

  return JSON.stringify(exportData, null, 2)
}
