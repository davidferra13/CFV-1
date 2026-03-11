'use server'

// Dashboard Actions - Server actions for archetype-specific dashboard widgets.
// Reads the chef's archetype and returns their widget configuration.
// Supports saving custom widget order/selection to chef_preferences.

import { requireChef } from '@/lib/auth/get-user'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { getDashboardConfig, getAvailableWidgets } from './dashboard-config'
import type { DashboardWidget } from './dashboard-config'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_ARCHETYPE_ID, getArchetypeRegistryEntry } from './registry'

/**
 * Returns the dashboard widget configuration based on the chef's archetype.
 * Falls back to private-chef defaults if no archetype is set.
 */
export async function getDashboardWidgets(): Promise<{
  widgets: DashboardWidget[]
  archetypeKey: string
  archetypeLabel: string
}> {
  const user = await requireChef()
  const archetype = await getCachedChefArchetype(user.entityId)
  const key = archetype ?? DEFAULT_ARCHETYPE_ID

  const widgets = getDashboardConfig(key)
  const archetypeLabel = getArchetypeRegistryEntry(key)?.dashboardLabel ?? 'Chef'

  return {
    widgets,
    archetypeKey: key,
    archetypeLabel,
  }
}

/**
 * Returns all widgets available for the chef's archetype (for a widget picker UI).
 */
export async function getAvailableDashboardWidgets(): Promise<DashboardWidget[]> {
  const user = await requireChef()
  const archetype = await getCachedChefArchetype(user.entityId)
  const key = archetype ?? DEFAULT_ARCHETYPE_ID
  return getAvailableWidgets(key)
}

/**
 * Saves a custom widget order/selection to the chef's preferences.
 * The widget keys are stored as a JSONB array in chef_preferences.dashboard_widgets.
 */
export async function saveDashboardLayout(
  widgetKeys: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  if (!Array.isArray(widgetKeys) || widgetKeys.length === 0) {
    return { success: false, error: 'Widget list cannot be empty' }
  }

  // Validate all keys exist in the registry
  const archetype = await getCachedChefArchetype(user.entityId)
  const available = getAvailableWidgets(archetype ?? DEFAULT_ARCHETYPE_ID)
  const availableKeys = new Set(available.map((w) => w.key))

  const invalid = widgetKeys.filter((k) => !availableKeys.has(k))
  if (invalid.length > 0) {
    return { success: false, error: `Unknown widget keys: ${invalid.join(', ')}` }
  }

  try {
    const supabase = await createClient()

    // Build the JSONB array format expected by the existing column
    const dashboardWidgets = widgetKeys.map((key) => ({
      id: key,
      enabled: true,
    }))

    const { error } = await supabase
      .from('chef_preferences')
      .update({ dashboard_widgets: dashboardWidgets } as any)
      .eq('chef_id', user.entityId)

    if (error) {
      console.error('[dashboard-actions] Failed to save layout:', error)
      return { success: false, error: 'Failed to save dashboard layout' }
    }

    return { success: true }
  } catch (err) {
    console.error('[dashboard-actions] Unexpected error saving layout:', err)
    return { success: false, error: 'Unexpected error saving dashboard layout' }
  }
}
