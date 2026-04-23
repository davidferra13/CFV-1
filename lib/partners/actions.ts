// Referral Partner Server Actions
// Chef-only: Manage referral partners, locations, and images
// Public: getShowcasePartners (no auth, uses admin client)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  buildLocationExperienceImages,
  CHEF_LOCATION_RELATIONSHIP_OPTIONS,
  evaluatePublicLocationExperienceReadiness,
  LOCATION_BEST_FOR_OPTIONS,
  LOCATION_EXPERIENCE_TAG_OPTIONS,
  LOCATION_SERVICE_TYPE_OPTIONS,
  normalizeLocationOptionValues,
  normalizeRelationshipType,
} from '@/lib/partners/location-experiences'
import {
  sanitizePartnerLocationProposal,
  type PartnerLocationChangeRequestStatus,
} from '@/lib/partners/location-change-requests'

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
  commission_type: z.enum(['none', 'percentage', 'flat_fee']).default('none').optional(),
  commission_rate_percent: z.number().min(0).max(100).nullable().optional(),
  commission_flat_cents: z.number().int().min(0).nullable().optional(),
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
  commission_type: z.enum(['none', 'percentage', 'flat_fee']).nullable().optional(),
  commission_rate_percent: z.number().min(0).max(100).nullable().optional(),
  commission_flat_cents: z.number().int().min(0).nullable().optional(),
})

const LocationExperienceTagSchema = z.enum(LOCATION_EXPERIENCE_TAG_OPTIONS)
const LocationBestForSchema = z.enum(LOCATION_BEST_FOR_OPTIONS)
const LocationServiceTypeSchema = z.enum(LOCATION_SERVICE_TYPE_OPTIONS)
const ChefLocationRelationshipSchema = z.enum(CHEF_LOCATION_RELATIONSHIP_OPTIONS)

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
  experience_tags: z.array(LocationExperienceTagSchema).optional().default([]),
  best_for: z.array(LocationBestForSchema).optional().default([]),
  service_types: z.array(LocationServiceTypeSchema).optional().default([]),
  relationship_type: ChefLocationRelationshipSchema.optional().default('preferred'),
  is_public: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
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
  experience_tags: z.array(LocationExperienceTagSchema).optional(),
  best_for: z.array(LocationBestForSchema).optional(),
  service_types: z.array(LocationServiceTypeSchema).optional(),
  relationship_type: ChefLocationRelationshipSchema.optional(),
  is_public: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
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

export type PartnerLocationChangeRequestRecord = {
  id: string
  partner_id: string
  location_id: string
  status: PartnerLocationChangeRequestStatus
  requested_payload: Record<string, unknown>
  partner_note: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
}

function buildLocationWritePayload(input: {
  name?: string
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  booking_url?: string | null
  description?: string | null
  notes?: string | null
  max_guest_count?: number | null
  experience_tags?: readonly string[] | null
  best_for?: readonly string[] | null
  service_types?: readonly string[] | null
  is_active?: boolean
}) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.address !== undefined ? { address: input.address || null } : {}),
    ...(input.city !== undefined ? { city: input.city || null } : {}),
    ...(input.state !== undefined ? { state: input.state || null } : {}),
    ...(input.zip !== undefined ? { zip: input.zip || null } : {}),
    ...(input.booking_url !== undefined ? { booking_url: input.booking_url || null } : {}),
    ...(input.description !== undefined ? { description: input.description || null } : {}),
    ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    ...(input.max_guest_count !== undefined
      ? { max_guest_count: input.max_guest_count ?? null }
      : {}),
    ...(input.experience_tags !== undefined
      ? {
          experience_tags: normalizeLocationOptionValues(
            input.experience_tags,
            LOCATION_EXPERIENCE_TAG_OPTIONS
          ),
        }
      : {}),
    ...(input.best_for !== undefined
      ? {
          best_for: normalizeLocationOptionValues(input.best_for, LOCATION_BEST_FOR_OPTIONS),
        }
      : {}),
    ...(input.service_types !== undefined
      ? {
          service_types: normalizeLocationOptionValues(
            input.service_types,
            LOCATION_SERVICE_TYPE_OPTIONS
          ),
        }
      : {}),
    ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
  }
}

