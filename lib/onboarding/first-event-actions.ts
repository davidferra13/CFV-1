// First Event Wizard - Server Actions
// Creates client + event + menu + optional pricing in one flow.
// Reuses existing domain actions for consistency.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const FirstEventSchema = z.object({
  // Step 1: Client
  client_name: z.string().min(1, 'Client name is required').max(255),
  client_email: z.string().email('Valid email required').optional().or(z.literal('')),
  client_phone: z.string().max(50).optional().or(z.literal('')),
  // Step 2: Event
  event_date: z
    .string()
    .min(1, 'Event date is required')
    .refine((v) => !isNaN(Date.parse(v)), { message: 'Must be a valid date' }),
  event_location: z.string().max(500).optional().or(z.literal('')),
  guest_count: z.number().int().positive().default(1),
  occasion: z.string().max(255).optional().or(z.literal('')),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  // Step 3: Menu
  menu_name: z.string().min(1, 'Menu name is required').max(255),
  dishes: z
    .array(
      z.object({
        name: z.string().min(1),
        course: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  // Step 4: Pricing
  pricing_model: z.enum(['per_person', 'flat_rate']).optional(),
  price_per_person_cents: z.number().int().nonnegative().optional(),
  flat_rate_cents: z.number().int().nonnegative().optional(),
})

export type FirstEventInput = z.infer<typeof FirstEventSchema>

export type FirstEventResult =
  | { success: true; eventId: string; clientId: string; menuId: string }
  | { success: false; error: string }

export async function createFirstEvent(input: FirstEventInput): Promise<FirstEventResult> {
  try {
    const user = await requireChef()
    if (!user.tenantId) {
      return { success: false, error: 'No tenant found. Please complete account setup first.' }
    }

    const validated = FirstEventSchema.parse(input)
    const db: any = createServerClient()

    // 1. Create client
    const clientInsert: Record<string, unknown> = {
      tenant_id: user.tenantId,
      full_name: validated.client_name.trim(),
      status: 'active',
    }
    if (validated.client_email) {
      clientInsert.email = validated.client_email.trim().toLowerCase()
    }
    if (validated.client_phone) {
      clientInsert.phone = validated.client_phone.trim()
    }

    const { data: client, error: clientErr } = await db
      .from('clients')
      .insert(clientInsert as any)
      .select('id')
      .single()

    if (clientErr || !client) {
      console.error('[first-event] Client creation failed:', clientErr)
      return { success: false, error: 'Failed to create client. Please try again.' }
    }

    // 2. Create event
    const eventInsert: Record<string, unknown> = {
      tenant_id: user.tenantId,
      client_id: client.id,
      event_date: validated.event_date,
      guest_count: validated.guest_count,
      status: 'draft',
    }
    if (validated.event_location) {
      eventInsert.location_address = validated.event_location.trim()
    }
    if (validated.occasion) {
      eventInsert.occasion = validated.occasion.trim()
    }
    if (validated.service_style) {
      eventInsert.service_style = validated.service_style
    }

    // Pricing
    if (validated.pricing_model === 'per_person' && validated.price_per_person_cents) {
      eventInsert.pricing_model = 'per_person'
      eventInsert.quoted_price_cents = validated.price_per_person_cents * validated.guest_count
    } else if (validated.pricing_model === 'flat_rate' && validated.flat_rate_cents) {
      eventInsert.pricing_model = 'flat_rate'
      eventInsert.quoted_price_cents = validated.flat_rate_cents
    }

    const { data: event, error: eventErr } = await db
      .from('events')
      .insert(eventInsert as any)
      .select('id')
      .single()

    if (eventErr || !event) {
      console.error('[first-event] Event creation failed:', eventErr)
      return { success: false, error: 'Failed to create event. Please try again.' }
    }

    // 3. Create menu
    const menuInsert: Record<string, unknown> = {
      tenant_id: user.tenantId,
      event_id: event.id,
      name: validated.menu_name.trim(),
      status: 'draft',
      target_guest_count: validated.guest_count,
    }
    if (validated.service_style) {
      menuInsert.service_style = validated.service_style
    }

    const { data: menu, error: menuErr } = await db
      .from('menus')
      .insert(menuInsert as any)
      .select('id')
      .single()

    if (menuErr || !menu) {
      console.error('[first-event] Menu creation failed:', menuErr)
      // Event and client were created; still return success with event
      return { success: true, eventId: event.id, clientId: client.id, menuId: '' }
    }

    // 4. Add dishes if provided
    if (validated.dishes.length > 0) {
      const dishInserts = validated.dishes.map((d, i) => ({
        tenant_id: user.tenantId,
        menu_id: menu.id,
        name: d.name.trim(),
        course_name: d.course || 'Main',
        sort_order: i,
      }))

      await db.from('menu_dishes').insert(dishInserts as any)
    }

    // Revalidate affected paths
    revalidatePath('/dashboard')
    revalidatePath('/events')
    revalidatePath('/clients')
    revalidatePath('/menus')

    return {
      success: true,
      eventId: event.id,
      clientId: client.id,
      menuId: menu.id,
    }
  } catch (err) {
    console.error('[first-event] Unexpected error:', err)
    if (err instanceof z.ZodError) {
      const firstIssue = err.issues[0]
      return { success: false, error: firstIssue?.message || 'Validation failed' }
    }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function hasAnyEvents(): Promise<boolean> {
  try {
    const user = await requireChef()
    if (!user.tenantId) return false

    const db: any = createServerClient()
    const { data, error } = await db
      .from('events')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .limit(1)

    if (error) return false
    return Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}
