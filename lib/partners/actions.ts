// Referral Partner Server Actions
// Chef-only: Manage referral partners, locations, and images
// Public: getShowcasePartners (no auth, uses admin client)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreatePartnerSchema = z.object({
  name: z.string().min(1, 'Partner name is required'),
  partner_type: z
    .enum(['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other'])
    .default('individual'),
  contact_name: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  booking_url: z.string().url().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  commission_notes: z.string().optional().or(z.literal('')),
  is_showcase_visible: z.boolean().optional(),
})

const UpdatePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  partner_type: z
    .enum(['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other'])
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  contact_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  booking_url: z.string().url().nullable().optional().or(z.literal('')),
  description: z.string().nullable().optional(),
  cover_image_url: z.string().nullable().optional(),
  is_showcase_visible: z.boolean().optional(),
  showcase_order: z.number().int().optional(),
  notes: z.string().nullable().optional(),
  commission_notes: z.string().nullable().optional(),
})

const CreateLocationSchema = z.object({
  partner_id: z.string().uuid(),
  name: z.string().min(1, 'Location name is required'),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zip: z.string().optional().or(z.literal('')),
  booking_url: z.string().url().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  max_guest_count: z.number().int().positive().nullable().optional(),
})

const UpdateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  booking_url: z.string().url().nullable().optional().or(z.literal('')),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  max_guest_count: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
})

const AddImageSchema = z.object({
  partner_id: z.string().uuid(),
  location_id: z.string().uuid().nullable().optional(),
  image_url: z.string().min(1, 'Image URL is required'),
  caption: z.string().optional().or(z.literal('')),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).nullable().optional(),
  display_order: z.number().int().optional(),
})

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>
export type UpdatePartnerInput = z.infer<typeof UpdatePartnerSchema>
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>
export type AddImageInput = z.infer<typeof AddImageSchema>
export type PublicCreatePartnerInput = z.infer<typeof CreatePartnerSchema>

// ============================================
// 1. CREATE PARTNER
// ============================================

export async function createPartner(input: CreatePartnerInput) {
  const user = await requireChef()
  const validated = CreatePartnerSchema.parse(input)
  const supabase: any = createServerClient()

  const { data: partner, error } = await supabase
    .from('referral_partners')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      partner_type: validated.partner_type,
      contact_name: validated.contact_name || null,
      email: validated.email || null,
      phone: validated.phone || null,
      website: validated.website || null,
      booking_url: validated.booking_url || null,
      description: validated.description || null,
      is_showcase_visible: validated.is_showcase_visible ?? false,
      notes: validated.notes || null,
      commission_notes: validated.commission_notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createPartner] Error:', error)
    throw new Error('Failed to create partner')
  }

  revalidatePath('/partners')
  return { success: true, partner }
}

/**
 * Public action - no auth/role required.
 * Creates a partner profile for a chef resolved by public slug.
 */
export async function createPublicPartnerProfile(
  chefSlug: string,
  input: PublicCreatePartnerInput
) {
  const validated = CreatePartnerSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: chef, error: chefError } = await supabase
    .from('chefs')
    .select('id')
    .eq('slug', chefSlug)
    .single()

  if (chefError || !chef) {
    throw new Error('Chef profile not found')
  }

  const { data: partner, error } = await supabase
    .from('referral_partners')
    .insert({
      tenant_id: chef.id,
      name: validated.name,
      partner_type: validated.partner_type,
      contact_name: validated.contact_name || null,
      email: validated.email || null,
      phone: validated.phone || null,
      website: validated.website || null,
      booking_url: validated.booking_url || null,
      description: validated.description || null,
      is_showcase_visible: validated.is_showcase_visible ?? false,
      notes: validated.notes || null,
      commission_notes: validated.commission_notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createPublicPartnerProfile] Error:', error)
    throw new Error('Failed to create partner profile')
  }

  revalidatePath(`/chef/${chefSlug}`)
  return { success: true, partner }
}

// ============================================
// 2. UPDATE PARTNER
// ============================================

