// AAR Feedback Actions
// Per-recipe feedback and per-ingredient issue tracking from after-action reviews.
// Closes the feedback loop: chef's post-event observations flow back to recipes
// and ingredients, surfacing as "track record" data on recipe detail pages.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type RecipeFeedback = {
  id: string
  aarId: string
  recipeId: string
  recipeName: string
  timingAccuracy: 'faster' | 'accurate' | 'slower' | null
  wouldUseAgain: boolean
  notes: string | null
}

export type IngredientIssue = {
  id: string
  aarId: string
  ingredientId: string
  ingredientName: string
  issueType: 'forgotten' | 'substituted' | 'quality' | 'quantity_wrong' | 'price_wrong'
  notes: string | null
}

export type RecipeTrackRecord = {
  recipeId: string
  timesCooked: number
  lastCookedAt: string | null
  avgTimingAccuracy: { faster: number; accurate: number; slower: number }
  wouldUseAgainRate: number | null // 0-1, null if no feedback
  recentFeedback: Array<{
    eventOccasion: string
    eventDate: string
    clientName: string | null
    timingAccuracy: string | null
    wouldUseAgain: boolean
    notes: string | null
  }>
}

// --- Validation Schemas ---

const RecipeFeedbackSchema = z.object({
  aarId: z.string().uuid(),
  recipeId: z.string().uuid(),
  timingAccuracy: z.enum(['faster', 'accurate', 'slower']).nullable().optional(),
  wouldUseAgain: z.boolean().default(true),
  notes: z.string().nullable().optional(),
})

const IngredientIssueSchema = z.object({
  aarId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  issueType: z.enum(['forgotten', 'substituted', 'quality', 'quantity_wrong', 'price_wrong']),
  notes: z.string().nullable().optional(),
})

export type SaveRecipeFeedbackInput = z.infer<typeof RecipeFeedbackSchema>
export type SaveIngredientIssueInput = z.infer<typeof IngredientIssueSchema>

// --- Recipe Feedback ---

/**
 * Save or update recipe feedback for an AAR.
 * Uses upsert: one feedback entry per recipe per AAR.
 */
export async function saveRecipeFeedback(input: SaveRecipeFeedbackInput) {
  const user = await requireChef()
  const validated = RecipeFeedbackSchema.parse(input)
  const db: any = createServerClient()

  // Verify AAR belongs to this tenant
  const { data: aar } = await db
    .from('after_action_reviews')
    .select('id, event_id')
    .eq('id', validated.aarId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!aar) {
    throw new Error('AAR not found')
  }

  // Check if feedback already exists for this recipe+AAR
  const { data: existing } = await db
    .from('aar_recipe_feedback')
    .select('id')
    .eq('aar_id', validated.aarId)
    .eq('recipe_id', validated.recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (existing) {
    // Update
    const { error } = await db
      .from('aar_recipe_feedback')
      .update({
        timing_accuracy: validated.timingAccuracy ?? null,
        would_use_again: validated.wouldUseAgain,
        notes: validated.notes ?? null,
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[saveRecipeFeedback] Update error:', error)
      throw new Error('Failed to update recipe feedback')
    }
  } else {
    // Insert
    const { error } = await db.from('aar_recipe_feedback').insert({
      aar_id: validated.aarId,
      recipe_id: validated.recipeId,
      tenant_id: user.tenantId!,
      timing_accuracy: validated.timingAccuracy ?? null,
      would_use_again: validated.wouldUseAgain,
      notes: validated.notes ?? null,
    })

    if (error) {
      console.error('[saveRecipeFeedback] Insert error:', error)
      throw new Error('Failed to save recipe feedback')
    }
  }

  revalidatePath(`/events/${aar.event_id}/aar`)
  revalidatePath(`/recipes/${validated.recipeId}`)

  return { success: true }
}

/**
 * Save multiple recipe feedbacks at once (batch save from AAR form).
 */
export async function saveAllRecipeFeedback(
  aarId: string,
  feedbacks: Array<{
    recipeId: string
    timingAccuracy: 'faster' | 'accurate' | 'slower' | null
    wouldUseAgain: boolean
    notes: string | null
  }>
) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify AAR belongs to this tenant
  const { data: aar } = await db
    .from('after_action_reviews')
    .select('id, event_id')
    .eq('id', aarId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!aar) {
    throw new Error('AAR not found')
  }

  // Process each feedback
  let saved = 0
  for (const fb of feedbacks) {
    // Skip empty feedback (no timing, would_use_again=true default, no notes)
    if (!fb.timingAccuracy && fb.wouldUseAgain && !fb.notes) continue

    try {
      await saveRecipeFeedback({
        aarId,
        recipeId: fb.recipeId,
        timingAccuracy: fb.timingAccuracy,
        wouldUseAgain: fb.wouldUseAgain,
        notes: fb.notes,
      })
      saved++
    } catch (err) {
      console.error(`[saveAllRecipeFeedback] Failed for recipe ${fb.recipeId}:`, err)
    }
  }

  // Revalidate recipe pages
  for (const fb of feedbacks) {
    revalidatePath(`/recipes/${fb.recipeId}`)
  }

  return { success: true, saved }
}

/**
 * Get all recipe feedback for an AAR.
 */
export async function getRecipeFeedbackForAAR(aarId: string): Promise<RecipeFeedback[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('aar_recipe_feedback')
    .select(
      `
      id,
      aar_id,
      recipe_id,
      timing_accuracy,
      would_use_again,
      notes,
      recipe:recipes(name)
    `
    )
    .eq('aar_id', aarId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getRecipeFeedbackForAAR] Error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    aarId: row.aar_id,
    recipeId: row.recipe_id,
    recipeName: row.recipe?.name ?? 'Unknown Recipe',
    timingAccuracy: row.timing_accuracy,
    wouldUseAgain: row.would_use_again,
    notes: row.notes,
  }))
}

