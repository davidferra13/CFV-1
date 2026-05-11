// Client Meal Actions - Weekly meal board for residency/recurring clients

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type MealEntry = {
  id: string
  date: string
  meal_type: string
  dish_name: string
  description: string | null
  dietary_tags: string[]
  photo_url: string | null
  feedback_rating: number | null
  feedback_notes: string | null
}

export type WeekMeals = {
  weekStart: string
  weekEnd: string
  meals: MealEntry[]
  hasActiveMealProgram: boolean
}

/**
 * Get the meal board for the current week (or specified offset).
 * Looks up via hub_meal_board entries linked to client's circles.
 */
export async function getMyMealBoard(weekOffset = 0): Promise<WeekMeals> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Calculate week boundaries
  const now = new Date()
  now.setDate(now.getDate() + weekOffset * 7)
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Find client's hub profile and linked circles
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('client_id', user.entityId)
    .maybeSingle()

  if (!profile) {
    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      meals: [],
      hasActiveMealProgram: false,
    }
  }

  // Get circles this client belongs to
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', profile.id)

  if (!memberships?.length) {
    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      meals: [],
      hasActiveMealProgram: false,
    }
  }

  const groupIds = memberships.map((m: any) => m.group_id)

  // Query meal board entries for these circles in the date range
  const { data: meals, error } = await db
    .from('hub_meal_board')
    .select('id, meal_date, meal_type, dish_name, description, dietary_tags, photo_url')
    .in('group_id', groupIds)
    .gte('meal_date', weekStart.toISOString().split('T')[0])
    .lte('meal_date', weekEnd.toISOString().split('T')[0])
    .order('meal_date', { ascending: true })
    .order('meal_type', { ascending: true })

  if (error) {
    console.error('[getMyMealBoard] Query failed:', error)
    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      meals: [],
      hasActiveMealProgram: false,
    }
  }

  // Check for feedback on these meals
  const mealIds = (meals ?? []).map((m: any) => m.id)
  let feedbackMap = new Map<string, { rating: number; notes: string | null }>()

  if (mealIds.length > 0) {
    const { data: feedback } = await db
      .from('hub_meal_feedback')
      .select('meal_id, rating, notes')
      .in('meal_id', mealIds)
      .eq('profile_id', profile.id)

    for (const f of feedback ?? []) {
      feedbackMap.set(f.meal_id, { rating: f.rating, notes: f.notes })
    }
  }

  const mealEntries: MealEntry[] = (meals ?? []).map((m: any) => {
    const fb = feedbackMap.get(m.id)
    return {
      id: m.id,
      date: m.meal_date,
      meal_type: m.meal_type || 'dinner',
      dish_name: m.dish_name || 'Meal',
      description: m.description,
      dietary_tags: m.dietary_tags || [],
      photo_url: m.photo_url,
      feedback_rating: fb?.rating ?? null,
      feedback_notes: fb?.notes ?? null,
    }
  })

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    meals: mealEntries,
    hasActiveMealProgram: mealEntries.length > 0,
  }
}

export async function submitMealFeedback(mealId: string, rating: number, notes?: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('client_id', user.entityId)
    .maybeSingle()

  if (!profile) throw new Error('Profile not found')

  // Upsert feedback
  const { error } = await db.from('hub_meal_feedback').upsert(
    {
      meal_id: mealId,
      profile_id: profile.id,
      rating,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'meal_id,profile_id' }
  )

  if (error) {
    console.error('[submitMealFeedback] Upsert failed:', error)
    throw new Error('Failed to save feedback')
  }

  revalidatePath('/my-meals')
  return { success: true }
}
