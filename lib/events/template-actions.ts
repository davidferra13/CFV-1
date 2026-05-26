'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name required'),
  description: z.string().optional(),
  occasion: z.string().optional(),
  defaultGuestCount: z.number().int().positive().optional(),
  defaultLocationAddress: z.string().optional(),
  defaultLocationCity: z.string().optional(),
  defaultLocationState: z.string().optional(),
  defaultLocationZip: z.string().optional(),
  defaultNotes: z.string().optional(),
  defaultDurationHours: z.number().positive().optional(),
  defaultServiceStyle: z.string().optional(),
  defaultPricingModel: z.string().optional(),
  defaultQuotedPriceCents: z.number().int().positive().optional(),
})

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>

export async function createEventTemplate(input: CreateTemplateInput) {
  const user = await requireChef()
  const validated = CreateTemplateSchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('event_templates')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description || null,
      occasion: validated.occasion || null,
      default_guest_count: validated.defaultGuestCount || null,
      default_location_address: validated.defaultLocationAddress || null,
      default_location_city: validated.defaultLocationCity || null,
      default_location_state: validated.defaultLocationState || null,
      default_location_zip: validated.defaultLocationZip || null,
      default_notes: validated.defaultNotes || null,
      default_duration_hours: validated.defaultDurationHours || null,
      default_service_style: validated.defaultServiceStyle || null,
      default_pricing_model: validated.defaultPricingModel || null,
      default_quoted_price_cents: validated.defaultQuotedPriceCents || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createEventTemplate] Error:', error)
    throw new Error('Failed to create template')
  }
  return data
}

export async function getEventTemplates() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_archived', false)
    .order('use_count', { ascending: false })

  return data ?? []
}

export async function quickCreateFromTemplate(input: {
  templateId: string
  clientId: string
  eventDate: string
  guestCount?: number
}) {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: template } = await db
    .from('event_templates')
    .select('*')
    .eq('id', input.templateId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!template) throw new Error('Template not found')

  // Verify client belongs to tenant
  const { data: client } = await db
    .from('clients')
    .select('id, tenant_id')
    .eq('id', input.clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  const t = template as any
  const { data: event, error } = await db
    .from('events')
    .insert({
      tenant_id: user.tenantId!,
      client_id: input.clientId,
      event_date: input.eventDate,
      occasion: t.occasion || 'Private Dinner',
      guest_count: input.guestCount || t.default_guest_count || 2,
      location_address: t.default_location_address || null,
      location_city: t.default_location_city || null,
      location_state: t.default_location_state || null,
      location_zip: t.default_location_zip || null,
      notes: t.default_notes || null,
      status: 'inquiry',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[quickCreateFromTemplate] Error:', error)
    throw new Error('Failed to create event')
  }

  // Increment use count (non-blocking)
  await db
    .from('event_templates')
    .update({ use_count: (t.use_count || 0) + 1 })
    .eq('id', template.id)
    .catch((err: any) => console.error('[quickCreateFromTemplate] use_count bump failed:', err))

  return { eventId: (event as any).id }
}

export async function saveEventAsTemplate(eventId: string, templateName: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      'occasion, guest_count, location_address, location_city, location_state, location_zip, notes'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  return createEventTemplate({
    name: templateName,
    occasion: event.occasion || undefined,
    defaultGuestCount: event.guest_count || undefined,
    defaultLocationAddress: event.location_address || undefined,
    defaultLocationCity: event.location_city || undefined,
    defaultLocationState: event.location_state || undefined,
    defaultLocationZip: event.location_zip || undefined,
    defaultNotes: event.notes || undefined,
  })
}

export async function archiveTemplate(templateId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_templates')
    .update({ is_archived: true })
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error('Failed to archive template')
}