export async function updatePartner(id: string, input: UpdatePartnerInput) {
  const user = await requireChef()
  const validated = UpdatePartnerSchema.parse(input)
  const supabase: any = createServerClient()

  // Clean empty strings to null
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(validated)) {
    if (value !== undefined) {
      updates[key] = value === '' ? null : value
    }
  }

  const { data: partner, error } = await supabase
    .from('referral_partners')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updatePartner] Error:', error)
    throw new Error('Failed to update partner')
  }

  revalidatePath('/partners')
  revalidatePath(`/partners/${id}`)
  return { success: true, partner }
}

// ============================================
// 3. GET PARTNERS (LIST)
// ============================================

export async function getPartners(filters?: { partner_type?: string; status?: string }) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('referral_partners')
    .select(
      `
      *,
      partner_locations(id, name, is_active),
      partner_images(id)
    `
    )
    .eq('tenant_id', user.tenantId!)

  if (filters?.partner_type) {
    query = query.eq('partner_type', filters.partner_type as any)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status as any)
  }

  const { data: partners, error } = await query.order('name', { ascending: true })

  if (error) {
    console.error('[getPartners] Error:', error)
    throw new Error('Failed to fetch partners')
  }

  // Get inquiry and event counts for each partner
  const partnerIds = partners.map((p: any) => p.id)

  if (partnerIds.length === 0) {
    return partners.map((p: any) => ({
      ...p,
      inquiry_count: 0,
      event_count: 0,
      completed_event_count: 0,
      total_revenue_cents: 0,
    }))
  }

  // Fetch inquiry counts
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('referral_partner_id')
    .eq('tenant_id', user.tenantId!)
    .in('referral_partner_id', partnerIds)

  // Fetch event counts and revenue
  const { data: events } = await supabase
    .from('events')
    .select('referral_partner_id, status, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .in('referral_partner_id', partnerIds)

  // Aggregate per partner
  const inquiryCounts: Record<string, number> = {}
  const eventCounts: Record<string, number> = {}
  const completedCounts: Record<string, number> = {}
  const revenueSums: Record<string, number> = {}

  for (const inq of inquiries || []) {
    if (inq.referral_partner_id) {
      inquiryCounts[inq.referral_partner_id] = (inquiryCounts[inq.referral_partner_id] || 0) + 1
    }
  }

  for (const evt of events || []) {
    if (evt.referral_partner_id) {
      eventCounts[evt.referral_partner_id] = (eventCounts[evt.referral_partner_id] || 0) + 1
      if (evt.status === 'completed') {
        completedCounts[evt.referral_partner_id] =
          (completedCounts[evt.referral_partner_id] || 0) + 1
        revenueSums[evt.referral_partner_id] =
          (revenueSums[evt.referral_partner_id] || 0) + (evt.quoted_price_cents || 0)
      }
    }
  }

  return partners.map((p: any) => ({
    ...p,
    inquiry_count: inquiryCounts[p.id] || 0,
    event_count: eventCounts[p.id] || 0,
    completed_event_count: completedCounts[p.id] || 0,
    total_revenue_cents: revenueSums[p.id] || 0,
  }))
}

// ============================================
// 4. GET PARTNER BY ID
// ============================================

