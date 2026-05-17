'use server'

/**
 * Fixed Menu Offerings - Server Actions
 *
 * Publish menus as bookable products, manage pricing/availability,
 * and handle the "Book This Menu" client flow.
 * All chef actions enforce auth gate + tenant scoping.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import type {
  MenuOffering,
  PublicOffering,
  PublishOfferingInput,
  UpdateOfferingInput,
  BookingInput,
  OfferingBooking,
} from './fixed-offering-types'

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const VALID_SEASONS = ['all_season', 'spring', 'summer', 'fall', 'winter'] as const

function validateSeasons(seasons: string[]): void {
  for (const s of seasons) {
    if (!(VALID_SEASONS as readonly string[]).includes(s)) {
      throw new UnknownAppError(`Invalid season: ${s}`)
    }
  }
}

function validateDaysOfWeek(days: number[] | null | undefined): void {
  if (!days) return
  for (const d of days) {
    if (!Number.isInteger(d) || d < 0 || d > 6) {
      throw new UnknownAppError(
        `Invalid day of week: ${d}. Must be 0 (Sunday) through 6 (Saturday).`
      )
    }
  }
}

// -------------------------------------------------------------------
// publishMenuAsOffering
// -------------------------------------------------------------------

/**
 * Mark a menu as a bookable offering with pricing and availability.
 * Sets is_showcase = true on the menu (offerings are always showcased).
 */
export async function publishMenuAsOffering(
  menuId: string,
  input: PublishOfferingInput
): Promise<MenuOffering> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Validate input
  if (!input.price_per_head_cents || input.price_per_head_cents <= 0) {
    throw new UnknownAppError('Price per head is required and must be positive')
  }

  const minGuests = input.min_guests ?? 2
  const maxGuests = input.max_guests ?? 20
  if (minGuests < 1) throw new UnknownAppError('Minimum guests must be at least 1')
  if (maxGuests < minGuests) throw new UnknownAppError('Maximum guests must be >= minimum guests')

  const seasons = input.available_seasons ?? ['all_season']
  validateSeasons(seasons)
  validateDaysOfWeek(input.available_days_of_week)

  // Verify menu exists, belongs to tenant, and is not archived/deleted
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id, name, status')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single()

  if (menuErr || !menu) {
    throw new UnknownAppError('Menu not found')
  }

  if (menu.status === 'archived') {
    throw new UnknownAppError('Cannot create an offering from an archived menu')
  }

  // Check if an offering already exists for this menu+tenant (not archived)
  const { data: existing } = await db
    .from('menu_offerings')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .maybeSingle()

  if (existing) {
    throw new UnknownAppError('An offering already exists for this menu. Update it instead.')
  }

  // Generate slug
  const baseSlug = input.slug ? slugify(input.slug) : slugify(menu.name)
  let slug = baseSlug
  let attempt = 0

  // Ensure slug uniqueness within tenant
  while (true) {
    const { data: slugCheck } = await db
      .from('menu_offerings')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', slug)
      .maybeSingle()

    if (!slugCheck) break

    attempt++
    slug = `${baseSlug}-${attempt}`
    if (attempt > 10) {
      throw new UnknownAppError('Could not generate a unique slug. Please provide a custom slug.')
    }
  }

  // Insert offering
  const { data, error } = await db
    .from('menu_offerings')
    .insert({
      tenant_id: tenantId,
      menu_id: menuId,
      price_per_head_cents: input.price_per_head_cents,
      min_guests: minGuests,
      max_guests: maxGuests,
      available_seasons: seasons,
      available_days_of_week: input.available_days_of_week ?? null,
      booking_lead_time_days: input.booking_lead_time_days ?? 7,
      slug,
      tagline: input.tagline ?? null,
      hero_image_url: input.hero_image_url ?? null,
      description: input.description ?? null,
      active: true,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[publishMenuAsOffering] insert error:', error)
    throw new UnknownAppError('Failed to create offering')
  }

  // Ensure menu is marked as showcase (offerings are always visible)
  await db
    .from('menus')
    .update({ is_showcase: true, updated_by: user.id })
    .eq('id', menuId)
    .eq('tenant_id', tenantId)

  revalidatePath('/menus')
  revalidatePath(`/menus/${menuId}`)
  return data as MenuOffering
}

// -------------------------------------------------------------------
// updateOffering
// -------------------------------------------------------------------

/**
 * Update an existing offering's pricing, availability, or display fields.
 */
