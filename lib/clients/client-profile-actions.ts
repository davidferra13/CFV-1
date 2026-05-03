// Client Self-Service Profile Actions
// Clients can view and update their own profile information

'use server'

import { requireClient, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import { FUN_QA_QUESTIONS, type FunQAKey, type FunQAAnswers } from './fun-qa-constants'

// Re-export for any server-side consumers that previously imported from here.
// Client components should import directly from '@/lib/clients/fun-qa-constants'.
export type { FunQAKey, FunQAAnswers } from './fun-qa-constants'

const UpdateClientProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  preferred_name: z.string().nullable().optional(),
  partner_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  dietary_protocols: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).nullable().optional(),
  favorite_cuisines: z.array(z.string()).optional(),
  favorite_dishes: z.array(z.string()).optional(),
  wine_beverage_preferences: z.string().nullable().optional(),
  parking_instructions: z.string().nullable().optional(),
  access_instructions: z.string().nullable().optional(),
  kitchen_size: z.string().nullable().optional(),
  kitchen_constraints: z.string().nullable().optional(),
  house_rules: z.string().nullable().optional(),
  equipment_available: z.array(z.string()).optional(),
  children: z.array(z.string()).optional(),
  family_notes: z.string().nullable().optional(),
})

export type UpdateClientProfileInput = z.infer<typeof UpdateClientProfileSchema>

const CreateMealRequestSchema = z.object({
  request_type: z.enum(['repeat_dish', 'new_idea', 'avoid_dish']),
  dish_name: z.string().min(1, 'Dish is required').max(200),
  notes: z.string().max(2000).optional(),
  requested_for_week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
})

const WithdrawMealRequestSchema = z.object({
  request_id: z.string().uuid(),
})
const RespondRecurringRecommendationSchema = z.object({
  recommendation_id: z.string().uuid(),
  decision: z.enum(['approved', 'revision_requested']),
  notes: z.string().max(2000).optional(),
})
const UpdateServedDishFeedbackSchema = z.object({
  history_id: z.string().uuid(),
  client_reaction: z.enum(['loved', 'liked', 'neutral', 'disliked']),
  notes: z.string().max(2000).optional(),
})
const UpdateMyMealFavoritesSchema = z.object({
  favorite_dishes: z.array(z.string().max(100)).max(50).optional(),
  favorite_cuisines: z.array(z.string().max(100)).max(25).optional(),
})

export type CreateMealRequestInput = z.infer<typeof CreateMealRequestSchema>
export type UpdateMyMealFavoritesInput = z.infer<typeof UpdateMyMealFavoritesSchema>
export type ServedDishHistoryEntry = {
  id: string
  dish_name: string
  served_date: string
  client_reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | null
  notes: string | null
}

export type ClientMealRequestEntry = {
  id: string
  request_type: 'repeat_dish' | 'new_idea' | 'avoid_dish'
  dish_name: string
  notes: string | null
  priority: 'low' | 'normal' | 'high'
  status: 'requested' | 'reviewed' | 'scheduled' | 'fulfilled' | 'declined' | 'withdrawn'
  requested_for_week_start: string | null
  created_at: string
  reviewed_at: string | null
}
export type RecurringRecommendationEntry = {
  id: string
  week_start: string | null
  recommendation_text: string
  status: 'sent' | 'approved' | 'revision_requested'
  client_response_notes: string | null
  sent_at: string
  responded_at: string | null
}
export type ClientFavoritesSnapshot = {
  favoriteDishes: string[]
  favoriteCuisines: string[]
}

function normalizeClientPreferenceList(values: string[] | undefined, maxItems: number): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values ?? []) {
    const trimmed = value.trim().replace(/\s+/g, ' ')
    if (!trimmed) continue

    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    normalized.push(trimmed)

    if (normalized.length >= maxItems) break
  }

  return normalized
}

function serializePreferenceList(values: string[] | null | undefined): string {
  return JSON.stringify(normalizeClientPreferenceList(values ?? [], 500))
}

/**
 * Get the current client's own profile
 */
