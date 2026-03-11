// Booking Page Settings — Server Actions
// Chefs manage their public booking page: slug, enable/disable, headline, bio, notice period.
// Extended for dual booking model: inquiry_first vs instant_book.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

const BookingSettingsSchema = z.object({
  booking_enabled: z.boolean(),
  booking_slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Slug: lowercase letters, numbers, and hyphens only (no leading/trailing hyphen)'
    )
    .optional()
    .or(z.literal('')),
  booking_headline: z.string().max(120).optional().or(z.literal('')),
  booking_bio_short: z.string().max(280).optional().or(z.literal('')),
  booking_min_notice_days: z.number().int().min(0).max(90).default(7),
  booking_model: z.enum(['inquiry_first', 'instant_book']).default('inquiry_first'),
  booking_base_price_cents: z.number().int().min(0).optional().nullable(),
  booking_pricing_type: z.enum(['flat_rate', 'per_person']).default('flat_rate'),
  booking_deposit_type: z.enum(['percent', 'fixed']).default('percent'),
  booking_deposit_percent: z.number().min(0).max(100).optional().nullable(),
  booking_deposit_fixed_cents: z.number().int().min(0).optional().nullable(),
  featured_booking_menu_id: z.string().uuid().nullable().optional().or(z.literal('')),
  featured_booking_badge: z.string().trim().max(40).nullable().optional().or(z.literal('')),
  featured_booking_title: z.string().trim().max(120).nullable().optional().or(z.literal('')),
  featured_booking_pitch: z.string().trim().max(280).nullable().optional().or(z.literal('')),
})

export type BookingSettings = {
  booking_enabled: boolean
  booking_slug: string | null
  booking_headline: string | null
  booking_bio_short: string | null
  booking_min_notice_days: number
  booking_model: 'inquiry_first' | 'instant_book'
  booking_base_price_cents: number | null
  booking_pricing_type: 'flat_rate' | 'per_person'
  booking_deposit_type: 'percent' | 'fixed'
  booking_deposit_percent: number | null
  booking_deposit_fixed_cents: number | null
  featured_booking_menu_id: string | null
  featured_booking_badge: string | null
  featured_booking_title: string | null
  featured_booking_pitch: string | null
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select(
      `
      booking_enabled, booking_slug, booking_headline, booking_bio_short, booking_min_notice_days,
      booking_model, booking_base_price_cents, booking_pricing_type,
      booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents,
      featured_booking_menu_id, featured_booking_badge, featured_booking_title, featured_booking_pitch
    `
    )
    .eq('id', user.entityId)
    .single()

  return {
    booking_enabled: data?.booking_enabled ?? false,
    booking_slug: data?.booking_slug ?? null,
    booking_headline: data?.booking_headline ?? null,
    booking_bio_short: data?.booking_bio_short ?? null,
    booking_min_notice_days: data?.booking_min_notice_days ?? 7,
    booking_model: data?.booking_model ?? 'inquiry_first',
    booking_base_price_cents: data?.booking_base_price_cents ?? null,
    booking_pricing_type: data?.booking_pricing_type ?? 'flat_rate',
    booking_deposit_type: data?.booking_deposit_type ?? 'percent',
    booking_deposit_percent: data?.booking_deposit_percent ?? null,
    booking_deposit_fixed_cents: data?.booking_deposit_fixed_cents ?? null,
    featured_booking_menu_id: data?.featured_booking_menu_id ?? null,
    featured_booking_badge: data?.featured_booking_badge ?? null,
    featured_booking_title: data?.featured_booking_title ?? null,
    featured_booking_pitch: data?.featured_booking_pitch ?? null,
  }
}

