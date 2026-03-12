// Event Template Server Actions
// CRUD operations for reusable event templates.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type EventTemplate = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  occasion: string | null
  service_style: string | null
  guest_count: number | null
  serve_time: string | null
  arrival_time: string | null
  departure_time: string | null
  location_address: string | null
  location_city: string | null
  location_state: string | null
  location_zip: string | null
  location_notes: string | null
  access_instructions: string | null
  kitchen_notes: string | null
  site_notes: string | null
  pricing_model: string | null
  quoted_price_cents: number | null
  deposit_amount_cents: number | null
  pricing_notes: string | null
  dietary_restrictions: string[]
  allergies: string[]
  special_requests: string | null
  usage_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export type TemplateActionResult = {
  success: boolean
  templateId?: string
  error?: string
}

// --- Schemas ---

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().max(500).optional(),
  occasion: z.string().optional(),
  service_style: z.string().optional(),
  guest_count: z.number().int().positive().optional(),
  serve_time: z.string().optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  location_notes: z.string().optional(),
  access_instructions: z.string().optional(),
  kitchen_notes: z.string().optional(),
  site_notes: z.string().optional(),
  pricing_model: z.string().optional(),
  quoted_price_cents: z.number().int().optional(),
  deposit_amount_cents: z.number().int().optional(),
  pricing_notes: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  special_requests: z.string().optional(),
})

const UpdateTemplateSchema = CreateTemplateSchema.partial().extend({
  id: z.string().uuid(),
})

// --- Actions ---

/** List all event templates for the current chef */
export async function listEventTemplates(): Promise<EventTemplate[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('usage_count', { ascending: false })

  if (error) {
    console.error('[listEventTemplates] Error:', error)
    return []
  }

  return data ?? []
}

/** Create a new event template */
export async function createEventTemplate(
  input: z.infer<typeof CreateTemplateSchema>
): Promise<TemplateActionResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validated = CreateTemplateSchema.parse(input)

  const { data, error } = await supabase
    .from('event_templates')
    .insert({
      tenant_id: user.tenantId!,
      ...validated,
      dietary_restrictions: validated.dietary_restrictions ?? [],
      allergies: validated.allergies ?? [],
    } as any)
    .select('id')
    .single()

  if (error) {
    console.error('[createEventTemplate] Error:', error)
    return { success: false, error: 'Failed to create template' }
  }

  revalidatePath('/events')
  return { success: true, templateId: data.id }
}

/** Create a template from an existing event */
export async function createTemplateFromEvent(
  eventId: string,
  templateName: string
): Promise<TemplateActionResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    return { success: false, error: 'Event not found' }
  }

  const { data, error } = await supabase
    .from('event_templates')
    .insert({
      tenant_id: user.tenantId!,
      name: templateName,
      description: `Created from ${event.occasion || 'event'} on ${event.event_date}`,
      occasion: event.occasion,
      service_style: event.service_style,
      guest_count: event.guest_count,
      serve_time: event.serve_time,
      arrival_time: event.arrival_time,
      departure_time: event.departure_time,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      location_zip: event.location_zip,
      location_notes: event.location_notes,
      access_instructions: event.access_instructions,
      kitchen_notes: event.kitchen_notes,
      site_notes: event.site_notes,
      pricing_model: event.pricing_model,
      quoted_price_cents: event.quoted_price_cents,
      deposit_amount_cents: event.deposit_amount_cents,
      dietary_restrictions: event.dietary_restrictions ?? [],
      allergies: event.allergies ?? [],
      special_requests: event.special_requests,
    } as any)
    .select('id')
    .single()

  if (error) {
    console.error('[createTemplateFromEvent] Error:', error)
    return { success: false, error: 'Failed to create template from event' }
  }

  revalidatePath('/events')
  return { success: true, templateId: data.id }
}

/** Update an existing template */
export async function updateEventTemplate(
  input: z.infer<typeof UpdateTemplateSchema>
): Promise<TemplateActionResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { id, ...updates } = UpdateTemplateSchema.parse(input)

  const { error } = await supabase
    .from('event_templates')
    .update(updates as any)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateEventTemplate] Error:', error)
    return { success: false, error: 'Failed to update template' }
  }

  revalidatePath('/events')
  return { success: true, templateId: id }
}

/** Delete an event template */
export async function deleteEventTemplate(id: string): Promise<TemplateActionResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteEventTemplate] Error:', error)
    return { success: false, error: 'Failed to delete template' }
  }

  revalidatePath('/events')
  return { success: true, templateId: id }
}

/** Record that a template was used (increment counter) */
export async function recordTemplateUsage(templateId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Non-blocking usage tracking
  try {
    await supabase.rpc('increment_template_usage', { template_id: templateId })
  } catch {
    // Fallback: direct update if RPC doesn't exist yet
    try {
      const { data: current } = await supabase
        .from('event_templates')
        .select('usage_count')
        .eq('id', templateId)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (current) {
        await supabase
          .from('event_templates')
          .update({
            usage_count: (current.usage_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          } as any)
          .eq('id', templateId)
          .eq('tenant_id', user.tenantId!)
      }
    } catch (err) {
      console.error('[recordTemplateUsage] Non-blocking failure:', err)
    }
  }
}
