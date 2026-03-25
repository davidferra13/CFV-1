// Menu Preferences - Client-facing server actions
// Allows clients to submit a "menu brief" before the chef builds the menu.
// Stores cuisine preferences, dietary notes, loves/hates, and selection mode.

'use server'

import { requireAuth, requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'

// ============================================
// SCHEMAS
// ============================================

const SubmitPreferencesSchema = z.object({
  eventId: z.string().uuid(),
  cuisinePreferences: z.array(z.string()).default([]),
  serviceStylePref: z.string().optional(),
  foodsLove: z.string().optional(),
  foodsAvoid: z.string().optional(),
  specialRequests: z.string().optional(),
  adventurousness: z.enum(['classic', 'balanced', 'adventurous']).default('balanced'),
  selectionMode: z.enum(['picked', 'customized', 'custom_request', 'exact_request', 'surprise_me']),
  selectedMenuId: z.string().uuid().optional(),
  customizationNotes: z.string().optional(),
})

export type SubmitPreferencesInput = z.infer<typeof SubmitPreferencesSchema>

// ============================================
// CLIENT ACTIONS
// ============================================

/**
 * Submit menu preferences for an event.
 * Upserts - if preferences already exist for this event, they're replaced.
 */
export async function submitMenuPreferences(input: SubmitPreferencesInput) {
  const user = await requireClient()
  const validated = SubmitPreferencesSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify client owns this event
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, occasion')
    .eq('id', validated.eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) throw new Error('Event not found')

  const now = new Date().toISOString()

  // Upsert preferences (unique on event_id)
  const { error } = await supabase.from('menu_preferences').upsert(
    {
      event_id: validated.eventId,
      client_id: user.id,
      tenant_id: event.tenant_id,
      cuisine_preferences: validated.cuisinePreferences,
      service_style_pref: validated.serviceStylePref || null,
      foods_love: validated.foodsLove || null,
      foods_avoid: validated.foodsAvoid || null,
      special_requests: validated.specialRequests || null,
      adventurousness: validated.adventurousness,
      selection_mode: validated.selectionMode,
      selected_menu_id: validated.selectedMenuId || null,
      customization_notes: validated.customizationNotes || null,
      submitted_at: now,
    },
    { onConflict: 'event_id' }
  )

  if (error) {
    console.error('[submitMenuPreferences] Error:', error)
    throw new Error('Failed to save menu preferences')
  }

  revalidatePath(`/my-events/${validated.eventId}`)
  revalidatePath(`/events/${validated.eventId}`)

  // Non-blocking: notify chef
  try {
    const chefAuthId = await getChefAuthUserId(event.tenant_id)
    if (chefAuthId) {
      const modeLabel: Record<string, string> = {
        picked: 'picked a showcase menu',
        customized: 'wants to customize a menu',
        custom_request: 'submitted menu preferences',
        exact_request: 'knows exactly what they want',
        surprise_me: 'wants to be surprised',
      }
      await createNotification({
        tenantId: event.tenant_id,
        recipientId: chefAuthId,
        category: 'event',
        action: 'menu_preferences_submitted',
        title: 'Menu preferences received',
        body: `Your client ${modeLabel[validated.selectionMode] ?? 'submitted preferences'} for ${event.occasion ?? 'their event'}`,
        eventId: validated.eventId,
      })
    }
  } catch (err) {
    console.error('[submitMenuPreferences] Non-blocking notification failed:', err)
  }

  return { success: true }
}

// ============================================
// READ ACTIONS (both roles)
// ============================================

/**
 * Get menu preferences for an event.
 * Works for both chefs (tenant scope) and clients (client scope - RLS handles it).
 */
export async function getMenuPreferences(eventId: string) {
  await requireAuth()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_preferences')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error('[getMenuPreferences] Error:', error)
    return null
  }

  return data
}

/**
 * Mark preferences as viewed by the chef.
 */
export async function markPreferencesViewed(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('menu_preferences')
    .update({ chef_viewed_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('chef_viewed_at', null)

  revalidatePath(`/events/${eventId}`)
}