export async function getPartnerById(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: partner, error } = await supabase
    .from('referral_partners')
    .select(
      `
      *,
      partner_locations(*),
      partner_images(*)
    `
    )
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getPartnerById] Error:', error)
    return null
  }

  // Get stats
  const [{ count: inquiryCount }, { count: eventCount }] = await Promise.all([
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('referral_partner_id', id),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('referral_partner_id', id),
  ])

  // Get completed events for revenue and guest count
  const { data: completedEvents } = await supabase
    .from('events')
    .select('id, quoted_price_cents, guest_count, status')
    .eq('tenant_id', user.tenantId!)
    .eq('referral_partner_id', id)
    .eq('status', 'completed')

  const totalRevenueCents = (completedEvents || []).reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents || 0),
    0
  )
  const totalGuests = (completedEvents || []).reduce(
    (sum: any, e: any) => sum + (e.guest_count || 0),
    0
  )
  const completedEventCount = completedEvents?.length || 0

  // Get per-location stats
  const locationStats: Record<string, { inquiry_count: number; event_count: number }> = {}
  if (partner.partner_locations && partner.partner_locations.length > 0) {
    const locIds = partner.partner_locations.map((l: { id: string }) => l.id)

    const { data: locInquiries } = await supabase
      .from('inquiries')
      .select('partner_location_id')
      .eq('tenant_id', user.tenantId!)
      .in('partner_location_id', locIds)

    const { data: locEvents } = await supabase
      .from('events')
      .select('partner_location_id')
      .eq('tenant_id', user.tenantId!)
      .in('partner_location_id', locIds)

    for (const inq of locInquiries || []) {
      if (inq.partner_location_id) {
        if (!locationStats[inq.partner_location_id])
          locationStats[inq.partner_location_id] = { inquiry_count: 0, event_count: 0 }
        locationStats[inq.partner_location_id].inquiry_count++
      }
    }

    for (const evt of locEvents || []) {
      if (evt.partner_location_id) {
        if (!locationStats[evt.partner_location_id])
          locationStats[evt.partner_location_id] = { inquiry_count: 0, event_count: 0 }
        locationStats[evt.partner_location_id].event_count++
      }
    }
  }

  return {
    ...partner,
    stats: {
      inquiry_count: inquiryCount || 0,
      event_count: eventCount || 0,
      completed_event_count: completedEventCount,
      total_revenue_cents: totalRevenueCents,
      total_guests: totalGuests,
      conversion_rate:
        (inquiryCount || 0) > 0 ? Math.round((completedEventCount / (inquiryCount || 1)) * 100) : 0,
    },
    location_stats: locationStats,
  }
}

// ============================================
// 5. DELETE PARTNER
// ============================================

export async function deletePartner(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Check for linked inquiries or events
  const [{ count: inquiryCount }, { count: eventCount }] = await Promise.all([
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('referral_partner_id', id),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('referral_partner_id', id),
  ])

  if ((inquiryCount || 0) > 0 || (eventCount || 0) > 0) {
    // Soft delete - set inactive to preserve historical data
    const { error } = await supabase
      .from('referral_partners')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[deletePartner] Soft delete error:', error)
      throw new Error('Failed to deactivate partner')
    }

    revalidatePath('/partners')
    return { success: true, soft_deleted: true }
  }

  // Hard delete - no linked records
  const { error } = await supabase
    .from('referral_partners')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deletePartner] Error:', error)
    throw new Error('Failed to delete partner')
  }

  revalidatePath('/partners')
  return { success: true, soft_deleted: false }
}

// ============================================
// 6. CREATE PARTNER LOCATION
// ============================================

export async function createPartnerLocation(input: CreateLocationInput) {
  const user = await requireChef()
  const validated = CreateLocationSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify partner belongs to this tenant
  const { data: partner } = await supabase
    .from('referral_partners')
    .select('id')
    .eq('id', validated.partner_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) {
    throw new Error('Partner not found')
  }

  const { data: location, error } = await supabase
    .from('partner_locations')
    .insert({
      tenant_id: user.tenantId!,
      partner_id: validated.partner_id,
      name: validated.name,
      address: validated.address || null,
      city: validated.city || null,
      state: validated.state || null,
      zip: validated.zip || null,
      booking_url: validated.booking_url || null,
      description: validated.description || null,
      notes: validated.notes || null,
      max_guest_count: validated.max_guest_count ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createPartnerLocation] Error:', error)
    throw new Error('Failed to create location')
  }

  revalidatePath(`/partners/${validated.partner_id}`)
  return { success: true, location }
}

// ============================================
// 7. UPDATE PARTNER LOCATION
// ============================================

export async function updatePartnerLocation(id: string, input: UpdateLocationInput) {
  const user = await requireChef()
  const validated = UpdateLocationSchema.parse(input)
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(validated)) {
    if (value !== undefined) {
      updates[key] = value === '' ? null : value
    }
  }

  const { data: location, error } = await supabase
    .from('partner_locations')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updatePartnerLocation] Error:', error)
    throw new Error('Failed to update location')
  }

  revalidatePath(`/partners/${location.partner_id}`)
  return { success: true, location }
}

// ============================================
// 8. GET PARTNER LOCATIONS
// ============================================

export async function getPartnerLocations(partnerId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: locations, error } = await supabase
    .from('partner_locations')
    .select('*, partner_images(*)')
    .eq('partner_id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getPartnerLocations] Error:', error)
    throw new Error('Failed to fetch locations')
  }

  return locations
}

