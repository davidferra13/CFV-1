'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getArchetype, ARCHETYPE_IDS } from './presets'
import type { ArchetypeId } from './presets'

function fromChefPreferences(supabase: ReturnType<typeof createServerClient>): any {
  return (supabase as any).from('chef_preferences')
}

/**
 * Select an archetype and apply its nav/module presets.
 * Called during onboarding and from Settings.
 */
export async function selectArchetype(archetypeId: ArchetypeId) {
  if (!ARCHETYPE_IDS.includes(archetypeId)) {
    throw new Error(`Invalid archetype: ${archetypeId}`)
  }

  const archetype = getArchetype(archetypeId)
  if (!archetype) throw new Error(`Archetype not found: ${archetypeId}`)

  const user = await requireChef()
  const supabase = createServerClient()

  const payload = {
    archetype: archetypeId,
    enabled_modules: archetype.enabledModules,
    primary_nav_hrefs: archetype.primaryNavHrefs,
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
      console.error('[selectArchetype] Update error:', error)
      throw new Error('Failed to apply archetype')
    }
  } else {
    const { error } = await fromChefPreferences(supabase).insert({
      chef_id: user.entityId,
      tenant_id: user.tenantId!,
      ...payload,
    })

    if (error) {
      console.error('[selectArchetype] Insert error:', error)
      throw new Error('Failed to apply archetype')
    }
  }

  revalidatePath('/', 'layout')
  revalidateTag(`chef-layout-${user.entityId}`)
  return { success: true, archetype: archetypeId }
}

/**
 * Get the chef's current archetype (null if not yet selected).
 */
export async function getChefArchetype(): Promise<ArchetypeId | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await fromChefPreferences(supabase)
    .select('archetype')
    .eq('chef_id', user.entityId)
    .single()

  const archetype = (data as any)?.archetype
  if (archetype && ARCHETYPE_IDS.includes(archetype)) {
    return archetype as ArchetypeId
  }
  return null
}

/**
 * Save the chef's current nav layout as their personal custom default.
 * They can restore this anytime from Settings.
 */
export async function saveCustomNavDefault() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Read current nav hrefs and modules
  const { data: prefs } = await fromChefPreferences(supabase)
    .select('primary_nav_hrefs, enabled_modules')
    .eq('chef_id', user.entityId)
    .single()

  if (!prefs) throw new Error('No preferences found')

  const { error } = await fromChefPreferences(supabase)
    .update({
      saved_custom_nav_hrefs: {
        primary_nav_hrefs: (prefs as any).primary_nav_hrefs ?? [],
        enabled_modules: (prefs as any).enabled_modules ?? [],
      },
    })
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[saveCustomNavDefault] Error:', error)
    throw new Error('Failed to save custom default')
  }

  revalidatePath('/settings/navigation')
  return { success: true }
}

/**
 * Restore the chef's saved custom nav default.
 */
export async function restoreCustomNavDefault() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: prefs } = await fromChefPreferences(supabase)
    .select('saved_custom_nav_hrefs')
    .eq('chef_id', user.entityId)
    .single()

  const saved = (prefs as any)?.saved_custom_nav_hrefs
  if (!saved || typeof saved !== 'object') {
    throw new Error('No saved custom default found')
  }

  const { error } = await fromChefPreferences(supabase)
    .update({
      primary_nav_hrefs: saved.primary_nav_hrefs ?? [],
      enabled_modules: saved.enabled_modules ?? [],
    })
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[restoreCustomNavDefault] Error:', error)
    throw new Error('Failed to restore custom default')
  }

  revalidatePath('/', 'layout')
  revalidateTag(`chef-layout-${user.entityId}`)
  return { success: true }
}

/**
 * Check if the chef has a saved custom nav default.
 */
export async function hasCustomNavDefault(): Promise<boolean> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await fromChefPreferences(supabase)
    .select('saved_custom_nav_hrefs')
    .eq('chef_id', user.entityId)
    .single()

  const saved = (data as any)?.saved_custom_nav_hrefs
  return saved != null && typeof saved === 'object'
}
