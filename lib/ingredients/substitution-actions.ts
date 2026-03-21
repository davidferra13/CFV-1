'use server'

// Ingredient Substitution Actions
// CRUD operations for ingredient substitutions.
// System-level substitutions (chef_id = null) are read-only defaults.
// Chef-level substitutions are personal additions.

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { SYSTEM_SUBSTITUTIONS } from './substitution-seed'

// ── Types ──────────────────────────────────────────────────────────────────

export type Substitution = {
  id: string
  original: string
  substitute: string
  ratio: string
  notes: string | null
  dietary_safe_for: string[]
  source: 'system' | 'chef'
  chef_id: string | null
  created_at: string
}

export type SubstitutionSearchResult = {
  original: string
  substitutes: Array<{
    id: string
    substitute: string
    ratio: string
    notes: string | null
    dietary_safe_for: string[]
    source: 'system' | 'chef'
  }>
}

// ── searchSubstitutions ────────────────────────────────────────────────────

/**
 * Search for substitutions by ingredient name.
 * Returns both system defaults and chef's personal additions.
 * Uses case-insensitive partial matching.
 */
export async function searchSubstitutions(
  ingredientName: string
): Promise<SubstitutionSearchResult | null> {
  const user = await requireChef()

  if (!ingredientName || ingredientName.trim().length < 2) {
    return null
  }

  const query = ingredientName.trim().toLowerCase()
  const supabase: any = createServerClient()

  // Fetch chef's personal substitutions matching the query
  const { data: chefSubs, error } = await supabase
    .from('ingredient_substitutions')
    .select('id, original, substitute, ratio, notes, dietary_safe_for, source, chef_id, created_at')
    .eq('chef_id', user.entityId)
    .ilike('original', `%${query}%`)
    .order('original')
    .limit(20)

  if (error) {
    console.error('[searchSubstitutions] DB error:', error)
  }

  // Also search system seed data (in-memory, no DB query needed)
  const systemMatches = SYSTEM_SUBSTITUTIONS.filter((s) => s.original.toLowerCase().includes(query))

  // Combine results
  const allSubstitutes: SubstitutionSearchResult['substitutes'] = []

  // Add system matches
  for (const sys of systemMatches) {
    allSubstitutes.push({
      id: `system-${sys.original}-${sys.substitute}`.replace(/\s+/g, '-').toLowerCase(),
      substitute: sys.substitute,
      ratio: sys.ratio,
      notes: sys.notes,
      dietary_safe_for: sys.dietary_safe_for,
      source: 'system' as const,
    })
  }

  // Add chef's personal matches
  for (const sub of chefSubs ?? []) {
    allSubstitutes.push({
      id: sub.id,
      substitute: sub.substitute,
      ratio: sub.ratio,
      notes: sub.notes,
      dietary_safe_for: sub.dietary_safe_for ?? [],
      source: 'chef' as const,
    })
  }

  if (allSubstitutes.length === 0) return null

  // Find the best matching original name for display
  const bestOriginal = systemMatches[0]?.original ?? chefSubs?.[0]?.original ?? ingredientName

  return {
    original: bestOriginal,
    substitutes: allSubstitutes,
  }
}

// ── getAllSubstitutions ─────────────────────────────────────────────────────

/**
 * Gets all substitutions: system defaults + chef's personal additions.
 * Used for the substitution management page.
 */
export async function getAllSubstitutions(): Promise<{
  system: typeof SYSTEM_SUBSTITUTIONS
  personal: Substitution[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: personal, error } = await supabase
    .from('ingredient_substitutions')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('original')

  if (error) {
    console.error('[getAllSubstitutions] Error:', error)
    return { system: SYSTEM_SUBSTITUTIONS, personal: [] }
  }

  return {
    system: SYSTEM_SUBSTITUTIONS,
    personal: personal ?? [],
  }
}

// ── addSubstitution ────────────────────────────────────────────────────────

/**
 * Adds a personal substitution for the chef.
 */
export async function addSubstitution(input: {
  original: string
  substitute: string
  ratio: string
  notes?: string
  dietarySafeFor?: string[]
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  if (!input.original?.trim() || !input.substitute?.trim() || !input.ratio?.trim()) {
    return { success: false, error: 'Original ingredient, substitute, and ratio are required' }
  }

  const supabase: any = createServerClient()

  const { error } = await supabase.from('ingredient_substitutions').insert({
    chef_id: user.entityId,
    original: input.original.trim(),
    substitute: input.substitute.trim(),
    ratio: input.ratio.trim(),
    notes: input.notes?.trim() || null,
    dietary_safe_for: input.dietarySafeFor ?? [],
    source: 'chef',
  })

  if (error) {
    console.error('[addSubstitution] Error:', error)
    return { success: false, error: 'Failed to save substitution' }
  }

  revalidatePath('/culinary/substitutions')
  return { success: true }
}

// ── deleteSubstitution ─────────────────────────────────────────────────────

/**
 * Deletes a chef's personal substitution. Cannot delete system substitutions.
 */
export async function deleteSubstitution(
  substitutionId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('ingredient_substitutions')
    .delete()
    .eq('id', substitutionId)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[deleteSubstitution] Error:', error)
    return { success: false, error: 'Failed to delete substitution' }
  }

  revalidatePath('/culinary/substitutions')
  return { success: true }
}