async function upsertChefLocationLink(
  db: any,
  input: {
    tenantId: string
    chefId: string
    locationId: string
    relationshipType?: string | null
    isPublic?: boolean
    isFeatured?: boolean
    sortOrder?: number
  }
) {
  const { error } = await db.from('chef_location_links').upsert(
    {
      tenant_id: input.tenantId,
      chef_id: input.chefId,
      location_id: input.locationId,
      relationship_type: normalizeRelationshipType(input.relationshipType),
      is_public: input.isPublic ?? true,
      is_featured: input.isFeatured ?? true,
      sort_order: input.sortOrder ?? 0,
    },
    { onConflict: 'chef_id,location_id' }
  )

  if (error) {
    throw error
  }
}

async function getChefLocationLinkMap(db: any, chefId: string, locationIds: string[]) {
  if (locationIds.length === 0) return {} as Record<string, any>

  const { data, error } = await db
    .from('chef_location_links')
    .select('location_id, relationship_type, is_public, is_featured, sort_order')
    .eq('chef_id', chefId)
    .in('location_id', locationIds)

  if (error) {
    console.error('[getChefLocationLinkMap] Error:', error)
    return {} as Record<string, any>
  }

  return Object.fromEntries((data || []).map((link: any) => [link.location_id, link]))
}

function mergeLocationRelationship(location: any, link?: any) {
  return {
    ...location,
    experience_tags: normalizeLocationOptionValues(
      location.experience_tags,
      LOCATION_EXPERIENCE_TAG_OPTIONS
    ),
    best_for: normalizeLocationOptionValues(location.best_for, LOCATION_BEST_FOR_OPTIONS),
    service_types: normalizeLocationOptionValues(
      location.service_types,
      LOCATION_SERVICE_TYPE_OPTIONS
    ),
    relationship_type: normalizeRelationshipType(link?.relationship_type),
    is_public: link?.is_public ?? true,
    is_featured: link?.is_featured ?? true,
    sort_order: link?.sort_order ?? 0,
  }
}

