'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zip: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  booking_url: z.string().url().optional().or(z.literal('')),
  max_guest_count: z.number().int().positive().nullable().optional(),
})

export type CreateRestaurantInput = z.infer<typeof CreateRestaurantSchema>

/**
 * Simplified restaurant creation: creates a partner (type=venue, showcase=true)
 * + location + chef_location_link (relationship_type=owner) in one call.
 */
export async function createRestaurant(input: CreateRestaurantInput) {
  const user = await requireChef()
  const validated = CreateRestaurantSchema.parse(input)
  const db: any = createServerClient()

  // Create the partner (venue entity)
  const { data: partner, error: partnerError } = await db
    .from('referral_partners')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      partner_type: 'venue',
      is_showcase_visible: true,
      status: 'active',
      commission_type: 'none',
    })
    .select('id')
    .single()

  if (partnerError || !partner) {
    console.error('[createRestaurant] Partner creation error:', partnerError)
    throw new Error('Failed to create restaurant')
  }

  // Create the location
  const { data: location, error: locationError } = await db
    .from('partner_locations')
    .insert({
      tenant_id: user.tenantId!,
      partner_id: partner.id,
      name: validated.name,
      address: validated.address || null,
      city: validated.city || null,
      state: validated.state || null,
      zip: validated.zip || null,
      description: validated.description || null,
      booking_url: validated.booking_url || null,
      max_guest_count: validated.max_guest_count ?? null,
      is_active: true,
    })
    .select('id')
    .single()

  if (locationError || !location) {
    console.error('[createRestaurant] Location creation error:', locationError)
    // Clean up the partner
    await db.from('referral_partners').delete().eq('id', partner.id).eq('tenant_id', user.tenantId!)
    throw new Error('Failed to create restaurant location')
  }

  // Link chef as owner
  const { error: linkError } = await db.from('chef_location_links').upsert(
    {
      chef_id: user.tenantId!,
      location_id: location.id,
      relationship_type: 'owner',
      is_public: true,
      is_featured: true,
      sort_order: 0,
    },
    { onConflict: 'chef_id,location_id' }
  )

  if (linkError) {
    console.error('[createRestaurant] Link creation error:', linkError)
    // Clean up
    await db
      .from('partner_locations')
      .delete()
      .eq('id', location.id)
      .eq('tenant_id', user.tenantId!)
    await db.from('referral_partners').delete().eq('id', partner.id).eq('tenant_id', user.tenantId!)
    throw new Error('Failed to link restaurant')
  }

  revalidatePath('/settings/restaurants')
  revalidatePath('/chef', 'layout')
  return { success: true as const, partnerId: partner.id, locationId: location.id }
}

/**
 * Get all restaurants owned by the current chef.
 * Returns partners with locations where chef_location_links.relationship_type = 'owner'.
 */
export async function getMyRestaurants() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all location links where this chef is an owner
  const { data: ownerLinks, error: linkError } = await db
    .from('chef_location_links')
    .select('location_id, is_public, is_featured, sort_order')
    .eq('chef_id', user.tenantId!)
    .eq('relationship_type', 'owner')

  if (linkError) {
    if (linkError.code === '42P01' || linkError.code === '42703') return []
    console.error('[getMyRestaurants] Link fetch error:', linkError)
    return []
  }

  if (!ownerLinks || ownerLinks.length === 0) return []

  const locationIds = ownerLinks.map((l: any) => l.location_id)

  // Get the locations
  const { data: locations, error: locError } = await db
    .from('partner_locations')
    .select(
      'id, partner_id, name, address, city, state, zip, description, booking_url, max_guest_count, is_active'
    )
    .in('id', locationIds)
    .eq('tenant_id', user.tenantId!)

  if (locError || !locations) {
    console.error('[getMyRestaurants] Location fetch error:', locError)
    return []
  }

  // Get partner names for display
  const partnerIds = [...new Set(locations.map((l: any) => l.partner_id).filter(Boolean))]
  let partnerMap: Record<string, string> = {}
  if (partnerIds.length > 0) {
    const { data: partners } = await db
      .from('referral_partners')
      .select('id, name, cover_image_url')
      .in('id', partnerIds)

    if (partners) {
      partnerMap = Object.fromEntries(
        partners.map((p: any) => [p.id, { name: p.name, cover_image_url: p.cover_image_url }])
      )
    }
  }

  const linkMap = Object.fromEntries(ownerLinks.map((l: any) => [l.location_id, l]))

  return locations
    .filter((l: any) => l.is_active !== false)
    .map((l: any) => ({
      id: l.id,
      partner_id: l.partner_id,
      name: l.name,
      address: l.address,
      city: l.city,
      state: l.state,
      zip: l.zip,
      description: l.description,
      booking_url: l.booking_url,
      max_guest_count: l.max_guest_count,
      partner_name: (partnerMap[l.partner_id] as any)?.name ?? null,
      cover_image_url: (partnerMap[l.partner_id] as any)?.cover_image_url ?? null,
      is_public: linkMap[l.id]?.is_public ?? true,
      is_featured: linkMap[l.id]?.is_featured ?? true,
      sort_order: linkMap[l.id]?.sort_order ?? 0,
    }))
    .sort((a: any, b: any) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
}

/**
 * Delete a restaurant (removes partner, location, and link).
 */
export async function deleteRestaurant(locationId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the location to find partner_id
  const { data: location } = await db
    .from('partner_locations')
    .select('id, partner_id')
    .eq('id', locationId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!location) {
    throw new Error('Restaurant not found')
  }

  // Remove the link
  await db
    .from('chef_location_links')
    .delete()
    .eq('chef_id', user.tenantId!)
    .eq('location_id', locationId)

  // Deactivate the location
  await db
    .from('partner_locations')
    .update({ is_active: false })
    .eq('id', locationId)
    .eq('tenant_id', user.tenantId!)

  // Check if partner has any other active locations
  const { data: otherLocations } = await db
    .from('partner_locations')
    .select('id')
    .eq('partner_id', location.partner_id)
    .eq('is_active', true)
    .eq('tenant_id', user.tenantId!)

  // If no other active locations, deactivate the partner too
  if (!otherLocations || otherLocations.length === 0) {
    await db
      .from('referral_partners')
      .update({ status: 'inactive' })
      .eq('id', location.partner_id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/settings/restaurants')
  revalidatePath('/chef', 'layout')
  return { success: true as const }
}