export async function updateOffering(
  offeringId: string,
  input: UpdateOfferingInput
): Promise<MenuOffering> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch offering, verify tenant
  const { data: offering, error: fetchErr } = await db
    .from('menu_offerings')
    .select('id, tenant_id, menu_id')
    .eq('id', offeringId)
    .single()

  if (fetchErr || !offering) {
    throw new UnknownAppError('Offering not found')
  }

  if (offering.tenant_id !== user.tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  // Validate fields if provided
  if (input.price_per_head_cents !== undefined && input.price_per_head_cents <= 0) {
    throw new UnknownAppError('Price per head must be positive')
  }

  if (input.min_guests !== undefined && input.min_guests < 1) {
    throw new UnknownAppError('Minimum guests must be at least 1')
  }

  if (input.available_seasons) {
    validateSeasons(input.available_seasons)
  }

  validateDaysOfWeek(input.available_days_of_week)

  // Build update payload (only provided fields)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.price_per_head_cents !== undefined)
    updates.price_per_head_cents = input.price_per_head_cents
  if (input.min_guests !== undefined) updates.min_guests = input.min_guests
  if (input.max_guests !== undefined) updates.max_guests = input.max_guests
  if (input.available_seasons !== undefined) updates.available_seasons = input.available_seasons
  if (input.available_days_of_week !== undefined)
    updates.available_days_of_week = input.available_days_of_week
  if (input.booking_lead_time_days !== undefined)
    updates.booking_lead_time_days = input.booking_lead_time_days
  if (input.tagline !== undefined) updates.tagline = input.tagline
  if (input.hero_image_url !== undefined) updates.hero_image_url = input.hero_image_url
  if (input.description !== undefined) updates.description = input.description
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order
  if (input.active !== undefined) updates.active = input.active

  // Cross-validate min/max if both are present in the update
  const finalMin = input.min_guests
  const finalMax = input.max_guests
  if (finalMin !== undefined && finalMax !== undefined && finalMax < finalMin) {
    throw new UnknownAppError('Maximum guests must be >= minimum guests')
  }

  const { data, error } = await db
    .from('menu_offerings')
    .update(updates)
    .eq('id', offeringId)
    .select()
    .single()

  if (error || !data) {
    console.error('[updateOffering] error:', error)
    throw new UnknownAppError('Failed to update offering')
  }

  revalidatePath('/menus')
  revalidatePath(`/menus/${offering.menu_id}`)
  return data as MenuOffering
}

// -------------------------------------------------------------------
// getChefOfferings
// -------------------------------------------------------------------

/**
 * Get all offerings for the current chef (active and inactive, excludes archived).
 */