export async function upsertBookingSettings(
  input: z.infer<typeof BookingSettingsSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = BookingSettingsSchema.parse(input)
  const supabase: any = createServerClient()
  const shouldUpdateFeaturedMenuSelection = Object.prototype.hasOwnProperty.call(
    input,
    'featured_booking_menu_id'
  )
  const featuredMenuId = shouldUpdateFeaturedMenuSelection
    ? typeof validated.featured_booking_menu_id === 'string' &&
      validated.featured_booking_menu_id.trim()
      ? validated.featured_booking_menu_id.trim()
      : null
    : null

  // Validation: instant-book requires base price and Stripe Connect
  if (validated.booking_model === 'instant_book') {
    if (!validated.booking_base_price_cents || validated.booking_base_price_cents <= 0) {
      return { success: false, error: 'Instant-book requires a base price greater than $0' }
    }

    // Verify Stripe Connect is ready
    const { data: chef } = await supabase
      .from('chefs')
      .select('stripe_onboarding_complete')
      .eq('id', user.entityId)
      .single()

    if (!chef?.stripe_onboarding_complete) {
      return { success: false, error: 'Instant-book requires completed Stripe Connect setup' }
    }
  }

  if (shouldUpdateFeaturedMenuSelection && featuredMenuId) {
    const { data: featuredMenu } = await supabase
      .from('menus')
      .select('id, status')
      .eq('id', featuredMenuId)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .maybeSingle()

    if (!featuredMenu || featuredMenu.status === 'archived') {
      return {
        success: false,
        error: 'Choose an active menu from your library to feature on the booking page.',
      }
    }
  }

  const update: Record<string, unknown> = {
    booking_enabled: validated.booking_enabled,
    booking_min_notice_days: validated.booking_min_notice_days,
    booking_headline: validated.booking_headline || null,
    booking_bio_short: validated.booking_bio_short || null,
    booking_model: validated.booking_model,
    booking_base_price_cents: validated.booking_base_price_cents ?? null,
    booking_pricing_type: validated.booking_pricing_type,
    booking_deposit_type: validated.booking_deposit_type,
    booking_deposit_percent: validated.booking_deposit_percent ?? null,
    booking_deposit_fixed_cents: validated.booking_deposit_fixed_cents ?? null,
    featured_booking_badge: validated.featured_booking_badge || null,
    featured_booking_title: validated.featured_booking_title || null,
    featured_booking_pitch: validated.featured_booking_pitch || null,
  }

  if (shouldUpdateFeaturedMenuSelection) {
    update.featured_booking_menu_id = featuredMenuId
  }

  if (validated.booking_slug) {
    update.booking_slug = validated.booking_slug.toLowerCase().trim()
  }

  const { error } = await supabase.from('chefs').update(update).eq('id', user.entityId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidateTag('chef-booking-profile') // Bust public booking page cache
  revalidateTag(`chef-layout-${user.entityId}`)
  return { success: true }
}

export async function setFeaturedBookingMenuSelection(
  menuId: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const normalizedMenuId = typeof menuId === 'string' && menuId.trim() ? menuId.trim() : null

  const { data: chef, error: chefError } = await supabase
    .from('chefs')
    .select('slug, booking_slug, featured_booking_menu_id')
    .eq('id', user.entityId)
    .single()

  if (chefError || !chef) {
    return { success: false, error: 'Failed to load booking showcase settings.' }
  }

  if (normalizedMenuId) {
    const { data: featuredMenu } = await supabase
      .from('menus')
      .select('id, status')
      .eq('id', normalizedMenuId)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .maybeSingle()

    if (!featuredMenu || featuredMenu.status === 'archived') {
      return {
        success: false,
        error: 'Choose an active menu from your library to feature on your booking page.',
      }
    }
  }

  const { error } = await supabase
    .from('chefs')
    .update({ featured_booking_menu_id: normalizedMenuId })
    .eq('id', user.entityId)

  if (error) {
    return { success: false, error: error.message }
  }

  const affectedMenuIds = new Set<string>()
  if (normalizedMenuId) affectedMenuIds.add(normalizedMenuId)
  if (chef.featured_booking_menu_id) affectedMenuIds.add(chef.featured_booking_menu_id)

  revalidatePath('/menus')
  revalidatePath('/settings')
  for (const affectedMenuId of affectedMenuIds) {
    revalidatePath(`/menus/${affectedMenuId}`)
  }
  if (chef.slug) {
    revalidatePath(`/chef/${chef.slug}`)
    revalidatePath(`/chef/${chef.slug}/inquire`)
  }
  if (chef.booking_slug) {
    revalidatePath(`/book/${chef.booking_slug}`)
  }
  revalidateTag('chef-booking-profile')
  revalidateTag(`chef-layout-${user.entityId}`)

  return { success: true }
}

/**
 * Public booking configuration — no auth required.
 * Returns the booking model, pricing, and deposit config for the public booking page.
 */
export type PublicBookingConfig = {
  bookingModel: 'inquiry_first' | 'instant_book'
  basePriceCents: number | null
  pricingType: 'flat_rate' | 'per_person'
  depositType: 'percent' | 'fixed'
  depositPercent: number | null
  depositFixedCents: number | null
}

export async function getPublicBookingConfig(
  chefSlug: string
): Promise<PublicBookingConfig | null> {
  const supabase: any = createServerClient({ admin: true })

  const { data } = await supabase
    .from('chefs')
    .select(
      `
      booking_model, booking_base_price_cents, booking_pricing_type,
      booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents
    `
    )
    .eq('booking_slug', chefSlug)
    .eq('booking_enabled', true)
    .single()

  if (!data) return null

  return {
    bookingModel: data.booking_model ?? 'inquiry_first',
    basePriceCents: data.booking_base_price_cents ?? null,
    pricingType: data.booking_pricing_type ?? 'flat_rate',
    depositType: data.booking_deposit_type ?? 'percent',
    depositPercent: data.booking_deposit_percent ?? null,
    depositFixedCents: data.booking_deposit_fixed_cents ?? null,
  }
}