async function persistPartnerLocationMutation(
  db: any,
  tenantId: string,
  id: string,
  input: UpdateLocationInput
) {
  const updates = buildLocationWritePayload(input)
  let location: any = null
  let error: any = null

  if (Object.keys(updates).length > 0) {
    const result = await db
      .from('partner_locations')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    location = result.data
    error = result.error
  } else {
    const result = await db
      .from('partner_locations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()
    location = result.data
    error = result.error
  }

  if (error) {
    console.error('[persistPartnerLocationMutation] Error:', error)
    throw new Error('Failed to update location')
  }

  if (
    input.relationship_type !== undefined ||
    input.is_public !== undefined ||
    input.is_featured !== undefined ||
    input.sort_order !== undefined
  ) {
    try {
      await upsertChefLocationLink(db, {
        tenantId,
        chefId: tenantId,
        locationId: id,
        relationshipType: input.relationship_type,
        isPublic: input.is_public,
        isFeatured: input.is_featured,
        sortOrder: input.sort_order,
      })
    } catch (linkError) {
      console.error('[persistPartnerLocationMutation] Link upsert error:', linkError)
      throw new Error('Failed to update location relationship')
    }
  }

  return location
}

// ============================================
// 1. CREATE PARTNER
// ============================================

export async function createPartner(input: CreatePartnerInput) {
  const user = await requireChef()
  const validated = CreatePartnerSchema.parse(input)
  const db: any = createServerClient()

  const { data: partner, error } = await db
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
      commission_type: validated.commission_type ?? 'none',
      commission_rate_percent: validated.commission_rate_percent ?? null,
      commission_flat_cents: validated.commission_flat_cents ?? null,
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
  const db = createServerClient({ admin: true })

  const { data: chef, error: chefError } = await db
    .from('chefs')
    .select('id')
    .eq('slug', chefSlug)
    .single()

  if (chefError || !chef) {
    throw new Error('Chef profile not found')
  }

  const { data: partner, error } = await db
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
  const db: any = createServerClient()

  // Clean empty strings to null
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(validated)) {
    if (value !== undefined) {
      updates[key] = value === '' ? null : value
    }
  }

  const { data: partner, error } = await db
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
  const db: any = createServerClient()

  let query = db
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
  const { data: inquiries } = await db
    .from('inquiries')
    .select('referral_partner_id')
    .eq('tenant_id', user.tenantId!)
    .in('referral_partner_id', partnerIds)

  // Fetch event counts and revenue
  const { data: events } = await db
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
  const db: any = createServerClient({ admin: true })

  const { data: partner, error } = await db
    .from('referral_partners')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getPartnerById] Error:', error)
    return null
  }

  const [
    { data: partnerLocations, error: locationError },
    { data: partnerImages, error: imageError },
  ] = await Promise.all([
    db.from('partner_locations').select('*').eq('partner_id', id).eq('tenant_id', user.tenantId!),
    db.from('partner_images').select('*').eq('partner_id', id).eq('tenant_id', user.tenantId!),
  ])

  if (locationError || imageError) {
    console.error('[getPartnerById] Related data error:', { locationError, imageError })
    throw new Error('Failed to load partner details')
  }

  partner.partner_locations = partnerLocations || []
  partner.partner_images = partnerImages || []

  // Get stats
  const [{ count: inquiryCount }, { count: eventCount }] = await Promise.all([
    db
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('referral_partner_id', id),
    db
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('referral_partner_id', id),
  ])

  // Get completed events for revenue and guest count
  const { data: completedEvents } = await db
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
  const locationStats: Record<
    string,
    {
      inquiry_click_count: number
      booking_click_count: number
      inquiry_count: number
      event_count: number
      completed_event_count: number
      total_revenue_cents: number
      total_guests: number
    }
  > = {}
  if (partner.partner_locations && partner.partner_locations.length > 0) {
    const locIds = partner.partner_locations.map((l: { id: string }) => l.id)
    const linkMap = await getChefLocationLinkMap(db, user.tenantId!, locIds)

    const ensureLocationStats = (locationId: string) => {
      if (!locationStats[locationId]) {
        locationStats[locationId] = {
          inquiry_click_count: 0,
          booking_click_count: 0,
          inquiry_count: 0,
          event_count: 0,
          completed_event_count: 0,
          total_revenue_cents: 0,
          total_guests: 0,
        }
      }
      return locationStats[locationId]
    }

    const { data: locInquiries } = await db
      .from('inquiries')
      .select('partner_location_id')
      .eq('tenant_id', user.tenantId!)
      .in('partner_location_id', locIds)

    const { data: locEvents } = await db
      .from('events')
      .select('partner_location_id, status, quoted_price_cents, guest_count')
      .eq('tenant_id', user.tenantId!)
      .in('partner_location_id', locIds)

    const observabilityDb: any = createServerClient({ admin: true })
    const { data: locationClickEvents } = await observabilityDb
      .from('platform_observability_events')
      .select('event_key, subject_id')
      .eq('tenant_id', user.tenantId!)
      .eq('subject_type', 'location')
      .in('subject_id', locIds)
      .in('event_key', [
        'conversion.location_inquiry_link_clicked',
        'conversion.location_booking_link_clicked',
      ])

    for (const inq of locInquiries || []) {
      if (inq.partner_location_id) {
        ensureLocationStats(inq.partner_location_id).inquiry_count++
      }
    }

    for (const evt of locEvents || []) {
      if (evt.partner_location_id) {
        const stats = ensureLocationStats(evt.partner_location_id)
        stats.event_count++
        if (evt.status === 'completed') {
          stats.completed_event_count++
          stats.total_revenue_cents += evt.quoted_price_cents || 0
          stats.total_guests += evt.guest_count || 0
        }
      }
    }

    for (const clickEvent of locationClickEvents || []) {
      if (!clickEvent.subject_id) continue
      const stats = ensureLocationStats(clickEvent.subject_id)
      if (clickEvent.event_key === 'conversion.location_inquiry_link_clicked') {
        stats.inquiry_click_count++
      }
      if (clickEvent.event_key === 'conversion.location_booking_link_clicked') {
        stats.booking_click_count++
      }
    }

    partner.partner_locations = (partner.partner_locations || [])
      .map((location: any) => {
        const mergedLocation = mergeLocationRelationship(location, linkMap[location.id])
        const readiness = evaluatePublicLocationExperienceReadiness({
          name: mergedLocation.name,
          address: mergedLocation.address,
          city: mergedLocation.city,
          state: mergedLocation.state,
          description: mergedLocation.description,
          experience_tags: mergedLocation.experience_tags,
          best_for: mergedLocation.best_for,
          service_types: mergedLocation.service_types,
          images: buildLocationExperienceImages({
            locationId: mergedLocation.id,
            images: partner.partner_images || [],
            coverImageUrl: partner.cover_image_url ?? null,
          }),
        })

        return {
          ...mergedLocation,
          public_readiness: readiness,
        }
      })
      .sort(
        (a: any, b: any) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
      )
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
  const db: any = createServerClient()

  // Check for linked inquiries or events
  const [{ count: inquiryCount }, { count: eventCount }] = await Promise.all([
    db.from('inquiries').select('*', { count: 'exact', head: true }).eq('referral_partner_id', id),
    db.from('events').select('*', { count: 'exact', head: true }).eq('referral_partner_id', id),
  ])

  if ((inquiryCount || 0) > 0 || (eventCount || 0) > 0) {
    // Soft delete - set inactive to preserve historical data
    const { error } = await db
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
  const { error } = await db
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
  const db: any = createServerClient()

  // Verify partner belongs to this tenant
  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', validated.partner_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) {
    throw new Error('Partner not found')
  }

  const { data: location, error } = await db
    .from('partner_locations')
    .insert({
      tenant_id: user.tenantId!,
      partner_id: validated.partner_id,
      ...buildLocationWritePayload(validated),
    })
    .select()
    .single()

  if (error) {
    console.error('[createPartnerLocation] Error:', error)
    throw new Error('Failed to create location')
  }

  try {
    await upsertChefLocationLink(db, {
      tenantId: user.tenantId!,
      chefId: user.tenantId!,
      locationId: location.id,
      relationshipType: validated.relationship_type,
      isPublic: validated.is_public,
      isFeatured: validated.is_featured,
      sortOrder: validated.sort_order,
    })
  } catch (linkError) {
    console.error('[createPartnerLocation] Link upsert error:', linkError)
    await db
      .from('partner_locations')
      .delete()
      .eq('id', location.id)
      .eq('tenant_id', user.tenantId!)
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
  const db: any = createServerClient()

  const location = await persistPartnerLocationMutation(db, user.tenantId!, id, validated)

  revalidatePath(`/partners/${location.partner_id}`)
  return { success: true, location }
}

// ============================================
// 8. GET PARTNER LOCATIONS
// ============================================

export async function getPartnerLocations(partnerId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: locations, error } = await db
    .from('partner_locations')
    .select('*, partner_images(*)')
    .eq('partner_id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getPartnerLocations] Error:', error)
    throw new Error('Failed to fetch locations')
  }

  const locIds = (locations || []).map((location: any) => location.id)
  const linkMap = await getChefLocationLinkMap(db, user.tenantId!, locIds)

  return (locations || [])
    .map((location: any) => mergeLocationRelationship(location, linkMap[location.id]))
    .sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    )
}

