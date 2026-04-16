'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { MealFeedback, MealFeedbackSummary, MealReaction } from './types'

// ---------------------------------------------------------------------------
// Submit or update feedback on a meal
// ---------------------------------------------------------------------------

const SubmitFeedbackSchema = z.object({
  mealEntryId: z.string().uuid(),
  profileToken: z.string().uuid(),
  reaction: z.enum(['loved', 'liked', 'neutral', 'disliked']),
  note: z.string().max(200).optional().nullable(),
})

export async function submitMealFeedback(
  input: z.infer<typeof SubmitFeedbackSchema>
): Promise<{ success: boolean; feedback?: MealFeedback; error?: string }> {
  try {
    const validated = SubmitFeedbackSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    // Resolve profile
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('profile_token', validated.profileToken)
      .single()
    if (!profile) throw new Error('Invalid profile token')

    // Verify the meal entry exists and get group_id
    const { data: entry } = await db
      .from('hub_meal_board')
      .select('id, group_id')
      .eq('id', validated.mealEntryId)
      .single()
    if (!entry) throw new Error('Meal entry not found')

    // Verify membership in the group
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', entry.group_id)
      .eq('profile_id', profile.id)
      .single()
    if (!membership) throw new Error('Not a member of this group')

    // Check if feedback already exists (upsert)
    const { data: existing } = await db
      .from('hub_meal_feedback')
      .select('id')
      .eq('meal_entry_id', validated.mealEntryId)
      .eq('profile_id', profile.id)
      .single()

    let feedback: MealFeedback

    if (existing) {
      const { data, error } = await db
        .from('hub_meal_feedback')
        .update({
          reaction: validated.reaction,
          note: validated.note ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      feedback = data
    } else {
      const { data, error } = await db
        .from('hub_meal_feedback')
        .insert({
          meal_entry_id: validated.mealEntryId,
          profile_id: profile.id,
          reaction: validated.reaction,
          note: validated.note ?? null,
        })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      feedback = data
    }

    // Notify chef about new feedback (non-blocking)
    try {
      const { data: group } = await db
        .from('hub_groups')
        .select('chef_id')
        .eq('id', entry.group_id)
        .single()

      if (group?.chef_id) {
        const { data: profileInfo } = await db
          .from('hub_guest_profiles')
          .select('display_name')
          .eq('id', profile.id)
          .single()

        const guestName = profileInfo?.display_name || 'A guest'
        const reactionLabel =
          validated.reaction === 'loved'
            ? 'loved'
            : validated.reaction === 'liked'
              ? 'liked'
              : validated.reaction === 'disliked'
                ? 'disliked'
                : 'rated'

        const { createNotification, getChefAuthUserId } =
          await import('@/lib/notifications/actions')
        const chefUserId = await getChefAuthUserId(group.chef_id)
        if (chefUserId) {
          await createNotification({
            tenantId: group.chef_id,
            recipientId: chefUserId,
            category: 'system',
            action: 'system_alert',
            title: 'Meal feedback received',
            body: `${guestName} ${reactionLabel} a meal${validated.note ? `: "${validated.note}"` : ''}`,
            actionUrl: '/hub',
          })
        }
      }
    } catch {
      // Non-blocking - feedback already saved
    }

    return { success: true, feedback }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Remove feedback (un-react)
// ---------------------------------------------------------------------------

const RemoveFeedbackSchema = z.object({
  mealEntryId: z.string().uuid(),
  profileToken: z.string().uuid(),
})

export async function removeMealFeedback(
  input: z.infer<typeof RemoveFeedbackSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = RemoveFeedbackSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('profile_token', validated.profileToken)
      .single()
    if (!profile) throw new Error('Invalid profile token')

    const { error } = await db
      .from('hub_meal_feedback')
      .delete()
      .eq('meal_entry_id', validated.mealEntryId)
      .eq('profile_id', profile.id)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Get feedback summary for a meal entry
// ---------------------------------------------------------------------------

export async function getMealFeedbackSummary(mealEntryId: string): Promise<MealFeedbackSummary> {
  const db: any = createServerClient({ admin: true })

  const { data: feedbacks } = await db
    .from('hub_meal_feedback')
    .select('*, profile:hub_guest_profiles(display_name)')
    .eq('meal_entry_id', mealEntryId)

  const items = feedbacks ?? []

  const summary: MealFeedbackSummary = {
    loved: 0,
    liked: 0,
    neutral: 0,
    disliked: 0,
    total: items.length,
    notes: [],
  }

  for (const fb of items) {
    const reaction = fb.reaction as MealReaction
    summary[reaction]++
    if (fb.note) {
      summary.notes.push({
        profile_name: fb.profile?.display_name ?? 'Someone',
        note: fb.note,
        reaction,
      })
    }
  }

  return summary
}

// ---------------------------------------------------------------------------
// Get feedback for multiple meal entries at once (batch)
// ---------------------------------------------------------------------------

export async function getBatchMealFeedback(input: {
  mealEntryIds: string[]
  profileToken?: string | null
}): Promise<Record<string, { summary: MealFeedbackSummary; myReaction: MealReaction | null }>> {
  if (input.mealEntryIds.length === 0) return {}

  const db: any = createServerClient({ admin: true })

  // Resolve current profile if token provided
  let myProfileId: string | null = null
  if (input.profileToken) {
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('profile_token', input.profileToken)
      .single()
    if (profile) myProfileId = profile.id
  }

  // Fetch all feedback for the given entries
  const { data: feedbacks } = await db
    .from('hub_meal_feedback')
    .select('*, profile:hub_guest_profiles(display_name)')
    .in('meal_entry_id', input.mealEntryIds)

  const items = feedbacks ?? []

  // Group by meal_entry_id
  const result: Record<string, { summary: MealFeedbackSummary; myReaction: MealReaction | null }> =
    {}

  for (const entryId of input.mealEntryIds) {
    result[entryId] = {
      summary: { loved: 0, liked: 0, neutral: 0, disliked: 0, total: 0, notes: [] },
      myReaction: null,
    }
  }

  for (const fb of items) {
    const entryId = fb.meal_entry_id
    if (!result[entryId]) continue

    const reaction = fb.reaction as MealReaction
    result[entryId].summary[reaction]++
    result[entryId].summary.total++

    if (fb.note) {
      result[entryId].summary.notes.push({
        profile_name: fb.profile?.display_name ?? 'Someone',
        note: fb.note,
        reaction,
      })
    }

    if (myProfileId && fb.profile_id === myProfileId) {
      result[entryId].myReaction = reaction
    }
  }

  return result
}