// ============================================
// 9. DELETE PARTNER LOCATION
// ============================================

export async function deletePartnerLocation(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get location to find partner_id for revalidation
  const { data: location } = await supabase
    .from('partner_locations')
    .select('partner_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!location) {
    throw new Error('Location not found')
  }

  // Check for linked inquiries or events
  const [{ count: inquiryCount }, { count: eventCount }] = await Promise.all([
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('partner_location_id', id),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('partner_location_id', id),
  ])

  if ((inquiryCount || 0) > 0 || (eventCount || 0) > 0) {
    // Soft delete
    const { error } = await supabase
      .from('partner_locations')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[deletePartnerLocation] Soft delete error:', error)
      throw new Error('Failed to deactivate location')
    }

    revalidatePath(`/partners/${location.partner_id}`)
    return { success: true, soft_deleted: true }
  }

  const { error } = await supabase
    .from('partner_locations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deletePartnerLocation] Error:', error)
    throw new Error('Failed to delete location')
  }

  revalidatePath(`/partners/${location.partner_id}`)
  return { success: true, soft_deleted: false }
}

// ============================================
// 10. ADD PARTNER IMAGE
// ============================================

export async function addPartnerImage(input: AddImageInput) {
  const user = await requireChef()
  const validated = AddImageSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify partner belongs to this tenant
  const { data: partner } = await supabase
    .from('referral_partners')
    .select('id')
    .eq('id', validated.partner_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) {
    throw new Error('Partner not found')
  }

  const { data: image, error } = await supabase
    .from('partner_images')
    .insert({
      tenant_id: user.tenantId!,
      partner_id: validated.partner_id,
      location_id: validated.location_id || null,
      image_url: validated.image_url,
      caption: validated.caption || null,
      season: validated.season || null,
      display_order: validated.display_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[addPartnerImage] Error:', error)
    throw new Error('Failed to add image')
  }

  revalidatePath(`/partners/${validated.partner_id}`)
  return { success: true, image }
}

// ============================================
// 11. REMOVE PARTNER IMAGE
// ============================================

export async function removePartnerImage(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get image for partner_id revalidation
  const { data: image } = await supabase
    .from('partner_images')
    .select('partner_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!image) {
    throw new Error('Image not found')
  }

  const { error } = await supabase
    .from('partner_images')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[removePartnerImage] Error:', error)
    throw new Error('Failed to remove image')
  }

  revalidatePath(`/partners/${image.partner_id}`)
  return { success: true }
}

// ============================================
// 12. REORDER PARTNER IMAGES
// ============================================

export async function reorderPartnerImages(partnerId: string, imageIds: string[]) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Update display_order for each image
  const updates = imageIds.map((imageId, index) =>
    supabase
      .from('partner_images')
      .update({ display_order: index })
      .eq('id', imageId)
      .eq('tenant_id', user.tenantId!)
  )

  await Promise.all(updates)

  revalidatePath(`/partners/${partnerId}`)
  return { success: true }
}

// ============================================
// 13. GET PARTNERS WITH LOCATIONS (for selects)
// ============================================

/**
 * Lightweight query for populating partner + location cascading dropdowns.
 * Returns only active partners and their active locations.
 */
export async function getPartnersWithLocations() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: partners, error } = await supabase
    .from('referral_partners')
    .select('id, name, partner_type, partner_locations(id, name, city, state, is_active)')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('[getPartnersWithLocations] Error:', error)
    return {
      partners: [],
      partnerLocations: {} as Record<
        string,
        { id: string; name: string; city: string | null; state: string | null }[]
      >,
    }
  }

  const partnerLocations: Record<
    string,
    { id: string; name: string; city: string | null; state: string | null }[]
  > = {}
  for (const p of partners || []) {
    partnerLocations[p.id] = ((p.partner_locations || []) as any[])
      .filter((l) => l.is_active !== false)
      .map((l) => ({ id: l.id, name: l.name, city: l.city, state: l.state }))
  }

  return {
    partners: (partners || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      partner_type: p.partner_type,
    })),
    partnerLocations,
  }
}

// ============================================
// 14. GET PARTNER EVENTS (service history)
// ============================================

/**
 * Returns all events linked to a partner, with per-location context.
 * Used to render the Service History section on the partner detail page.
 */