export async function getMyProfile() {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: profile, error } = await db
    .from('clients')
    .select(
      `
      id, email, full_name, preferred_name, partner_name, phone, address,
      dietary_restrictions, dietary_protocols, allergies, dislikes, spice_tolerance,
      favorite_cuisines, favorite_dishes, wine_beverage_preferences,
      parking_instructions, access_instructions,
      kitchen_size, kitchen_constraints, house_rules, equipment_available,
      children, family_notes,
      loyalty_tier, loyalty_points, status
    `
    )
    .eq('id', user.entityId)
    .single()

  if (error) {
    console.error('[getMyProfile] Error:', error)
    throw new Error('Failed to fetch profile')
  }

  return profile
}

/**
 * Client updates their own profile
 */
export async function updateMyProfile(input: UpdateClientProfileInput) {
  const user = await requireClient()
  const validated = UpdateClientProfileSchema.parse(input)
  const db: any = createServerClient()

  // Convert empty strings to null for optional text fields
  const cleanedData = {
    ...validated,
    preferred_name: validated.preferred_name || null,
    partner_name: validated.partner_name || null,
    phone: validated.phone || null,
    address: validated.address || null,
    spice_tolerance: validated.spice_tolerance || null,
    wine_beverage_preferences: validated.wine_beverage_preferences || null,
    parking_instructions: validated.parking_instructions || null,
    access_instructions: validated.access_instructions || null,
    kitchen_size: validated.kitchen_size || null,
    kitchen_constraints: validated.kitchen_constraints || null,
    house_rules: validated.house_rules || null,
    family_notes: validated.family_notes || null,
    favorite_cuisines: normalizeClientPreferenceList(validated.favorite_cuisines, 25),
    favorite_dishes: normalizeClientPreferenceList(validated.favorite_dishes, 50),
  }

  // Fetch current profile to detect allergy/dietary changes (food safety)
  const { data: oldProfile } = await db
    .from('clients')
    .select(
      'allergies, dietary_restrictions, favorite_dishes, favorite_cuisines, tenant_id, email, phone, full_name'
    )
    .eq('id', user.entityId)
    .single()

  const { error } = await db.from('clients').update(cleanedData).eq('id', user.entityId)

  if (error) {
    console.error('[updateMyProfile] Error:', error)
    throw new Error('Failed to update profile')
  }

  revalidatePath('/my-profile')
  revalidatePath('/my-events')

  // Chef-side cache
  revalidatePath(`/clients/${user.entityId}`)
  revalidatePath('/clients/preferences')
  revalidatePath('/clients/preferences/favorite-dishes')

  // Non-blocking: notify chef if allergy or dietary fields changed (food safety)
  try {
    if (oldProfile) {
      const oldAllergies = JSON.stringify(oldProfile.allergies ?? [])
      const newAllergies = JSON.stringify(validated.allergies ?? [])
      const oldDietary = JSON.stringify(oldProfile.dietary_restrictions ?? [])
      const newDietary = JSON.stringify(validated.dietary_restrictions ?? [])

      if (oldAllergies !== newAllergies || oldDietary !== newDietary) {
        const chefAuthId = await getChefAuthUserId(oldProfile.tenant_id)
        if (chefAuthId) {
          const changes: string[] = []
          if (oldAllergies !== newAllergies)
            changes.push(`Allergies: ${(validated.allergies ?? []).join(', ') || 'none'}`)
          if (oldDietary !== newDietary)
            changes.push(`Dietary: ${(validated.dietary_restrictions ?? []).join(', ') || 'none'}`)

          await createNotification({
            tenantId: oldProfile.tenant_id,
            recipientId: chefAuthId,
            category: 'client',
            action: 'client_allergy_changed',
            title: `${validated.full_name} updated dietary info`,
            body: changes.join('; '),
            clientId: user.entityId,
          })
        }

        // SAFETY: Sync flat array -> structured allergy records so readiness
        // gates and menu allergen checks see the updated data
        try {
          if (oldAllergies !== newAllergies) {
            const { syncFlatToStructured } = await import('@/lib/dietary/allergy-sync')
            await syncFlatToStructured({
              tenantId: oldProfile.tenant_id,
              clientId: user.entityId,
              db,
            })
          }
        } catch (syncErr) {
          console.error('[updateMyProfile] Allergy sync failed (non-blocking):', syncErr)
        }

        // SAFETY: Log dietary changes for chef audit trail
        try {
          const { logDietaryChangeInternal } = await import('@/lib/clients/dietary-alert-actions')
          if (oldAllergies !== newAllergies) {
            const changeType =
              (validated.allergies ?? []).length > (oldProfile.allergies ?? []).length
                ? 'allergy_added'
                : 'allergy_removed'
            await logDietaryChangeInternal(
              oldProfile.tenant_id,
              user.entityId,
              changeType,
              'allergies',
              (oldProfile.allergies ?? []).join(', ') || null,
              (validated.allergies ?? []).join(', ') || null
            )
          }
          if (oldDietary !== newDietary) {
            const changeType =
              (validated.dietary_restrictions ?? []).length >
              (oldProfile.dietary_restrictions ?? []).length
                ? 'restriction_added'
                : 'restriction_removed'
            await logDietaryChangeInternal(
              oldProfile.tenant_id,
              user.entityId,
              changeType,
              'dietary_restrictions',
              (oldProfile.dietary_restrictions ?? []).join(', ') || null,
              (validated.dietary_restrictions ?? []).join(', ') || null
            )
          }
        } catch (logErr) {
          console.error('[updateMyProfile] Dietary change log failed (non-blocking):', logErr)
        }

        // SAFETY: Recheck upcoming event menus for allergen conflicts
        try {
          const { recheckUpcomingMenusForClient } = await import('@/lib/dietary/menu-recheck')
          await recheckUpcomingMenusForClient({
            tenantId: oldProfile.tenant_id,
            clientId: user.entityId,
            db,
          })
        } catch (recheckErr) {
          console.error('[updateMyProfile] Menu recheck failed (non-blocking):', recheckErr)
        }

        // SAFETY: Propagate allergy/dietary changes to active events
        try {
          const activeStatuses = ['accepted', 'paid', 'confirmed', 'in_progress']
          const propagateFields: Record<string, unknown> = {}
          if (oldAllergies !== newAllergies) {
            propagateFields.allergies = validated.allergies ?? []
          }
          if (oldDietary !== newDietary) {
            propagateFields.dietary_restrictions = validated.dietary_restrictions ?? []
          }
          await db
            .from('events')
            .update(propagateFields)
            .eq('client_id', user.entityId)
            .eq('tenant_id', oldProfile.tenant_id)
            .in('status', activeStatuses)
        } catch (propErr) {
          console.error('[updateMyProfile] Event propagation failed (non-blocking):', propErr)
        }
      }

      const oldFavoriteDishes = serializePreferenceList(
        oldProfile.favorite_dishes as string[] | null
      )
      const newFavoriteDishes = serializePreferenceList(cleanedData.favorite_dishes)
      const oldFavoriteCuisines = serializePreferenceList(
        oldProfile.favorite_cuisines as string[] | null
      )
      const newFavoriteCuisines = serializePreferenceList(cleanedData.favorite_cuisines)

      if (oldFavoriteDishes !== newFavoriteDishes || oldFavoriteCuisines !== newFavoriteCuisines) {
        const chefAuthId = await getChefAuthUserId(oldProfile.tenant_id)
        if (chefAuthId) {
          const favoritesSummary: string[] = []
          if (oldFavoriteDishes !== newFavoriteDishes) {
            favoritesSummary.push(
              cleanedData.favorite_dishes.length > 0
                ? `Favorite dishes: ${cleanedData.favorite_dishes.slice(0, 6).join(', ')}`
                : 'Favorite dishes cleared'
            )
          }
          if (oldFavoriteCuisines !== newFavoriteCuisines) {
            favoritesSummary.push(
              cleanedData.favorite_cuisines.length > 0
                ? `Favorite cuisines: ${cleanedData.favorite_cuisines.slice(0, 6).join(', ')}`
                : 'Favorite cuisines cleared'
            )
          }

          await createNotification({
            tenantId: oldProfile.tenant_id,
            recipientId: chefAuthId,
            category: 'event',
            action: 'menu_preferences_submitted',
            title: `${validated.full_name} updated favorites`,
            body: favoritesSummary.join('; '),
            clientId: user.entityId,
            actionUrl: `/clients/${user.entityId}`,
            metadata: {
              favoriteDishes: cleanedData.favorite_dishes,
              favoriteCuisines: cleanedData.favorite_cuisines,
            },
          })
        }
      }
    }
  } catch (err) {
    console.error('[updateMyProfile] Non-blocking preference notification failed:', err)
  }

  // Loyalty trigger: profile completion (non-blocking)
  // Profile is "complete" when full_name + email + phone are all populated
  try {
    const hasName = !!validated.full_name?.trim()
    const hasPhone = !!validated.phone?.trim()
    const hasEmail = !!(oldProfile?.email as string)?.trim()
    if (hasName && hasPhone && hasEmail && oldProfile?.tenant_id) {
      const { fireTrigger } = await import('@/lib/loyalty/triggers')
      await fireTrigger('profile_completed', oldProfile.tenant_id, user.entityId, {
        description: 'Profile completed',
      })
    }
  } catch (err) {
    console.error('[updateMyProfile] Loyalty trigger failed (non-blocking):', err)
  }

  return { success: true }
}

