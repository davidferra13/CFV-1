// Smart Import Server Actions
// Takes parsed AI data and creates records in the database
// Chef-only, tenant-scoped, requires review before saving

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ParsedClient } from './parse-client'
import type { ParsedRecipe, ParsedIngredient } from './parse-recipe'
import type { BrainDumpResult } from './parse-brain-dump'
import type { Json } from '@/types/database'

// ============================================
// 1. IMPORT SINGLE CLIENT
// ============================================

export async function importClient(parsed: ParsedClient) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Build regular_guests JSON
  const regularGuests = parsed.regular_guests.length > 0
    ? parsed.regular_guests as unknown as Json
    : null

  // Build personal_milestones JSON
  const personalMilestones = parsed.personal_milestones as Json ?? null

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      tenant_id: user.tenantId!,
      full_name: parsed.full_name,
      email: parsed.email || `${parsed.full_name.toLowerCase().replace(/\s+/g, '.')}@placeholder.import`,
      phone: parsed.phone,
      partner_name: parsed.partner_name,
      address: parsed.address || (parsed.addresses.length > 0
        ? [parsed.addresses[0].address, parsed.addresses[0].city, parsed.addresses[0].state, parsed.addresses[0].zip].filter(Boolean).join(', ')
        : null),
      dietary_restrictions: parsed.dietary_restrictions.length > 0 ? parsed.dietary_restrictions : null,
      allergies: parsed.allergies.length > 0 ? parsed.allergies : null,
      dislikes: parsed.dislikes.length > 0 ? parsed.dislikes : null,
      spice_tolerance: parsed.spice_tolerance,
      favorite_cuisines: parsed.favorite_cuisines.length > 0 ? parsed.favorite_cuisines : null,
      favorite_dishes: parsed.favorite_dishes.length > 0 ? parsed.favorite_dishes : null,
      preferred_contact_method: parsed.preferred_contact_method,
      referral_source: parsed.referral_source,
      referral_source_detail: parsed.referral_source_detail,
      regular_guests: regularGuests,
      parking_instructions: parsed.parking_instructions,
      access_instructions: parsed.access_instructions,
      kitchen_size: parsed.kitchen_size,
      kitchen_constraints: parsed.kitchen_constraints,
      house_rules: parsed.house_rules,
      equipment_available: parsed.equipment_available.length > 0 ? parsed.equipment_available : null,
      equipment_must_bring: parsed.equipment_must_bring.length > 0 ? parsed.equipment_must_bring : null,
      vibe_notes: parsed.vibe_notes,
      what_they_care_about: parsed.what_they_care_about,
      wine_beverage_preferences: parsed.wine_beverage_preferences,
      average_spend_cents: parsed.average_spend_cents,
      payment_behavior: parsed.payment_behavior,
      tipping_pattern: parsed.tipping_pattern,
      status: parsed.status,
      children: parsed.children.length > 0 ? parsed.children : null,
      farewell_style: parsed.farewell_style,
      personal_milestones: personalMilestones,
    })
    .select()
    .single()

  if (error) {
    console.error('[importClient] Error:', error)
    throw new Error('Failed to import client')
  }

  revalidatePath('/clients')
  return { success: true, client }
}

// ============================================
// 2. IMPORT MULTIPLE CLIENTS (BATCH)
// ============================================

export async function importClients(parsedClients: ParsedClient[]) {
  const user = await requireChef()
  const results: { success: boolean; client?: unknown; error?: string; name: string }[] = []

  for (const parsed of parsedClients) {
    try {
      const result = await importClient(parsed)
      results.push({ success: true, client: result.client, name: parsed.full_name })
    } catch (err) {
      results.push({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        name: parsed.full_name
      })
    }
  }

  revalidatePath('/clients')
  return {
    success: results.every(r => r.success),
    imported: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}

// ============================================
// 3. IMPORT RECIPE
// ============================================

export async function importRecipe(parsed: ParsedRecipe) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Create the recipe record
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      tenant_id: user.tenantId!,
      name: parsed.name,
      category: parsed.category,
      description: parsed.description,
      method: parsed.method,
      method_detailed: parsed.method_detailed,
      yield_quantity: parsed.yield_quantity,
      yield_unit: parsed.yield_unit,
      yield_description: parsed.yield_description,
      prep_time_minutes: parsed.prep_time_minutes,
      cook_time_minutes: parsed.cook_time_minutes,
      total_time_minutes: parsed.total_time_minutes,
      dietary_tags: parsed.dietary_tags.length > 0 ? parsed.dietary_tags : [],
      adaptations: parsed.adaptations,
      notes: parsed.notes,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (recipeError) {
    console.error('[importRecipe] Error:', recipeError)
    throw new Error('Failed to import recipe')
  }

  // Create ingredients and link them
  if (parsed.ingredients.length > 0) {
    for (let i = 0; i < parsed.ingredients.length; i++) {
      const ing = parsed.ingredients[i]

      // Find or create the ingredient in the ingredients table
      const ingredientId = await findOrCreateIngredient(
        supabase,
        user.tenantId!,
        user.id,
        ing
      )

      // Create the recipe_ingredient link
      await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipe.id,
          ingredient_id: ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          preparation_notes: ing.preparation_notes,
          is_optional: ing.is_optional,
          sort_order: i
        })
    }
  }

  revalidatePath('/menus')
  return { success: true, recipe }
}

/**
 * Find existing ingredient by name (case-insensitive) or create new one
 */
async function findOrCreateIngredient(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  userId: string,
  ing: ParsedIngredient
): Promise<string> {
  // Try to find existing ingredient by name
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', ing.name)
    .limit(1)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new ingredient
  const { data: newIngredient, error } = await supabase
    .from('ingredients')
    .insert({
      tenant_id: tenantId,
      name: ing.name,
      category: ing.category,
      default_unit: ing.unit,
      allergen_flags: ing.allergen_flags.length > 0 ? ing.allergen_flags : [],
      dietary_tags: [],
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[findOrCreateIngredient] Error:', error)
    throw new Error('Failed to create ingredient "${ing.name}"')
  }

  return newIngredient.id
}

// ============================================
// 4. IMPORT BRAIN DUMP (ROUTES TO CORRECT IMPORTERS)
// ============================================

export type BrainDumpImportResult = {
  clients: { success: boolean; name: string; id?: string; error?: string }[]
  recipes: { success: boolean; name: string; id?: string; error?: string }[]
  notes: { type: string; content: string; suggestedAction: string }[]
  unstructured: string[]
}

export async function importBrainDump(parsed: BrainDumpResult): Promise<BrainDumpImportResult> {
  await requireChef()

  const result: BrainDumpImportResult = {
    clients: [],
    recipes: [],
    notes: parsed.notes,
    unstructured: parsed.unstructured
  }

  // Import clients
  for (const client of parsed.clients) {
    try {
      const imported = await importClient(client)
      result.clients.push({
        success: true,
        name: client.full_name,
        id: (imported.client as { id: string }).id
      })
    } catch (err) {
      result.clients.push({
        success: false,
        name: client.full_name,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  // Import recipes
  for (const recipe of parsed.recipes) {
    try {
      const imported = await importRecipe(recipe)
      result.recipes.push({
        success: true,
        name: recipe.name,
        id: (imported.recipe as { id: string }).id
      })
    } catch (err) {
      result.recipes.push({
        success: false,
        name: recipe.name,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  return result
}