// --- Recipe Track Record ---

/**
 * Get the track record for a recipe: how it has performed across all events.
 * Combines times_cooked from the recipe itself with AAR feedback data.
 */
export async function getRecipeTrackRecord(recipeId: string): Promise<RecipeTrackRecord> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get recipe basic stats
  const { data: recipe } = await db
    .from('recipes')
    .select('id, times_cooked, last_cooked_at')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Get all feedback for this recipe with event context
  const { data: feedbacks } = await db
    .from('aar_recipe_feedback')
    .select(
      `
      timing_accuracy,
      would_use_again,
      notes,
      aar:after_action_reviews(
        event:events(occasion, event_date, client:clients(full_name))
      )
    `
    )
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  const feedbackList = feedbacks || []

  // Compute timing accuracy distribution
  const timingCounts = { faster: 0, accurate: 0, slower: 0 }
  let wouldUseAgainYes = 0
  let wouldUseAgainTotal = 0

  for (const fb of feedbackList) {
    if (fb.timing_accuracy) {
      timingCounts[fb.timing_accuracy as keyof typeof timingCounts]++
    }
    wouldUseAgainTotal++
    if (fb.would_use_again) wouldUseAgainYes++
  }

  const recentFeedback = feedbackList.slice(0, 10).map((fb: any) => ({
    eventOccasion: fb.aar?.event?.occasion ?? 'Unknown',
    eventDate: fb.aar?.event?.event_date ?? '',
    clientName: fb.aar?.event?.client?.full_name ?? null,
    timingAccuracy: fb.timing_accuracy,
    wouldUseAgain: fb.would_use_again,
    notes: fb.notes,
  }))

  return {
    recipeId,
    timesCooked: recipe?.times_cooked ?? 0,
    lastCookedAt: recipe?.last_cooked_at ?? null,
    avgTimingAccuracy: timingCounts,
    wouldUseAgainRate: wouldUseAgainTotal > 0 ? wouldUseAgainYes / wouldUseAgainTotal : null,
    recentFeedback,
  }
}

// --- Ingredient Issues ---

/**
 * Save an ingredient issue from an AAR.
 */
export async function saveIngredientIssue(input: SaveIngredientIssueInput) {
  const user = await requireChef()
  const validated = IngredientIssueSchema.parse(input)
  const db: any = createServerClient()

  // Verify AAR belongs to this tenant
  const { data: aar } = await db
    .from('after_action_reviews')
    .select('id, event_id')
    .eq('id', validated.aarId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!aar) {
    throw new Error('AAR not found')
  }

  // Upsert: check if this issue already exists
  const { data: existing } = await db
    .from('aar_ingredient_issues')
    .select('id')
    .eq('aar_id', validated.aarId)
    .eq('ingredient_id', validated.ingredientId)
    .eq('issue_type', validated.issueType)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (existing) {
    const { error } = await db
      .from('aar_ingredient_issues')
      .update({ notes: validated.notes ?? null })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[saveIngredientIssue] Update error:', error)
      throw new Error('Failed to update ingredient issue')
    }
  } else {
    const { error } = await db.from('aar_ingredient_issues').insert({
      aar_id: validated.aarId,
      ingredient_id: validated.ingredientId,
      tenant_id: user.tenantId!,
      issue_type: validated.issueType,
      notes: validated.notes ?? null,
    })

    if (error) {
      console.error('[saveIngredientIssue] Insert error:', error)
      throw new Error('Failed to save ingredient issue')
    }
  }

  revalidatePath(`/events/${aar.event_id}/aar`)
  return { success: true }
}

/**
 * Remove an ingredient issue from an AAR.
 */
export async function removeIngredientIssue(issueId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('aar_ingredient_issues')
    .delete()
    .eq('id', issueId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[removeIngredientIssue] Error:', error)
    throw new Error('Failed to remove ingredient issue')
  }

  return { success: true }
}

/**
 * Get all ingredient issues for an AAR.
 */
export async function getIngredientIssuesForAAR(aarId: string): Promise<IngredientIssue[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('aar_ingredient_issues')
    .select(
      `
      id,
      aar_id,
      ingredient_id,
      issue_type,
      notes,
      ingredient:ingredients(name)
    `
    )
    .eq('aar_id', aarId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getIngredientIssuesForAAR] Error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    aarId: row.aar_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient?.name ?? 'Unknown Ingredient',
    issueType: row.issue_type,
    notes: row.notes,
  }))
}

/**
 * Get ingredient issue history for a specific ingredient.
 * Used on ingredient detail pages to show recurring problems.
 */
export async function getIngredientIssueHistory(ingredientId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('aar_ingredient_issues')
    .select(
      `
      id,
      issue_type,
      notes,
      created_at,
      aar:after_action_reviews(
        event:events(occasion, event_date)
      )
    `
    )
    .eq('ingredient_id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getIngredientIssueHistory] Error:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    issueType: row.issue_type,
    notes: row.notes,
    createdAt: row.created_at,
    eventOccasion: row.aar?.event?.occasion ?? 'Unknown',
    eventDate: row.aar?.event?.event_date ?? '',
  }))
}