export async function getPartnerEvents(partnerId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify partner belongs to this tenant
  const { data: partner } = await supabase
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) throw new Error('Partner not found')

  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, quoted_price_cents,
      partner_location_id,
      partner_location:partner_locations(id, name, city, state)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('referral_partner_id', partnerId)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getPartnerEvents] Error:', error)
    throw new Error('Failed to fetch partner events')
  }

  return (events || []) as Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number
    status: string
    quoted_price_cents: number | null
    partner_location_id: string | null
    partner_location: { id: string; name: string; city: string | null; state: string | null } | null
  }>
}

// ============================================
// 15. GET EVENTS NOT YET ASSIGNED TO PARTNER
// ============================================

/**
 * Returns all non-cancelled events not currently assigned to this partner.
 * Used to populate the bulk-assign panel on the partner detail page.
 */
export async function getEventsNotAssignedToPartner(partnerId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify partner belongs to this tenant
  const { data: partner } = await supabase
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) throw new Error('Partner not found')

  const { data: events, error } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, location_city, location_state, referral_partner_id'
    )
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'cancelled')
    .or(`referral_partner_id.is.null,referral_partner_id.neq.${partnerId}`)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getEventsNotAssignedToPartner] Error:', error)
    throw new Error('Failed to fetch events')
  }

  return (events || []) as Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number
    status: string
    location_city: string | null
    location_state: string | null
    referral_partner_id: string | null
  }>
}

// ============================================
// 16. BULK ASSIGN EVENTS TO PARTNER
// ============================================

/**
 * Tags multiple events with a partner and optional location.
 * No status restriction - intended for retroactive historical attribution.
 * Only touches partner FK columns, not status or financial data.
 */
export async function bulkAssignEventsToPartner(
  partnerId: string,
  locationId: string | null,
  eventIds: string[]
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!eventIds.length) return { success: true, count: 0 }

  // Verify partner belongs to this tenant
  const { data: partner } = await supabase
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) throw new Error('Partner not found')

  // If locationId provided, verify it belongs to this partner
  if (locationId) {
    const { data: location } = await supabase
      .from('partner_locations')
      .select('id')
      .eq('id', locationId)
      .eq('partner_id', partnerId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!location) throw new Error('Location not found or does not belong to this partner')
  }

  // Update events - only touches partner FK columns
  const { error } = await supabase
    .from('events')
    .update({
      referral_partner_id: partnerId,
      partner_location_id: locationId,
    })
    .eq('tenant_id', user.tenantId!)
    .in('id', eventIds)

  if (error) {
    console.error('[bulkAssignEventsToPartner] Error:', error)
    throw new Error('Failed to assign events to partner')
  }

  revalidatePath(`/partners/${partnerId}`)
  revalidatePath('/events')
  return { success: true, count: eventIds.length }
}

// ============================================
// 17. GENERATE PARTNER SHARE LINK
// ============================================

/**
 * Generates (or returns the existing) public share token for a partner's
 * contribution report. The URL can be sent to the partner directly.
 */
export async function generatePartnerShareLink(partnerId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: partner, error: fetchError } = await supabase
    .from('referral_partners')
    .select('id, share_token')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !partner) throw new Error('Partner not found')

  let token = (partner as any).share_token as string | null

  if (!token) {
    // Generate a new UUID token
    const newToken = crypto.randomUUID()
    const { error: updateError } = await supabase
      .from('referral_partners')
      .update({ share_token: newToken } as any)
      .eq('id', partnerId)
      .eq('tenant_id', user.tenantId!)

    if (updateError) throw new Error('Failed to generate share link')
    token = newToken
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cheflowhq.com'
  return { success: true, url: `${baseUrl}/partner-report/${token}` }
}

// ============================================
// 18. GET PARTNER CONTRIBUTION REPORT (PUBLIC)
// ============================================

/**
 * Public action - no auth required.
 * Fetches all data needed for the partner contribution report page.
 * Uses admin client to bypass RLS (same pattern as event share pages).
 */