export async function getChefOfferings(): Promise<
  Array<MenuOffering & { menu_name: string; menu_status: string }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_offerings')
    .select(
      `
      *,
      menus!inner (name, status)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getChefOfferings] error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    menu_name: row.menus?.name ?? 'Unknown',
    menu_status: row.menus?.status ?? 'unknown',
    menus: undefined,
  }))
}

// -------------------------------------------------------------------
// getPublicOfferings
// -------------------------------------------------------------------

/**
 * Get active offerings for a chef's public profile page.
 * No auth required. Uses admin client to bypass RLS.
 */
export async function getPublicOfferings(chefSlug: string): Promise<PublicOffering[]> {
  const db: any = createServerClient({ admin: true })

  // Resolve chef by booking slug or public slug
  const { data: chef } = await db
    .from('chefs')
    .select('id')
    .or(`booking_slug.eq.${chefSlug},slug.eq.${chefSlug}`)
    .single()

  if (!chef) return []

  const { data, error } = await db
    .from('menu_offerings')
    .select(
      `
      id, slug, price_per_head_cents, min_guests, max_guests,
      tagline, hero_image_url, description, available_seasons,
      available_days_of_week, booking_lead_time_days, booking_count,
      menus!inner (
        id, name, cuisine_type, service_style,
        dishes (id, dietary_tags)
      )
    `
    )
    .eq('tenant_id', chef.id)
    .eq('active', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getPublicOfferings] error:', error)
    return []
  }

  return (data ?? []).map((row: any) => {
    const dishes = row.menus?.dishes ?? []
    const allTags = dishes.flatMap((d: any) => d.dietary_tags ?? [])
    const uniqueTags = [...new Set(allTags)] as string[]

    return {
      id: row.id,
      slug: row.slug,
      price_per_head_cents: row.price_per_head_cents,
      min_guests: row.min_guests,
      max_guests: row.max_guests,
      tagline: row.tagline,
      hero_image_url: row.hero_image_url,
      description: row.description,
      available_seasons: row.available_seasons,
      available_days_of_week: row.available_days_of_week,
      booking_lead_time_days: row.booking_lead_time_days,
      booking_count: row.booking_count,
      menu: {
        id: row.menus.id,
        name: row.menus.name,
        cuisine_type: row.menus.cuisine_type,
        service_style: row.menus.service_style,
        dish_count: dishes.length,
        dietary_tags: uniqueTags,
      },
    } satisfies PublicOffering
  })
}

// -------------------------------------------------------------------
// deactivateOffering
// -------------------------------------------------------------------

/**
 * Soft-deactivate an offering (sets active = false).
 * Does not archive; chef can reactivate later.
 */
export async function deactivateOffering(offeringId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: offering, error: fetchErr } = await db
    .from('menu_offerings')
    .select('id, tenant_id, menu_id')
    .eq('id', offeringId)
    .single()

  if (fetchErr || !offering) {
    throw new UnknownAppError('Offering not found')
  }

  if (offering.tenant_id !== user.tenantId) {
    throw new UnknownAppError('Tenant mismatch')
  }

  const { error } = await db
    .from('menu_offerings')
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offeringId)

  if (error) {
    console.error('[deactivateOffering] error:', error)
    throw new UnknownAppError('Failed to deactivate offering')
  }

  revalidatePath('/menus')
}

// -------------------------------------------------------------------
// bookOffering
// -------------------------------------------------------------------

/**
 * "Book This Menu" flow: client selects an offering, provides event details.
 * Creates a draft event with the offering's menu duplicated and attached.
 * Returns the created booking record.
 *
 * This action does NOT require chef auth; it uses admin client.
 * The booking is attributed to the client via the input fields.
 */
export async function bookOffering(
  offeringId: string,
  input: BookingInput
): Promise<OfferingBooking> {
  const db: any = createServerClient({ admin: true })

  // Fetch offering with menu info
  const { data: offering, error: offerErr } = await db
    .from('menu_offerings')
    .select(
      `
      id, tenant_id, menu_id, price_per_head_cents,
      min_guests, max_guests, booking_lead_time_days,
      available_seasons, available_days_of_week, active, archived_at,
      booking_count
    `
    )
    .eq('id', offeringId)
    .single()

  if (offerErr || !offering) {
    throw new UnknownAppError('Offering not found')
  }

  if (!offering.active || offering.archived_at) {
    throw new UnknownAppError('This offering is no longer available')
  }

  // Validate guest count
  if (input.guest_count < offering.min_guests || input.guest_count > offering.max_guests) {
    throw new UnknownAppError(
      `This menu serves ${offering.min_guests} to ${offering.max_guests} guests.`
    )
  }

  // Validate lead time
  const eventDate = new Date(input.event_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < offering.booking_lead_time_days) {
    throw new UnknownAppError(
      `This menu requires at least ${offering.booking_lead_time_days} days notice.`
    )
  }

  // Validate day of week
  if (offering.available_days_of_week && offering.available_days_of_week.length > 0) {
    const requestedDay = eventDate.getDay()
    if (!offering.available_days_of_week.includes(requestedDay)) {
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]
      const allowedDays = offering.available_days_of_week.map((d: number) => dayNames[d]).join(', ')
      throw new UnknownAppError(`This menu is only available on ${allowedDays}.`)
    }
  }

  // Find or create client record
  const { data: existingClient } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', offering.tenant_id)
    .eq('email', input.contact_email)
    .maybeSingle()

  let clientId: string

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientErr } = await db
      .from('clients')
      .insert({
        tenant_id: offering.tenant_id,
        name: input.contact_name,
        email: input.contact_email,
        phone: input.contact_phone ?? null,
        source: 'offering_booking',
      })
      .select('id')
      .single()

    if (clientErr || !newClient) {
      console.error('[bookOffering] client creation error:', clientErr)
      throw new UnknownAppError('Failed to create client record')
    }
    clientId = newClient.id
  }

  // Duplicate the menu for this event (snapshot at booking time)
  const { data: sourceMenu } = await db
    .from('menus')
    .select('name, description, cuisine_type, service_style, target_guest_count, notes')
    .eq('id', offering.menu_id)
    .single()

  const { data: duplicatedMenu, error: menuDupErr } = await db
    .from('menus')
    .insert({
      tenant_id: offering.tenant_id,
      name: sourceMenu?.name ?? 'Booked Menu',
      description: sourceMenu?.description ?? null,
      cuisine_type: sourceMenu?.cuisine_type ?? null,
      service_style: sourceMenu?.service_style ?? null,
      target_guest_count: input.guest_count,
      notes: sourceMenu?.notes ?? null,
      status: 'draft',
      origin_type: 'templated',
      origin_metadata: {
        type: 'templated',
        template_id: offering.menu_id,
        template_name: sourceMenu?.name ?? 'Offering Menu',
      },
    })
    .select('id')
    .single()

  if (menuDupErr || !duplicatedMenu) {
    console.error('[bookOffering] menu duplication error:', menuDupErr)
    throw new UnknownAppError('Failed to prepare menu for booking')
  }

  // Copy dishes from source menu to duplicated menu
  const { data: sourceDishes } = await db
    .from('dishes')
    .select('*')
    .eq('menu_id', offering.menu_id)
    .order('course_number', { ascending: true })

  if (sourceDishes && sourceDishes.length > 0) {
    const dishInserts = sourceDishes.map((dish: any) => ({
      menu_id: duplicatedMenu.id,
      tenant_id: offering.tenant_id,
      name: dish.name,
      description: dish.description,
      course_name: dish.course_name,
      course_number: dish.course_number,
      dietary_tags: dish.dietary_tags,
      allergen_flags: dish.allergen_flags,
      position: dish.position,
    }))

    await db.from('dishes').insert(dishInserts)
  }

  // Create draft event
  const { data: event, error: eventErr } = await db
    .from('events')
    .insert({
      tenant_id: offering.tenant_id,
      client_id: clientId,
      menu_id: duplicatedMenu.id,
      status: 'draft',
      event_date: input.event_date,
      guest_count: input.guest_count,
      location: input.location,
      notes: input.notes ?? null,
      quoted_price_cents: offering.price_per_head_cents * input.guest_count,
    })
    .select('id')
    .single()

  if (eventErr || !event) {
    console.error('[bookOffering] event creation error:', eventErr)
    throw new UnknownAppError('Failed to create event')
  }

  // Link the duplicated menu to the event
  await db.from('menus').update({ event_id: event.id }).eq('id', duplicatedMenu.id)

  // Record the booking
  const totalCents = offering.price_per_head_cents * input.guest_count
  const { data: booking, error: bookingErr } = await db
    .from('offering_bookings')
    .insert({
      offering_id: offeringId,
      event_id: event.id,
      client_id: clientId,
      guest_count: input.guest_count,
      price_per_head_cents: offering.price_per_head_cents,
      total_cents: totalCents,
    })
    .select()
    .single()

  if (bookingErr || !booking) {
    console.error('[bookOffering] booking record error:', bookingErr)
    throw new UnknownAppError('Failed to record booking')
  }

  // Increment booking_count on the offering
  await db
    .from('menu_offerings')
    .update({
      booking_count: (offering.booking_count ?? 0) + 1,
      last_booked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', offeringId)

  return booking as OfferingBooking
}

// -------------------------------------------------------------------
// getOfferingBySlug (public)
// -------------------------------------------------------------------

/**
 * Fetch a single offering by chef slug + offering slug.
 * Used for the direct-link landing page.
 */
export async function getOfferingBySlug(
  chefSlug: string,
  offeringSlug: string
): Promise<PublicOffering | null> {
  const db: any = createServerClient({ admin: true })

  const { data: chef } = await db
    .from('chefs')
    .select('id')
    .or(`booking_slug.eq.${chefSlug},slug.eq.${chefSlug}`)
    .single()

  if (!chef) return null

  const { data, error } = await db
    .from('menu_offerings')
    .select(
      `
      id, slug, price_per_head_cents, min_guests, max_guests,
      tagline, hero_image_url, description, available_seasons,
      available_days_of_week, booking_lead_time_days, booking_count,
      menus!inner (
        id, name, cuisine_type, service_style,
        dishes (id, dietary_tags)
      )
    `
    )
    .eq('tenant_id', chef.id)
    .eq('slug', offeringSlug)
    .eq('active', true)
    .is('archived_at', null)
    .single()

  if (error || !data) return null

  const dishes = data.menus?.dishes ?? []
  const allTags = dishes.flatMap((d: any) => d.dietary_tags ?? [])
  const uniqueTags = [...new Set(allTags)] as string[]

  return {
    id: data.id,
    slug: data.slug,
    price_per_head_cents: data.price_per_head_cents,
    min_guests: data.min_guests,
    max_guests: data.max_guests,
    tagline: data.tagline,
    hero_image_url: data.hero_image_url,
    description: data.description,
    available_seasons: data.available_seasons,
    available_days_of_week: data.available_days_of_week,
    booking_lead_time_days: data.booking_lead_time_days,
    booking_count: data.booking_count,
    menu: {
      id: data.menus.id,
      name: data.menus.name,
      cuisine_type: data.menus.cuisine_type,
      service_style: data.menus.service_style,
      dish_count: dishes.length,
      dietary_tags: uniqueTags,
    },
  }
}
