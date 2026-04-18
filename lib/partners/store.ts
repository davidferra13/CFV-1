// Tenant-explicit partner helpers for API v2 routes.
// Accepts tenantId directly instead of calling requireChef().

import { createServerClient } from '@/lib/db/server'

/**
 * Bulk assign events to a partner, with tenant ownership validation.
 * Rejects the whole request if any event/partner/location is outside the tenant.
 */
export async function bulkAssignEventsForTenant(
  tenantId: string,
  partnerId: string,
  locationId: string | null,
  eventIds: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const db: any = createServerClient({ admin: true })

  if (!eventIds.length) return { success: true, count: 0 }

  // Verify partner belongs to this tenant
  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .single()

  if (!partner) return { success: false, count: 0, error: 'partner_not_found' }

  // If locationId provided, verify it belongs to this partner
  if (locationId) {
    const { data: location } = await db
      .from('partner_locations')
      .select('id')
      .eq('id', locationId)
      .eq('partner_id', partnerId)
      .eq('tenant_id', tenantId)
      .single()

    if (!location) return { success: false, count: 0, error: 'location_not_found' }
  }

  // Verify ALL events belong to tenant (reject entire request if any don't)
  const { data: ownedEvents } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', eventIds)

  const ownedIds = new Set((ownedEvents ?? []).map((e: any) => e.id))
  const foreign = eventIds.filter((id) => !ownedIds.has(id))
  if (foreign.length > 0) {
    return { success: false, count: 0, error: 'cross_tenant_events' }
  }

  // Update events
  const { error } = await db
    .from('events')
    .update({
      referral_partner_id: partnerId,
      partner_location_id: locationId,
    })
    .eq('tenant_id', tenantId)
    .in('id', eventIds)

  if (error) return { success: false, count: 0, error: error.message }
  return { success: true, count: eventIds.length }
}

// ── Locations ───────────────────────────────────────────────────────────

export async function getPartnerLocationsForTenant(tenantId: string, partnerId: string) {
  const db: any = createServerClient({ admin: true })

  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .single()

  if (!partner) throw new Error('Partner not found')

  const { data, error } = await db
    .from('partner_locations')
    .select('*, partner_images(*)')
    .eq('partner_id', partnerId)
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) throw new Error('Failed to fetch locations')
  return data
}

export async function createPartnerLocationForTenant(
  tenantId: string,
  input: {
    partner_id: string
    name: string
    address?: string
    city?: string
    state?: string
    zip?: string
    booking_url?: string
    description?: string
    notes?: string
    max_guest_count?: number | null
  }
) {
  const db: any = createServerClient({ admin: true })

  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', input.partner_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!partner) throw new Error('Partner not found')

  const { data: location, error } = await db
    .from('partner_locations')
    .insert({
      tenant_id: tenantId,
      partner_id: input.partner_id,
      name: input.name,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      booking_url: input.booking_url || null,
      description: input.description || null,
      notes: input.notes || null,
      max_guest_count: input.max_guest_count ?? null,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to create location')
  return { success: true, location }
}

// ── Images ──────────────────────────────────────────────────────────────

export async function addPartnerImageForTenant(
  tenantId: string,
  input: {
    partner_id: string
    image_url: string
    location_id?: string
    caption?: string
    season?: string
    display_order?: number
  }
) {
  const db: any = createServerClient({ admin: true })

  const { data: partner } = await db
    .from('referral_partners')
    .select('id')
    .eq('id', input.partner_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!partner) throw new Error('Partner not found')

  const { data: image, error } = await db
    .from('partner_images')
    .insert({
      tenant_id: tenantId,
      partner_id: input.partner_id,
      location_id: input.location_id || null,
      image_url: input.image_url,
      caption: input.caption || null,
      season: input.season || null,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to add image')
  return { success: true, image }
}

export async function removePartnerImageForTenant(tenantId: string, imageId: string) {
  const db: any = createServerClient({ admin: true })

  const { data: image } = await db
    .from('partner_images')
    .select('partner_id')
    .eq('id', imageId)
    .eq('tenant_id', tenantId)
    .single()

  if (!image) throw new Error('Image not found')

  const { error } = await db
    .from('partner_images')
    .delete()
    .eq('id', imageId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error('Failed to remove image')
  return { success: true }
}

export async function reorderPartnerImagesForTenant(
  tenantId: string,
  partnerId: string,
  imageIds: string[]
) {
  const db: any = createServerClient({ admin: true })
  const updates = imageIds.map((imageId, index) =>
    db
      .from('partner_images')
      .update({ display_order: index })
      .eq('id', imageId)
      .eq('tenant_id', tenantId)
  )
  await Promise.all(updates)
  return { success: true }
}

// ── Share Link ──────────────────────────────────────────────────────────

export async function generatePartnerShareLinkForTenant(tenantId: string, partnerId: string) {
  const db: any = createServerClient({ admin: true })

  const { data: partner, error: fetchError } = await db
    .from('referral_partners')
    .select('id, share_token')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !partner) throw new Error('Partner not found')

  let token = (partner as any).share_token as string | null

  if (!token) {
    const { randomUUID } = await import('crypto')
    const newToken = randomUUID()
    const { error: updateError } = await db
      .from('referral_partners')
      .update({ share_token: newToken } as any)
      .eq('id', partnerId)
      .eq('tenant_id', tenantId)

    if (updateError) throw new Error('Failed to generate share link')
    token = newToken
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cheflowhq.com'
  return { success: true, url: `${baseUrl}/partner-report/${token}` }
}

// ── Invite ──────────────────────────────────────────────────────────────

export async function generatePartnerInviteForTenant(
  tenantId: string,
  partnerId: string
): Promise<{ success: true; inviteUrl: string }> {
  const db: any = createServerClient({ admin: true })

  const { data: rawPartner } = await db
    .from('referral_partners')
    .select('id, name, claimed_at')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .single()

  const partner = rawPartner as any
  if (!partner) throw new Error('Partner not found')
  if (partner.claimed_at) throw new Error('This partner has already claimed their account.')

  const { randomUUID } = await import('crypto')
  const token = randomUUID()

  await db
    .from('referral_partners')
    .update({ invite_token: token, invite_sent_at: new Date().toISOString() } as any)
    .eq('id', partnerId)

  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://cheflowhq.com'
  return { success: true, inviteUrl: `${APP_URL}/auth/partner-signup?token=${token}` }
}
