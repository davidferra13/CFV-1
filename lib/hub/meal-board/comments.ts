'use server'

import { createServerClient } from '@/lib/db/server'
import type { MealComment } from '../types'
import { hasMemberAccess, resolveProfile } from './shared'

export async function getBatchCommentCounts(
  input:
    | string[]
    | {
        groupId: string
        profileToken?: string
        mealEntryIds: string[]
      }
): Promise<Record<string, number>> {
  if (Array.isArray(input)) return {}

  const { groupId, mealEntryIds } = input
  if (mealEntryIds.length === 0) return {}
  const db: any = createServerClient({ admin: true })
  if (!(await hasMemberAccess(db, groupId, input.profileToken))) return {}

  const { data: meals, error: mealError } = await db
    .from('hub_meal_board')
    .select('id')
    .eq('group_id', groupId)
    .in('id', mealEntryIds)
  if (mealError || !meals) return {}

  const scopedMealEntryIds = meals.map((meal: any) => meal.id)
  if (scopedMealEntryIds.length === 0) return {}

  const { data, error } = await db
    .from('hub_meal_comments')
    .select('meal_entry_id')
    .in('meal_entry_id', scopedMealEntryIds)

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.meal_entry_id] = (counts[row.meal_entry_id] ?? 0) + 1
  }
  return counts
}

export async function getMealComments(
  input:
    | string
    | {
        mealEntryId: string
        profileToken?: string
      }
): Promise<MealComment[]> {
  if (typeof input === 'string') return []

  const { mealEntryId } = input
  const db: any = createServerClient({ admin: true })

  const { data: meal } = await db
    .from('hub_meal_board')
    .select('group_id')
    .eq('id', mealEntryId)
    .single()
  if (!meal) return []
  if (!(await hasMemberAccess(db, meal.group_id, input.profileToken))) {
    return []
  }

  const { data, error } = await db
    .from('hub_meal_comments')
    .select('*, author:hub_guest_profiles!author_profile_id(id, display_name, avatar_url)')
    .eq('meal_entry_id', mealEntryId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load comments: ${error.message}`)
  return (data ?? []).map((c: any) => ({
    ...c,
    author: c.author ?? undefined,
  }))
}

export async function addMealComment(input: {
  mealEntryId: string
  profileToken: string
  body: string
}): Promise<{ success: boolean; comment?: MealComment; error?: string }> {
  try {
    if (!input.body.trim()) return { success: false, error: 'Comment cannot be empty' }
    if (input.body.length > 500)
      return { success: false, error: 'Comment too long (max 500 chars)' }

    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    // Verify the meal exists and get group for membership check
    const { data: meal } = await db
      .from('hub_meal_board')
      .select('group_id')
      .eq('id', input.mealEntryId)
      .single()
    if (!meal) return { success: false, error: 'Meal not found' }

    // Verify membership
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', meal.group_id)
      .eq('profile_id', profile.id)
      .single()
    if (!membership) return { success: false, error: 'Not a member of this circle' }

    const { data, error } = await db
      .from('hub_meal_comments')
      .insert({
        meal_entry_id: input.mealEntryId,
        author_profile_id: profile.id,
        body: input.body.trim(),
      })
      .select('*, author:hub_guest_profiles!author_profile_id(id, display_name, avatar_url)')
      .single()

    if (error) throw new Error(error.message)
    return { success: true, comment: { ...data, author: data.author ?? undefined } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
