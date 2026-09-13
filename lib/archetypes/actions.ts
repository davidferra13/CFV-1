'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  getArchetype,
  ARCHETYPE_IDS,
  resolveModulesForArchetypeSwitch,
  applyModuleOverrides,
  normalizeModuleOverrides,
} from './presets'
import type { ArchetypeId, ModuleOverrides } from './presets'
import { normalizePrimaryNavHrefs } from '@/lib/interface/surface-governance'

function fromChefPreferences(db: any): any {
  return (db as any).from('chef_preferences')
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
  const db: any = createServerClient()

  // Upsert into chef_preferences
  const { data: existing } = await fromChefPreferences(db)
    .select('id, archetype, enabled_modules')
    .eq('chef_id', user.entityId)
    .single()

  // Amendment 2 of docs/chef-navigation-decision-contract.md: an explicit chef
  // toggle outranks any preset. Switching archetype used to overwrite
  // enabled_modules outright, which threw away every module the chef had turned
  // on or off by hand. We can recover those choices without a new column: any
  // module enabled that their previous archetype's preset did not include was
  // turned on by the chef, and any module the previous preset included that is
  // not enabled was turned off by the chef. Both survive the switch.
  const rawPrevious = (existing as any)?.archetype
  const previousArchetype: ArchetypeId | null =
    typeof rawPrevious === 'string' && (ARCHETYPE_IDS as string[]).includes(rawPrevious)
      ? (rawPrevious as ArchetypeId)
      : null

  // Preferred source of truth: the recorded deviation from the previous preset.
  // The column arrives with 20260913000001_chef_module_overrides.sql, so this
  // read is defensive and an unmigrated database simply falls through to the
  // inference below.
  let storedOverrides: ModuleOverrides | null = null
  try {
    const { data: overrideRow, error: overrideError } = await fromChefPreferences(db)
      .select('module_overrides')
      .eq('chef_id', user.entityId)
      .single()
    if (!overrideError && overrideRow) {
      const normalized = normalizeModuleOverrides((overrideRow as any).module_overrides)
      if (normalized.on.length > 0 || normalized.off.length > 0) storedOverrides = normalized
    }
  } catch {
    storedOverrides = null
  }

  const nextModules = storedOverrides
    ? applyModuleOverrides(archetypeId, storedOverrides)
    : resolveModulesForArchetypeSwitch({
        previousArchetype,
        previousEnabledModules: (existing as any)?.enabled_modules,
        nextArchetype: archetypeId,
      })

  const payload = {
    archetype: archetypeId,
    enabled_modules: nextModules,
    primary_nav_hrefs: normalizePrimaryNavHrefs(archetype.primaryNavHrefs),
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await fromChefPreferences(db).update(payload).eq('chef_id', user.entityId)

    if (error) {
      console.error('[selectArchetype] Update error:', error)
      throw new Error('Failed to apply archetype')
    }
  } else {
    const { error } = await fromChefPreferences(db).insert({
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
  revalidateTag(`chef-archetype-${user.entityId}`)
  revalidateTag(`chef-prefs-${user.entityId}`)

  // Non-blocking: ensure HACCP plan exists for this archetype
  try {
    const { ensureHACCPPlan } = await import('@/lib/haccp/actions')
    await ensureHACCPPlan(archetypeId)
  } catch (err) {
    console.error('[non-blocking] HACCP plan generation failed', err)
  }

  return { success: true, archetype: archetypeId }
}

/**
 * Get the chef's current archetype (null if not yet selected).
 */
export async function getChefArchetype(): Promise<ArchetypeId | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await fromChefPreferences(db)
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
  const db: any = createServerClient()

  // Read current nav hrefs and modules
  const { data: prefs } = await fromChefPreferences(db)
    .select('primary_nav_hrefs, enabled_modules')
    .eq('chef_id', user.entityId)
    .single()

  if (!prefs) throw new Error('No preferences found')

  const { error } = await fromChefPreferences(db)
    .update({
      saved_custom_nav_hrefs: {
        primary_nav_hrefs: normalizePrimaryNavHrefs((prefs as any).primary_nav_hrefs ?? []),
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
  const db: any = createServerClient()

  const { data: prefs } = await fromChefPreferences(db)
    .select('saved_custom_nav_hrefs')
    .eq('chef_id', user.entityId)
    .single()

  const saved = (prefs as any)?.saved_custom_nav_hrefs
  if (!saved || typeof saved !== 'object') {
    throw new Error('No saved custom default found')
  }

  const { error } = await fromChefPreferences(db)
    .update({
      primary_nav_hrefs: normalizePrimaryNavHrefs(saved.primary_nav_hrefs ?? []),
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
  const db: any = createServerClient()

  const { data } = await fromChefPreferences(db)
    .select('saved_custom_nav_hrefs')
    .eq('chef_id', user.entityId)
    .single()

  const saved = (data as any)?.saved_custom_nav_hrefs
  return saved != null && typeof saved === 'object'
}
