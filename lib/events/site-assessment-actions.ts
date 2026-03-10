// Site Visit Assessment - Server Actions
// Structured venue evaluation for first-time event locations.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const SiteAssessmentSchema = z.object({
  venue_name: z.string().min(1, 'Venue name required'),
  visit_date: z.string().nullable().optional(),
  visited_by: z.string().nullable().optional(),

  // Kitchen
  kitchen_size: z.enum(['small', 'medium', 'large', 'commercial', 'none']).nullable().optional(),
  has_oven: z.boolean().default(false),
  has_stovetop: z.boolean().default(false),
  has_refrigeration: z.boolean().default(false),
  has_freezer: z.boolean().default(false),
  has_dishwasher: z.boolean().default(false),
  outlet_count: z.number().int().min(0).nullable().optional(),
  water_access: z.boolean().default(true),

  // Access
  parking_notes: z.string().nullable().optional(),
  loading_dock: z.boolean().default(false),
  load_in_path_notes: z.string().nullable().optional(),
  elevator_access: z.boolean().default(false),
  access_start_time: z.string().nullable().optional(),
  access_end_time: z.string().nullable().optional(),

  // Space
  max_capacity: z.number().int().min(0).nullable().optional(),
  outdoor_space: z.boolean().default(false),
  weather_exposure: z.boolean().default(false),
  restroom_access: z.boolean().default(true),
  storage_space_notes: z.string().nullable().optional(),
  noise_restrictions: z.string().nullable().optional(),

  // Venue Contact
  venue_contact_name: z.string().nullable().optional(),
  venue_contact_phone: z.string().nullable().optional(),
  venue_contact_email: z.string().nullable().optional(),

  // Media & Notes
  photos_json: z.any().nullable().optional(),
  general_notes: z.string().nullable().optional(),
})

export type SiteAssessmentInput = z.infer<typeof SiteAssessmentSchema>

// ============================================
// ACTIONS
// ============================================

/**
 * Create a site assessment for an event.
 */
export async function createSiteAssessment(eventId: string, input: SiteAssessmentInput) {
  const user = await requireChef()
  const validated = SiteAssessmentSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify event belongs to this chef
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { data, error } = await supabase
    .from('event_site_assessments')
    .insert({
      ...validated,
      event_id: eventId,
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[createSiteAssessment] Error:', error)
    throw new Error('Failed to create site assessment')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/site-assessment`)
  return data
}

/**
 * Update an existing site assessment.
 */
export async function updateSiteAssessment(
  assessmentId: string,
  input: Partial<SiteAssessmentInput>
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_site_assessments')
    .update(input)
    .eq('id', assessmentId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateSiteAssessment] Error:', error)
    throw new Error('Failed to update site assessment')
  }

  revalidatePath(`/events/${data.event_id}`)
  revalidatePath(`/events/${data.event_id}/site-assessment`)
  return data
}

/**
 * Get the site assessment for an event (if one exists).
 */
export async function getSiteAssessment(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_site_assessments')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    console.error('[getSiteAssessment] Error:', error)
    throw new Error('Failed to load site assessment')
  }

  return data
}

/**
 * Get past assessments for the same venue name (for pre-filling).
 * Useful when a chef returns to a venue they have visited before.
 */
export async function getSiteAssessmentsByVenue(venueName: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_site_assessments')
    .select(
      `
      *,
      events (id, title, event_date)
    `
    )
    .eq('chef_id', user.tenantId!)
    .ilike('venue_name', venueName)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('[getSiteAssessmentsByVenue] Error:', error)
    throw new Error('Failed to search venue assessments')
  }

  return data ?? []
}