// ============================================
// 9. DELETE PARTNER LOCATION
// ============================================

export async function deletePartnerLocation(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get location to find partner_id for revalidation
  const { data: location } = await db
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
    db.from('inquiries').select('*', { count: 'exact', head: true }).eq('partner_location_id', id),
    db.from('events').select('*', { count: 'exact', head: true }).eq('partner_location_id', id),
  ])

  if ((inquiryCount || 0) > 0 || (eventCount || 0) > 0) {
    // Soft delete
    const { error } = await db
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

  const { error } = await db
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

export async function getPartnerLocationChangeRequests(
  partnerId: string
): Promise<PartnerLocationChangeRequestRecord[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('partner_location_change_requests')
    .select(
      'id, partner_id, location_id, status, requested_payload, partner_note, review_note, created_at, reviewed_at'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPartnerLocationChangeRequests] Error:', error)
    throw new Error('Failed to fetch location change requests')
  }

  return (data as PartnerLocationChangeRequestRecord[]) || []
}

const ReviewPartnerLocationChangeRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(2000).optional().or(z.literal('')),
})

export async function reviewPartnerLocationChangeRequest(input: {
  requestId: string
  decision: 'approved' | 'rejected'
  reviewNote?: string
}) {
  const user = await requireChef()
  const validated = ReviewPartnerLocationChangeRequestSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: request, error } = await db
    .from('partner_location_change_requests')
    .select(
      'id, partner_id, location_id, status, requested_payload, tenant_id, partner_note, review_note'
    )
    .eq('id', validated.requestId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error || !request) {
    throw new Error('Location change request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Location change request has already been reviewed')
  }

  if (validated.decision === 'approved') {
    const proposal = sanitizePartnerLocationProposal(request.requested_payload as any)
    await persistPartnerLocationMutation(db, user.tenantId!, request.location_id, proposal)
  }

  const timestamp = new Date().toISOString()
  const patch =
    validated.decision === 'approved'
      ? {
          status: 'approved',
          review_note: validated.reviewNote || null,
          reviewed_by_auth_user_id: user.id,
          reviewed_at: timestamp,
          applied_at: timestamp,
        }
      : {
          status: 'rejected',
          review_note: validated.reviewNote || null,
          reviewed_by_auth_user_id: user.id,
          reviewed_at: timestamp,
          applied_at: null,
        }

  const { error: updateError } = await db
    .from('partner_location_change_requests')
    .update(patch)
    .eq('id', request.id)

  if (updateError) {
    throw new Error('Failed to update location change request')
  }

  revalidatePath(`/partners/${request.partner_id}`)
  revalidatePath(`/partner/locations/${request.location_id}`)
  revalidatePath('/partner/locations')

  return { success: true }
}

