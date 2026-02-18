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
  partner_type: z.enum(['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other']).default('individual'),
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
  partner_type: z.enum(['airbnb_host', 'business', 'platform', 'individual', 'venue', 'other']).optional(),
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

// ============================================
// 1. CREATE PARTNER
// ============================================

export async function createPartner(input: CreatePartnerInput) {
  const user = await requireChef()
  const validated = CreatePartnerSchema.parse(input)
  const supabase = createServerClient()

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

// ============================================
// 2. UPDATE PARTNER
// ============================================

export async function updatePartner(id: string, input: UpdatePartnerInput) {
  const user = await requireChef()
  const validated = UpdatePartnerSchema.parse(input)
  const supabase = createServerClient()

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

export async function getPartners(filters?: {
  partner_type?: string
  status?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('referral_partners')
    .select(`
      *,
      partner_locations(id, name, is_active),
      partner_images(id)
    `)
    .eq('tenant_id', user.tenantId!)

  if (filters?.partner_type) {
    query = query.eq('partner_type', filters.partner_type)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data: partners, error } = await query.order('name', { ascending: true })

  if (error) {
    console.error('[getPartners] Error:', error)
    throw new Error('Failed to fetch partners')
  }

  // Get inquiry and event counts for each partner
  const partnerIds = partners.map(p => p.id)

  if (partnerIds.length === 0) {
    return partners.map(p => ({
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
        completedCounts[evt.referral_partner_id] = (completedCounts[evt.referral_partner_id] || 0) + 1
        revenueSums[evt.referral_partner_id] = (revenueSums[evt.referral_partner_id] || 0) + (evt.quoted_price_cents || 0)
      }
    }
  }

  return partners.map(p => ({
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
  const supabase = createServerClient()

  const { data: partner, error } = await supabase
    .from('referral_partners')
    .select(`
      *,
      partner_locations(*),
      partner_images(*)
    `)
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

  const totalRevenueCents = (completedEvents || []).reduce((sum, e) => sum + (e.quoted_price_cents || 0), 0)
  const totalGuests = (completedEvents || []).reduce((sum, e) => sum + (e.guest_count || 0), 0)
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
        if (!locationStats[inq.partner_location_id]) locationStats[inq.partner_location_id] = { inquiry_count: 0, event_count: 0 }
        locationStats[inq.partner_location_id].inquiry_count++
      }
    }

    for (const evt of locEvents || []) {
      if (evt.partner_location_id) {
        if (!locationStats[evt.partner_location_id]) locationStats[evt.partner_location_id] = { inquiry_count: 0, event_count: 0 }
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
      conversion_rate: (inquiryCount || 0) > 0
        ? Math.round(((completedEventCount) / (inquiryCount || 1)) * 100)
        : 0,
    },
    location_stats: locationStats,
  }
}

// ============================================
// 5. DELETE PARTNER
// ============================================

export async function deletePartner(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

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
    // Soft delete — set inactive to preserve historical data
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

  // Hard delete — no linked records
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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
// 13. GET SHOWCASE PARTNERS (PUBLIC)
// ============================================

/**
 * Public action — no auth required.
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
    .select(`
      id, name, partner_type, booking_url, description, cover_image_url, showcase_order,
      partner_locations(id, name, city, state, booking_url, description, max_guest_count, is_active),
      partner_images(id, image_url, caption, season, display_order, location_id)
    `)
    .eq('tenant_id', chef.id)
    .eq('is_showcase_visible', true)
    .eq('status', 'active')
    .order('showcase_order', { ascending: true })

  if (error) {
    console.error('[getShowcasePartners] Error:', error)
    return null
  }

  // Filter to only active locations
  const partnersWithActiveLocations = (partners || []).map(p => ({
    ...p,
    partner_locations: (p.partner_locations || []).filter(
      (l: { is_active: boolean }) => l.is_active
    ),
    partner_images: (p.partner_images || []).sort(
      (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
    ),
  }))

  return {
    chef,
    partners: partnersWithActiveLocations,
  }
}