export async function getPartnerContributionReport(token: string) {
  const supabase = createServerClient({ admin: true })

  // Find partner by share token
  const { data: partner, error } = await supabase
    .from('referral_partners')
    .select(
      `
      id, name, partner_type, contact_name, description, cover_image_url, tenant_id,
      partner_locations(id, name, city, state, description, max_guest_count, is_active)
    `
    )
    .eq('share_token' as any, token)
    .eq('status', 'active')
    .single()

  if (error || !partner) return null

  // Get chef info
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name, profile_image_url')
    .eq('id', partner.tenant_id)
    .single()

  // Get all events linked to this partner (excluding cancelled)
  const { data: events } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, quoted_price_cents, partner_location_id'
    )
    .eq('tenant_id', partner.tenant_id)
    .eq('referral_partner_id', partner.id)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: false })

  const allEvents = (events || []) as Array<{
    id: string
    occasion: string | null
    event_date: string
    guest_count: number
    status: string
    quoted_price_cents: number | null
    partner_location_id: string | null
  }>

  const completedEvents = allEvents.filter((e) => e.status === 'completed')
  const totalGuests = allEvents.reduce((s, e) => s + (e.guest_count || 0), 0)
  const totalRevenueCents = completedEvents.reduce((s, e) => s + (e.quoted_price_cents || 0), 0)

  // Build location lookup
  const locationMap: Record<
    string,
    { id: string; name: string; city: string | null; state: string | null }
  > = {}
  for (const loc of (partner.partner_locations || []) as any[]) {
    locationMap[loc.id] = { id: loc.id, name: loc.name, city: loc.city, state: loc.state }
  }

  // Group events by location
  const byLocation: Record<string, typeof allEvents> = {}
  for (const evt of allEvents) {
    const key = evt.partner_location_id || 'unspecified'
    if (!byLocation[key]) byLocation[key] = []
    byLocation[key].push(evt)
  }

  return {
    partner: {
      name: partner.name,
      partner_type: partner.partner_type,
      contact_name: partner.contact_name,
      description: partner.description,
      cover_image_url: partner.cover_image_url,
      locations: ((partner.partner_locations || []) as any[]).filter((l) => l.is_active !== false),
    },
    chef: chef
      ? {
          name: chef.business_name || chef.display_name || 'Your Chef',
          profile_image_url: chef.profile_image_url,
        }
      : null,
    stats: {
      total_events: allEvents.length,
      total_guests: totalGuests,
      total_revenue_cents: totalRevenueCents,
      completed_events: completedEvents.length,
    },
    events: allEvents,
    location_map: locationMap,
    by_location: byLocation,
  }
}

// ============================================
// 19. GET SHOWCASE PARTNERS (PUBLIC)
// ============================================

/**
 * Public action - no auth required.
 * Returns showcase-visible partners for a chef's public profile.
 * Uses admin client to bypass RLS (same pattern as event share pages).
 */
export async function getShowcasePartners(chefSlug: string) {
  const supabase = createServerClient({ admin: true })

  // Find chef by slug
  const { data: chef, error: chefError } = await supabase
    .from('chefs')
    .select('id, business_name, display_name, bio, profile_image_url, tagline')
    .eq('slug', chefSlug)
    .single()

  if (chefError || !chef) {
    return null
  }

  // Get showcase-visible partners with locations and images
  const { data: partners, error } = await supabase
    .from('referral_partners')
    .select(
      `
      id, name, partner_type, booking_url, description, cover_image_url, showcase_order,
      partner_locations(id, name, city, state, booking_url, description, max_guest_count, is_active),
      partner_images(id, image_url, caption, season, display_order, location_id)
    `
    )
    .eq('tenant_id', chef.id)
    .eq('is_showcase_visible', true)
    .eq('status', 'active')
    .order('showcase_order', { ascending: true })

  if (error) {
    console.error('[getShowcasePartners] Error:', error)
    return null
  }

  // Filter to only active locations
  const partnersWithActiveLocations = (partners || []).map((p: any) => ({
    ...p,
    partner_locations: (p.partner_locations || []).filter(
      (l: { is_active: boolean }) => l.is_active
    ),
    partner_images: (p.partner_images || []).sort(
      (a: { display_order: number | null }, b: { display_order: number | null }) =>
        (a.display_order ?? 0) - (b.display_order ?? 0)
    ),
  }))

  return {
    chef,
    partners: partnersWithActiveLocations,
  }
}
