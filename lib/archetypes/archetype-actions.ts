'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ARCHETYPE_IDS, type ArchetypeId } from './presets'
import { mergeArchetypePresets } from './hybrid-preset'

function fromChefPreferences(supabase: any): any {
  return (supabase as any).from('chef_preferences')
}

/**
 * Save a multi-archetype selection and apply the blended preset.
 * The first archetype in the array is treated as the primary.
 */
export async function saveArchetypeSelection(archetypeKeys: ArchetypeId[]) {
  if (!archetypeKeys || archetypeKeys.length === 0) {
    throw new Error('At least one archetype must be selected')
  }

  // Validate all keys
  for (const key of archetypeKeys) {
    if (!ARCHETYPE_IDS.includes(key)) {
      throw new Error(`Invalid archetype: ${key}`)
    }
  }

  const blended = mergeArchetypePresets(archetypeKeys)

  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const payload = {
    archetype: archetypeKeys[0], // primary archetype stored as the main one
    archetype_selections: archetypeKeys, // full list stored in JSONB
    enabled_modules: blended.enabledModules,
    primary_nav_hrefs: blended.primaryNavHrefs,
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
      console.error('[saveArchetypeSelection] Update error:', error)
      throw new Error('Failed to save archetype selection')
    }
  } else {
    const { error } = await fromChefPreferences(supabase).insert({
      chef_id: user.entityId,
      tenant_id: tenantId,
      ...payload,
    })

    if (error) {
      console.error('[saveArchetypeSelection] Insert error:', error)
      throw new Error('Failed to save archetype selection')
    }
  }

  revalidatePath('/', 'layout')
  revalidateTag(`chef-layout-${user.entityId}`)

  // Non-blocking: ensure HACCP plan exists for the primary archetype
  try {
    const { ensureHACCPPlan } = await import('@/lib/haccp/actions')
    await ensureHACCPPlan(archetypeKeys[0])
  } catch (err) {
    console.error('[non-blocking] HACCP plan generation failed', err)
  }

  return { success: true, archetypes: archetypeKeys }
}

/**
 * Get the chef's current archetype selection(s).
 * Returns an array of archetype IDs, or an empty array if none selected.
 */
export async function getArchetypeSelection(): Promise<ArchetypeId[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await fromChefPreferences(supabase)
    .select('archetype, archetype_selections')
    .eq('chef_id', user.entityId)
    .single()

  if (!data) return []

  // Prefer the multi-select array if it exists
  const selections = (data as any)?.archetype_selections
  if (Array.isArray(selections) && selections.length > 0) {
    return selections.filter((id: string) =>
      ARCHETYPE_IDS.includes(id as ArchetypeId)
    ) as ArchetypeId[]
  }

  // Fall back to the single archetype field (legacy)
  const single = (data as any)?.archetype
  if (single && ARCHETYPE_IDS.includes(single as ArchetypeId)) {
    return [single as ArchetypeId]
  }

  return []
}
