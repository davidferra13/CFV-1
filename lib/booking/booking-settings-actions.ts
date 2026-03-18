// Booking Page Settings - Server Actions
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
      booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents
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
  }
}

export async function upsertBookingSettings(
  input: z.infer<typeof BookingSettingsSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = BookingSettingsSchema.parse(input)
  const supabase: any = createServerClient()

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
  }

  if (validated.booking_slug) {
    update.booking_slug = validated.booking_slug.toLowerCase().trim()
  }

  const { error } = await supabase.from('chefs').update(update).eq('id', user.entityId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidateTag('chef-booking-profile') // Bust public booking page cache
  return { success: true }
}

/**
 * Public booking configuration - no auth required.
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