// ============================================
// 10. ADD PARTNER IMAGE
// ============================================

export async function addPartnerImage(input: AddImageInput) {
  const user = await requireChef()
  const validated = AddImageSchema.parse(input)
  const db: any = createServerClient()

  // Verify partner belongs to this tenant
  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', validated.partner_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) {
    throw new Error('Partner not found')
  }

  const { data: image, error } = await db
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
  const db: any = createServerClient()

  // Get image for partner_id revalidation
  const { data: image } = await db
    .from('partner_images')
    .select('partner_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!image) {
    throw new Error('Image not found')
  }

  const { error } = await db
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
  const db: any = createServerClient()

  // Update display_order for each image
  const updates = imageIds.map((imageId, index) =>
    db
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
  const db: any = createServerClient()

  const { data: partners, error } = await db
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
  const db: any = createServerClient({ admin: true })

  // Verify partner belongs to this tenant
  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) throw new Error('Partner not found')

  const { data: events, error } = await db
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
  const db: any = createServerClient({ admin: true })

  // Verify partner belongs to this tenant
  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) throw new Error('Partner not found')

  const { data: events, error } = await db
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
  const db: any = createServerClient()

  if (!eventIds.length) return { success: true, count: 0 }

  // Verify partner belongs to this tenant
  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!partner) throw new Error('Partner not found')

  // If locationId provided, verify it belongs to this partner
  if (locationId) {
    const { data: location } = await db
      .from('partner_locations')
      .select('id')
      .eq('id', locationId)
      .eq('partner_id', partnerId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!location) throw new Error('Location not found or does not belong to this partner')
  }

  // Update events - only touches partner FK columns
  const { error } = await db
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
  const db: any = createServerClient()

  const { data: partner, error: fetchError } = await db
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
    const { error: updateError } = await db
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
  const db = createServerClient({ admin: true })

  // Find partner by share token
  const { data: partner, error } = await db
    .from('referral_partners')
    .select(
      `
      id, name, partner_type, contact_name, description, cover_image_url, tenant_id, created_at,
      partner_locations(id, name, city, state, description, max_guest_count, is_active)
    `
    )
    .eq('share_token' as any, token)
    .eq('status', 'active')
    .single()

  if (error || !partner) return null

  // Expire partner report links after 90 days (application-level check).
  // Partners who need ongoing access should have their token refreshed by the chef.
  const createdAt = partner.created_at ? new Date(partner.created_at as string) : null
  if (createdAt) {
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
    if (Date.now() - createdAt.getTime() > ninetyDaysMs) {
      return null
    }
  }

  // Get chef info
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, profile_image_url')
    .eq('id', partner.tenant_id)
    .single()

  // Get all events linked to this partner (excluding cancelled)
  const { data: events } = await db
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
  const db = createServerClient({ admin: true })

  // Find chef by slug
  const { data: chef, error: chefError } = await db
    .from('chefs')
    .select('id, business_name, display_name, bio, profile_image_url, tagline')
    .eq('slug', chefSlug)
    .single()

  if (chefError || !chef) {
    return null
  }

  // Get showcase-visible partners with locations and images
  const { data: partners, error } = await db
    .from('referral_partners')
    .select(
      `
      id, name, partner_type, booking_url, description, cover_image_url, showcase_order,
      partner_locations(
        id, name, city, state, booking_url, description, max_guest_count,
        experience_tags, best_for, service_types, is_active
      ),
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
