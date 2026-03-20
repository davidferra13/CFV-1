'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ── Types ───────────────────────────────────────────────────────────────────

export type RecipeStepPhoto = {
  id: string
  chef_id: string
  recipe_id: string
  step_number: number
  photo_url: string
  caption: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function getRecipeStepPhotos(recipeId: string): Promise<RecipeStepPhoto[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('recipe_step_photos')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('chef_id', user.tenantId!)
    .order('step_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[recipe-photos] Failed to fetch step photos:', error.message)
    throw new Error('Failed to load recipe step photos')
  }

  return (data ?? []) as RecipeStepPhoto[]
}

// ── Mutations ───────────────────────────────────────────────────────────────

export async function addRecipeStepPhoto(data: {
  recipeId: string
  stepNumber: number
  photoUrl: string
  caption?: string
}): Promise<RecipeStepPhoto> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Determine next sort_order for this step
  const { count } = await supabase
    .from('recipe_step_photos')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', data.recipeId)
    .eq('chef_id', tenantId)
    .eq('step_number', data.stepNumber)

  const nextOrder = count ?? 0

  const { data: photo, error } = await supabase
    .from('recipe_step_photos')
    .insert({
      chef_id: tenantId,
      recipe_id: data.recipeId,
      step_number: data.stepNumber,
      photo_url: data.photoUrl,
      caption: data.caption ?? null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('[recipe-photos] Failed to add step photo:', error.message)
    throw new Error('Failed to add step photo')
  }

  revalidatePath(`/recipes/${data.recipeId}`)
  return photo as RecipeStepPhoto
}

export async function updateRecipeStepPhoto(
  id: string,
  data: { caption?: string; sortOrder?: number }
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.caption !== undefined) updates.caption = data.caption
  if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder

  const { error } = await supabase
    .from('recipe_step_photos')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[recipe-photos] Failed to update step photo:', error.message)
    throw new Error('Failed to update step photo')
  }

  revalidatePath('/recipes')
}

export async function deleteRecipeStepPhoto(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('recipe_step_photos')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[recipe-photos] Failed to delete step photo:', error.message)
    throw new Error('Failed to delete step photo')
  }

  revalidatePath('/recipes')
}

export async function reorderStepPhotos(
  recipeId: string,
  stepNumber: number,
  photoIds: string[]
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Update each photo's sort_order based on position in the array
  const updates = photoIds.map((photoId, index) =>
    supabase
      .from('recipe_step_photos')
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq('id', photoId)
      .eq('chef_id', tenantId)
      .eq('recipe_id', recipeId)
      .eq('step_number', stepNumber)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)

  if (failed?.error) {
    console.error('[recipe-photos] Failed to reorder step photos:', failed.error.message)
    throw new Error('Failed to reorder step photos')
  }

  revalidatePath(`/recipes/${recipeId}`)
}
