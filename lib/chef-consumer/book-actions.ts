'use server'

// Chef as Consumer - Book Actions
// Hire another chef as a client. Full booking flow from the other side.
// Reuses: lib/inquiries, lib/events, lib/directory.
// Zero new tables: creates standard inquiries with the chef as the client.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { BookingAsClientInput, MyBookingAsClient } from './consumer-types'

// ── Schemas ─────────────────────────────────────────────────────────────

const InitiateBookingSchema = z.object({
  chefId: z.string().uuid(),
  chefSlug: z.string().min(1).max(200),
  clientName: z.string().min(1, 'Your name is required').max(200),
  clientEmail: z.string().email('Valid email required').max(320),
  clientPhone: z.string().max(50).optional().or(z.literal('')),
  eventDate: z.string().min(1, 'Event date is required').max(20),
  guestCount: z.number().int().positive().max(500),
  occasion: z.string().min(1, 'Occasion is required').max(200),
  location: z.string().min(1, 'Location is required').max(500),
  dietaryRestrictions: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Create an inquiry on another chef's pipeline, with the current chef as the client.
 * This is the same inquiry pipeline every client uses. The difference is the
 * current user is authenticated as a chef and the target is a different chef's tenant.
 */
export async function initiateBooking(
  input: BookingAsClientInput
): Promise<{ success: boolean; inquiryId?: string; error?: string }> {
  try {
    const user = await requireChef()
    const parsed = InitiateBookingSchema.parse(input)

    // Cannot book yourself
    if (parsed.chefId === user.entityId) {
      return { success: false, error: 'You cannot book yourself' }
    }

    const db = createServerClient()

    // Verify the target chef exists and is bookable
    const { data: targetChef, error: chefErr } = await db
      .from('chefs')
      .select('id, display_name, booking_enabled, directory_approved')
      .eq('id', parsed.chefId)
      .single()

    if (chefErr || !targetChef) {
      return { success: false, error: 'Chef not found' }
    }

    // Find or create a client record in the target chef's tenant
    // Check if the current chef already exists as a client for the target chef
    let clientId: string | null = null
    const { data: existingClient } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', parsed.chefId)
      .eq('email', parsed.clientEmail)
      .maybeSingle()

    if (existingClient) {
      clientId = existingClient.id
    } else {
      // Create client record in the target chef's tenant
      const { data: newClient, error: clientErr } = await db
        .from('clients')
        .insert({
          tenant_id: parsed.chefId,
          full_name: parsed.clientName,
          email: parsed.clientEmail,
          phone: parsed.clientPhone || null,
          source: 'chefflow_peer',
          status: 'active',
        })
        .select('id')
        .single()

      if (clientErr || !newClient) {
        console.error('[initiateBooking] Failed to create client record:', clientErr?.message)
        return { success: false, error: 'Failed to create booking request' }
      }
      clientId = newClient.id
    }

    // Create the inquiry on the target chef's pipeline
    const { data: inquiry, error: inquiryErr } = await db
      .from('inquiries')
      .insert({
        tenant_id: parsed.chefId,
        client_id: clientId,
        channel: 'website' as const,
        status: 'new' as const,
        client_name: parsed.clientName,
        client_email: parsed.clientEmail,
        client_phone: parsed.clientPhone || null,
        confirmed_date: parsed.eventDate || null,
        confirmed_guest_count: parsed.guestCount,
        confirmed_location: parsed.location,
        confirmed_occasion: parsed.occasion,
        confirmed_dietary_restrictions: parsed.dietaryRestrictions || [],
        source_message: parsed.notes || null,
        referral_source: 'chefflow_peer',
      })
      .select('id')
      .single()

    if (inquiryErr || !inquiry) {
      console.error('[initiateBooking] Failed to create inquiry:', inquiryErr?.message)
      return { success: false, error: 'Failed to submit booking request' }
    }

    return { success: true, inquiryId: inquiry.id }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstIssue = err.issues[0]
      return { success: false, error: firstIssue?.message || 'Invalid input' }
    }
    console.error('[initiateBooking]', err)
    return { success: false, error: 'Failed to submit booking request' }
  }
}

/**
 * Get all bookings where the current chef is the client.
 * Looks across all tenants for inquiries matching the chef's email.
 */
export async function getMyBookingsAsClient(): Promise<{
  bookings: MyBookingAsClient[]
  error: string | null
}> {
  try {
    const user = await requireChef()
    const db = createServerClient()

    // Find inquiries across all tenants where the chef's email matches the client email
    const { data: inquiries, error } = await db
      .from('inquiries')
      .select(`
        id,
        status,
        confirmed_date,
        confirmed_guest_count,
        confirmed_occasion,
        created_at,
        tenant_id
      `)
      .eq('client_email', user.email)
      .neq('tenant_id', user.entityId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[getMyBookingsAsClient] Query failed:', error.message)
      return { bookings: [], error: 'Failed to load bookings' }
    }

    if (!inquiries || inquiries.length === 0) {
      return { bookings: [], error: null }
    }

    // Fetch chef info for each unique tenant
    const tenantIds = [...new Set(inquiries.map((i: any) => i.tenant_id))]
    const { data: chefs } = await db
      .from('chefs')
      .select('id, display_name, slug, profile_image_url')
      .in('id', tenantIds)

    const chefMap = new Map(
      (chefs ?? []).map((c: any) => [c.id, c])
    )

    const bookings: MyBookingAsClient[] = inquiries.map((inq: any) => {
      const chef = chefMap.get(inq.tenant_id) as any
      return {
        inquiryId: inq.id,
        chefName: chef?.display_name || 'Chef',
        chefSlug: chef?.slug ?? null,
        chefProfileImageUrl: chef?.profile_image_url ?? null,
        status: inq.status,
        eventDate: inq.confirmed_date ?? null,
        guestCount: inq.confirmed_guest_count ?? null,
        occasion: inq.confirmed_occasion ?? null,
        createdAt: inq.created_at,
      }
    })

    return { bookings, error: null }
  } catch (err) {
    console.error('[getMyBookingsAsClient]', err)
    return { bookings: [], error: 'Failed to load bookings' }
  }
}