/**
 * Client: fetch their served dish history + submitted meal requests
 */
export async function getMyMealCollaborationData() {
  const user = await requireClient()
  const db: any = createServerClient()

  const [
    { data: history, error: historyError },
    { data: requests, error: requestsError },
    { data: recommendations, error: recommendationsError },
    { data: favorites, error: favoritesError },
  ] = await Promise.all([
    db
      .from('served_dish_history')
      .select('id, dish_name, served_date, client_reaction, notes')
      .eq('client_id', user.entityId)
      .order('served_date', { ascending: false })
      .limit(1000),
    db
      .from('client_meal_requests')
      .select(
        'id, request_type, dish_name, notes, priority, status, requested_for_week_start, created_at, reviewed_at'
      )
      .eq('client_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(120),
    db
      .from('recurring_menu_recommendations')
      .select(
        'id, week_start, recommendation_text, status, client_response_notes, sent_at, responded_at'
      )
      .eq('client_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('clients')
      .select('favorite_dishes, favorite_cuisines')
      .eq('id', user.entityId)
      .single(),
  ])

  if (historyError) {
    console.error('[getMyMealCollaborationData] History error:', historyError)
  }
  if (requestsError) {
    console.error('[getMyMealCollaborationData] Requests error:', requestsError)
  }
  if (recommendationsError) {
    console.error('[getMyMealCollaborationData] Recommendations error:', recommendationsError)
  }
  if (favoritesError) {
    console.error('[getMyMealCollaborationData] Favorites error:', favoritesError)
  }

  return {
    history: (history ?? []) as ServedDishHistoryEntry[],
    requests: (requests ?? []) as ClientMealRequestEntry[],
    recommendations: (recommendations ?? []) as RecurringRecommendationEntry[],
    favorites: {
      favoriteDishes: normalizeClientPreferenceList(
        ((favorites as any)?.favorite_dishes as string[] | null) ?? [],
        50
      ),
      favoriteCuisines: normalizeClientPreferenceList(
        ((favorites as any)?.favorite_cuisines as string[] | null) ?? [],
        25
      ),
    } satisfies ClientFavoritesSnapshot,
  }
}

/**
 * Client: update explicit meal favorites.
 * Favorites are positive planning signals and never override allergies/dislikes.
 */
export async function updateMyMealFavorites(input: UpdateMyMealFavoritesInput) {
  const user = await requireClient()
  const validated = UpdateMyMealFavoritesSchema.parse(input)
  const db: any = createServerClient()

  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id, tenant_id, full_name, favorite_dishes, favorite_cuisines')
    .eq('id', user.entityId)
    .single()

  if (clientError || !client) {
    console.error('[updateMyMealFavorites] Client lookup error:', clientError)
    throw new Error('Failed to resolve your profile')
  }

  const previousFavoriteDishes = normalizeClientPreferenceList(
    (client.favorite_dishes as string[] | null) ?? [],
    50
  )
  const previousFavoriteCuisines = normalizeClientPreferenceList(
    (client.favorite_cuisines as string[] | null) ?? [],
    25
  )
  const nextFavoriteDishes =
    validated.favorite_dishes === undefined
      ? previousFavoriteDishes
      : normalizeClientPreferenceList(validated.favorite_dishes, 50)
  const nextFavoriteCuisines =
    validated.favorite_cuisines === undefined
      ? previousFavoriteCuisines
      : normalizeClientPreferenceList(validated.favorite_cuisines, 25)

  const dishChanged =
    serializePreferenceList(previousFavoriteDishes) !== serializePreferenceList(nextFavoriteDishes)
  const cuisineChanged =
    serializePreferenceList(previousFavoriteCuisines) !==
    serializePreferenceList(nextFavoriteCuisines)

  if (!dishChanged && !cuisineChanged) {
    return {
      success: true,
      favorites: {
        favoriteDishes: previousFavoriteDishes,
        favoriteCuisines: previousFavoriteCuisines,
      } satisfies ClientFavoritesSnapshot,
    }
  }

  const { error } = await db
    .from('clients')
    .update({
      favorite_dishes: nextFavoriteDishes,
      favorite_cuisines: nextFavoriteCuisines,
    })
    .eq('id', user.entityId)

  if (error) {
    console.error('[updateMyMealFavorites] Error:', error)
    throw new Error('Could not update favorites')
  }

  revalidatePath('/my-profile')
  revalidatePath('/clients/preferences')
  revalidatePath('/clients/preferences/favorite-dishes')
  revalidatePath(`/clients/${user.entityId}`)
  revalidatePath(`/clients/${user.entityId}/recurring`)

  try {
    const chefAuthId = await getChefAuthUserId(client.tenant_id)
    if (chefAuthId) {
      const summaryParts: string[] = []
      if (dishChanged) {
        summaryParts.push(
          nextFavoriteDishes.length > 0
            ? `Favorite dishes: ${nextFavoriteDishes.slice(0, 6).join(', ')}`
            : 'Favorite dishes cleared'
        )
      }
      if (cuisineChanged) {
        summaryParts.push(
          nextFavoriteCuisines.length > 0
            ? `Favorite cuisines: ${nextFavoriteCuisines.slice(0, 6).join(', ')}`
            : 'Favorite cuisines cleared'
        )
      }

      await createNotification({
        tenantId: client.tenant_id,
        recipientId: chefAuthId,
        category: 'event',
        action: 'menu_preferences_submitted',
        title: `${client.full_name} updated favorites`,
        body: summaryParts.join('; '),
        clientId: client.id,
        actionUrl: `/clients/${client.id}`,
        metadata: {
          favoriteDishes: nextFavoriteDishes,
          favoriteCuisines: nextFavoriteCuisines,
        },
      })
    }
  } catch (notifyErr) {
    console.error('[updateMyMealFavorites] Notification failed (non-blocking):', notifyErr)
  }

  return {
    success: true,
    favorites: {
      favoriteDishes: nextFavoriteDishes,
      favoriteCuisines: nextFavoriteCuisines,
    } satisfies ClientFavoritesSnapshot,
  }
}

/**
 * Client: submit a meal request (repeat, new idea, avoid)
 */
export async function createMyMealRequest(input: CreateMealRequestInput) {
  const user = await requireClient()
  const validated = CreateMealRequestSchema.parse(input)
  const db: any = createServerClient()

  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id, tenant_id, full_name')
    .eq('id', user.entityId)
    .single()

  if (clientError || !client) {
    console.error('[createMyMealRequest] Client lookup error:', clientError)
    throw new Error('Failed to resolve your profile')
  }

  const { data: inserted, error } = await db
    .from('client_meal_requests')
    .insert({
      tenant_id: client.tenant_id,
      client_id: client.id,
      request_type: validated.request_type,
      dish_name: validated.dish_name.trim(),
      notes: validated.notes?.trim() || null,
      requested_for_week_start: validated.requested_for_week_start ?? null,
      priority: validated.priority,
      status: 'requested',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createMyMealRequest] Insert error:', error)
    throw new Error('Failed to submit your request')
  }

  revalidatePath('/my-profile')
  revalidatePath('/clients/recurring')
  revalidatePath(`/clients/${client.id}`)
  revalidatePath(`/clients/${client.id}/recurring`)

  // Non-blocking chef notification
  try {
    const chefAuthId = await getChefAuthUserId(client.tenant_id)
    if (chefAuthId) {
      const actionLabel: Record<string, string> = {
        repeat_dish: 'requested a repeat dish',
        new_idea: 'submitted a new dish idea',
        avoid_dish: 'asked to avoid a dish',
      }
      await createNotification({
        tenantId: client.tenant_id,
        recipientId: chefAuthId,
        category: 'event',
        action: 'menu_preferences_submitted',
        title: `${client.full_name} updated recurring menu preferences`,
        body: `${client.full_name} ${actionLabel[validated.request_type]}: ${validated.dish_name.trim()}`,
        clientId: client.id,
        actionUrl: `/clients/${client.id}/recurring`,
        metadata: {
          requestType: validated.request_type,
          priority: validated.priority,
          requestedForWeekStart: validated.requested_for_week_start ?? null,
        },
      })
    }
  } catch (notifyErr) {
    console.error('[createMyMealRequest] Non-blocking notification failed:', notifyErr)
  }

  return { success: true, requestId: inserted?.id ?? null }
}

/**
 * Client: withdraw a pending meal request
 */
export async function withdrawMyMealRequest(request_id: string) {
  const user = await requireClient()
  const validated = WithdrawMealRequestSchema.parse({ request_id })
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_meal_requests')
    .update({ status: 'withdrawn' })
    .eq('id', validated.request_id)
    .eq('client_id', user.entityId)
    .eq('status', 'requested')
    .select('id')
    .single()

  if (error || !data) {
    console.error('[withdrawMyMealRequest] Error:', error)
    throw new Error('Unable to withdraw this request')
  }

  revalidatePath('/my-profile')
  revalidatePath('/clients/recurring')
  return { success: true }
}

/**
 * Client: respond to a chef's recurring recommendation (approve/request changes)
 */
export async function respondToMyRecurringRecommendation(input: {
  recommendation_id: string
  decision: 'approved' | 'revision_requested'
  notes?: string
}) {
  const user = await requireClient()
  const validated = RespondRecurringRecommendationSchema.parse(input)
  const db: any = createServerClient()

  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id, full_name, tenant_id')
    .eq('id', user.entityId)
    .single()

  if (clientError || !client) {
    throw new Error('Unable to resolve your account')
  }

  const { data: updated, error } = await db
    .from('recurring_menu_recommendations')
    .update({
      status: validated.decision,
      client_response_notes: validated.notes?.trim() || null,
      responded_at: new Date().toISOString(),
      responded_by: user.id,
    })
    .eq('id', validated.recommendation_id)
    .eq('client_id', user.entityId)
    .eq('status', 'sent')
    .select('id, week_start')
    .single()

  if (error || !updated) {
    console.error('[respondToMyRecurringRecommendation] Error:', error)
    throw new Error('Unable to submit your response')
  }

  try {
    const chefAuthId = await getChefAuthUserId(client.tenant_id)
    if (chefAuthId) {
      await createNotification({
        tenantId: client.tenant_id,
        recipientId: chefAuthId,
        category: 'event',
        action:
          validated.decision === 'approved'
            ? 'meal_recommendation_approved'
            : 'meal_recommendation_revision_requested',
        title:
          validated.decision === 'approved'
            ? `${client.full_name} approved your weekly recommendation`
            : `${client.full_name} requested recommendation revisions`,
        body: validated.notes?.trim() || undefined,
        clientId: client.id,
        actionUrl: `/clients/${client.id}/recurring`,
        metadata: {
          recommendationId: updated.id,
          decision: validated.decision,
          weekStart: updated.week_start ?? null,
        },
      })
    }
  } catch (notifyErr) {
    console.error(
      '[respondToMyRecurringRecommendation] Notification failed (non-blocking):',
      notifyErr
    )
  }

  revalidatePath('/my-profile')
  revalidatePath('/clients/recurring')
  revalidatePath(`/clients/${client.id}/recurring`)
  return { success: true }
}

/**
 * Client: submit post-meal reaction feedback directly from served history
 */
export async function updateMyServedDishFeedback(input: {
  history_id: string
  client_reaction: 'loved' | 'liked' | 'neutral' | 'disliked'
  notes?: string
}) {
  const user = await requireClient()
  const validated = UpdateServedDishFeedbackSchema.parse(input)
  const db: any = createServerClient()

  const updatePayload: Record<string, unknown> = {
    client_reaction: validated.client_reaction,
    client_feedback_at: new Date().toISOString(),
  }
  if (typeof validated.notes === 'string') {
    updatePayload.notes = validated.notes.trim() || null
  }

  const { data, error } = await db
    .from('served_dish_history')
    .update(updatePayload)
    .eq('id', validated.history_id)
    .eq('client_id', user.entityId)
    .select('id, dish_name, client_id')
    .single()

  if (error || !data) {
    console.error('[updateMyServedDishFeedback] Error:', error)
    throw new Error('Could not save meal feedback')
  }

  try {
    const { data: client } = await db
      .from('clients')
      .select('id, tenant_id, full_name')
      .eq('id', user.entityId)
      .single()
    if (client?.tenant_id) {
      const chefAuthId = await getChefAuthUserId(client.tenant_id)
      if (chefAuthId) {
        await createNotification({
          tenantId: client.tenant_id,
          recipientId: chefAuthId,
          category: 'client',
          action: 'client_meal_feedback_submitted',
          title: `${client.full_name} shared meal feedback`,
          body: `${data.dish_name}: ${validated.client_reaction}`,
          clientId: client.id,
          actionUrl: `/clients/${client.id}/recurring`,
          metadata: {
            historyId: data.id,
            dishName: data.dish_name,
            reaction: validated.client_reaction,
          },
        })
      }
    }
  } catch (notifyErr) {
    console.error('[updateMyServedDishFeedback] Notification failed (non-blocking):', notifyErr)
  }

  // Loyalty trigger: meal feedback (non-blocking)
  try {
    const { data: feedbackClient } = await db
      .from('clients')
      .select('tenant_id')
      .eq('id', user.entityId)
      .single()
    if (feedbackClient?.tenant_id) {
      const { fireTrigger } = await import('@/lib/loyalty/triggers')
      await fireTrigger('meal_feedback_given', feedbackClient.tenant_id, user.entityId, {
        description: `Meal feedback: ${validated.client_reaction}`,
      })
    }
  } catch (err) {
    console.error('[updateMyServedDishFeedback] Loyalty trigger failed (non-blocking):', err)
  }

  revalidatePath('/my-profile')
  revalidatePath('/clients/recurring')
  revalidatePath(`/clients/${user.entityId}/recurring`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Fun Q&A actions
// ---------------------------------------------------------------------------

/**
 * Client: fetch their own fun Q&A answers
 */
export async function getMyFunQA(): Promise<FunQAAnswers> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .select('fun_qa_answers')
    .eq('id', user.entityId)
    .single()

  if (error) {
    console.error('[getMyFunQA] Error:', error)
    return {}
  }

  return ((data as any)?.fun_qa_answers as FunQAAnswers) ?? {}
}

/**
 * Client: save their fun Q&A answers (full replace of the JSONB object)
 */
export async function updateMyFunQA(answers: FunQAAnswers) {
  const user = await requireClient()
  const db: any = createServerClient()

  // Strip blank strings so the object stays clean
  const cleaned: FunQAAnswers = {}
  for (const [k, v] of Object.entries(answers)) {
    if (v && v.trim()) cleaned[k as FunQAKey] = v.trim()
  }

  const { error } = await db
    .from('clients')
    .update({ fun_qa_answers: cleaned } as any)
    .eq('id', user.entityId)

  if (error) {
    console.error('[updateMyFunQA] Error:', error)
    throw new Error('Failed to save answers')
  }

  // Loyalty trigger: fun Q&A completed (non-blocking)
  try {
    if (Object.keys(cleaned).length > 0) {
      const { data: client } = await db
        .from('clients')
        .select('tenant_id')
        .eq('id', user.entityId)
        .single()
      if (client?.tenant_id) {
        const { fireTrigger } = await import('@/lib/loyalty/triggers')
        await fireTrigger('fun_qa_completed', client.tenant_id, user.entityId, {
          description: 'Fun Q&A answered',
        })
      }
    }
  } catch (err) {
    console.error('[updateMyFunQA] Loyalty trigger failed (non-blocking):', err)
  }

  revalidatePath('/my-profile')
  return { success: true }
}

/**
 * Chef: read a client's fun Q&A answers (read-only, tenant-scoped)
 */
export async function getClientFunQA(clientId: string): Promise<FunQAAnswers> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .select('fun_qa_answers')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getClientFunQA] Error:', error)
    return {}
  }

  return ((data as any)?.fun_qa_answers as FunQAAnswers) ?? {}
}

/**
 * Chef-facing: load CP-Engine profile guidance for a client.
 * Fails closed: returns null if tables missing or no data.
 */
export async function getClientCulinaryProfileGuidance(clientId: string) {
  const user = await requireChef()
  try {
    const { getClientProfileVectorForTenant } = await import('@/lib/clients/client-profile-service')
    const { buildProposalProfileGuidance } =
      await import('@/lib/clients/client-profile-chef-workflow')
    const vector = await getClientProfileVectorForTenant(clientId, user.tenantId!)
    if (!vector) return null
    return buildProposalProfileGuidance(vector)
  } catch (err) {
    console.error('[getClientCulinaryProfileGuidance] Failed (fail-closed):', err)
    return null
  }
}
