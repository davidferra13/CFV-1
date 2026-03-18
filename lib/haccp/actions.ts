'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateHACCPPlan } from './templates'
import type { HACCPPlanData } from './types'
import type { ArchetypeId } from '@/lib/archetypes/presets'
import { ARCHETYPE_IDS } from '@/lib/archetypes/presets'

// haccp_plans may not be in generated types yet - cast as needed
function fromHACCP(supabase: any): any {
  return (supabase as any).from('haccp_plans')
}

/**
 * Ensure a HACCP plan exists for the current chef.
 * If none exists, generates from archetype template.
 * If archetype changed, regenerates (preserving overrides).
 * Called from: selectArchetype() and HACCP page load.
 */
export async function ensureHACCPPlan(archetypeId?: ArchetypeId) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  // Determine archetype
  let archetype = archetypeId
  if (!archetype) {
    const { data: prefs } = await (supabase as any)
      .from('chef_preferences')
      .select('archetype')
      .eq('chef_id', chef.entityId)
      .single()
    archetype = prefs?.archetype as ArchetypeId | undefined
  }

  if (!archetype || !ARCHETYPE_IDS.includes(archetype)) {
    return null // No archetype selected yet
  }

  // Check for existing plan
  const { data: existing } = await fromHACCP(supabase)
    .select('*')
    .eq('chef_id', chef.entityId)
    .maybeSingle()

  if (existing && existing.archetype === archetype) {
    return existing // Plan exists and matches current archetype
  }

  // Generate new plan
  const planData = generateHACCPPlan(archetype)

  // Preserve any existing overrides if archetype changed
  if (existing) {
    const oldData = existing.plan_data as HACCPPlanData
    if (oldData.overrides && Object.keys(oldData.overrides).length > 0) {
      planData.overrides = oldData.overrides
    }

    const { data, error } = await fromHACCP(supabase)
      .update({
        archetype,
        plan_data: planData,
        updated_at: new Date().toISOString(),
      })
      .eq('chef_id', chef.entityId)
      .select()
      .single()

    if (error) throw new Error('Failed to update HACCP plan')
    revalidatePath('/settings/compliance/haccp')
    return data
  }

  // Insert new row
  const { data, error } = await fromHACCP(supabase)
    .insert({
      chef_id: chef.entityId,
      archetype,
      plan_data: planData,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to create HACCP plan')
  revalidatePath('/settings/compliance/haccp')
  return data
}

/**
 * Get the chef's HACCP plan. Returns null if none exists.
 */
export async function getHACCPPlan() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await fromHACCP(supabase)
    .select('*')
    .eq('chef_id', chef.entityId)
    .maybeSingle()

  if (error) throw new Error('Failed to fetch HACCP plan')
  return data
}

/**
 * Toggle a section on/off in the chef's HACCP plan.
 */
export async function toggleHACCPSection(sectionId: string, enabled: boolean) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: plan } = await fromHACCP(supabase)
    .select('plan_data')
    .eq('chef_id', chef.entityId)
    .single()

  if (!plan) throw new Error('No HACCP plan found')

  const planData = plan.plan_data as HACCPPlanData
  planData.overrides[sectionId] = {
    ...planData.overrides[sectionId],
    enabled,
  }

  const { error } = await fromHACCP(supabase)
    .update({ plan_data: planData })
    .eq('chef_id', chef.entityId)

  if (error) throw new Error('Failed to update HACCP section')
  revalidatePath('/settings/compliance/haccp')
}

/**
 * Save custom notes for a section.
 */
export async function updateHACCPSectionNotes(sectionId: string, notes: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: plan } = await fromHACCP(supabase)
    .select('plan_data')
    .eq('chef_id', chef.entityId)
    .single()

  if (!plan) throw new Error('No HACCP plan found')

  const planData = plan.plan_data as HACCPPlanData
  planData.overrides[sectionId] = {
    enabled: planData.overrides[sectionId]?.enabled ?? true,
    customNotes: notes || undefined,
  }

  const { error } = await fromHACCP(supabase)
    .update({ plan_data: planData })
    .eq('chef_id', chef.entityId)

  if (error) throw new Error('Failed to update HACCP section notes')
  revalidatePath('/settings/compliance/haccp')
}

/**
 * Mark the plan as reviewed (sets last_reviewed_at).
 */
export async function markHACCPReviewed() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await fromHACCP(supabase)
    .update({ last_reviewed_at: new Date().toISOString() })
    .eq('chef_id', chef.entityId)

  if (error) throw new Error('Failed to mark HACCP plan as reviewed')
  revalidatePath('/settings/compliance/haccp')
}

/**
 * Reset the plan to factory defaults (regenerate from template).
 * Clears all overrides and custom notes.
 */
export async function resetHACCPPlan() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: plan } = await fromHACCP(supabase)
    .select('archetype')
    .eq('chef_id', chef.entityId)
    .single()

  if (!plan) throw new Error('No HACCP plan found')

  const planData = generateHACCPPlan(plan.archetype as ArchetypeId)

  const { error } = await fromHACCP(supabase)
    .update({
      plan_data: planData,
      last_reviewed_at: null,
    })
    .eq('chef_id', chef.entityId)

  if (error) throw new Error('Failed to reset HACCP plan')
  revalidatePath('/settings/compliance/haccp')
}
