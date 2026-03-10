'use server'

// Service Style Actions - apply templates to events, get recommendations.
// All deterministic (Formula > AI). No Ollama, no external calls.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  SERVICE_STYLE_TEMPLATES,
  getServiceStyleTemplate,
  calculateStaffing,
  recommendServiceStyle,
  type ServiceStyleId,
  type ServiceStyleTemplate,
} from './service-style-templates'

/**
 * Get all built-in service style templates.
 */
export async function getServiceStyleTemplates(): Promise<ServiceStyleTemplate[]> {
  // Auth check to keep consistent with other actions
  await requireChef()
  return SERVICE_STYLE_TEMPLATES
}

/**
 * Apply a service style template to an event.
 * Sets service_style on the event. Returns staffing recommendations.
 */
export async function applyServiceStyleToEvent(
  eventId: string,
  styleId: ServiceStyleId
): Promise<{
  success: boolean
  error?: string
  staffing?: { servers: number; kitchenStaff: number; totalStaff: number }
  equipment?: string[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const template = getServiceStyleTemplate(styleId)
  if (!template) {
    return { success: false, error: 'Unknown service style' }
  }

  // Verify the event belongs to this tenant
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !event) {
    return { success: false, error: 'Event not found' }
  }

  // Map template ID to the database enum value
  const dbStyleMap: Record<ServiceStyleId, string> = {
    plated_dinner: 'plated',
    buffet: 'buffet',
    family_style: 'family_style',
    cocktail_reception: 'cocktail',
    stations: 'other',
    drop_off: 'other',
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({ service_style: dbStyleMap[styleId] })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    return { success: false, error: 'Failed to update event service style' }
  }

  const staffing = calculateStaffing(event.guest_count, template.staffRatio)

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')

  return {
    success: true,
    staffing,
    equipment: template.suggestedEquipment,
  }
}

/**
 * Get a service style recommendation for a given guest count.
 * Pure deterministic logic.
 */
export async function getServiceStyleRecommendation(guestCount: number): Promise<{
  recommended: ServiceStyleTemplate
  allStyles: (ServiceStyleTemplate & {
    staffing: { servers: number; kitchenStaff: number; totalStaff: number }
    fitsGuestCount: boolean
  })[]
}> {
  await requireChef()

  const recommended = recommendServiceStyle(guestCount)
  const allStyles = SERVICE_STYLE_TEMPLATES.map((style) => ({
    ...style,
    staffing: calculateStaffing(guestCount, style.staffRatio),
    fitsGuestCount: guestCount >= style.minGuests && guestCount <= style.maxGuests,
  }))

  return { recommended, allStyles }
}
