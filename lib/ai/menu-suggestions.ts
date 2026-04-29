'use server'

// Compatibility wrapper for older imports.
// Menu planning may only search the chef's saved recipe book. It must not ask AI to invent dishes.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getRecipeBookMenuSuggestions } from '@/lib/menus/recipe-book-suggestions-actions'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type MenuSuggestionContext = {
  sceneType?: string
  cuisineType?: string
  serviceStyle?: string
  guestCount?: number
  season?: string
  notes?: string
  allergies?: string[] | string
}

export async function getAIMenuSuggestions(eventId: string) {
  const user = await requireChef()
  if (!UUID_PATTERN.test(eventId)) {
    throw new Error('Invalid event id')
  }

  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select('occasion, guest_count, dietary_restrictions, allergies, special_requests')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !event) {
    console.error('[menu-suggestions] Event lookup failed:', error)
    throw new Error('Event not found')
  }

  const notes = [
    event.special_requests ? `Special requests: ${event.special_requests}` : null,
    Array.isArray(event.dietary_restrictions) && event.dietary_restrictions.length > 0
      ? `Dietary restrictions: ${event.dietary_restrictions.join(', ')}`
      : null,
    Array.isArray(event.allergies) && event.allergies.length > 0
      ? `Allergies: ${event.allergies.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  return getRecipeBookMenuSuggestions({
    sceneType: event.occasion || undefined,
    guestCount: event.guest_count || undefined,
    notes: notes || undefined,
    allergies: Array.isArray(event.allergies) ? event.allergies : undefined,
  })
}

export async function getAIMenuSuggestionsFromContext(ctx: MenuSuggestionContext) {
  return getRecipeBookMenuSuggestions(ctx)
}
