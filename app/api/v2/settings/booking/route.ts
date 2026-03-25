// API v2: Booking Page Settings
// GET   /api/v2/settings/booking - Get booking page configuration
// PATCH /api/v2/settings/booking - Update booking page settings

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'

const UpdateBookingBody = z
  .object({
    booking_enabled: z.boolean().optional(),
    booking_slug: z
      .string()
      .min(3, 'Slug must be at least 3 characters')
      .max(50, 'Slug must be at most 50 characters')
      .regex(
        /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
        'Slug: lowercase letters, numbers, and hyphens only (no leading/trailing hyphen)'
      )
      .optional(),
    booking_headline: z.string().max(120).optional(),
    booking_bio_short: z.string().max(280).optional(),
    booking_min_notice_days: z.number().int().min(0).max(90).optional(),
    booking_model: z.enum(['inquiry_first', 'instant_book']).optional(),
    booking_base_price_cents: z.number().int().min(0).optional().nullable(),
    booking_pricing_type: z.enum(['flat_rate', 'per_person']).optional(),
    booking_deposit_type: z.enum(['percent', 'fixed']).optional(),
    booking_deposit_percent: z.number().min(0).max(100).optional().nullable(),
    booking_deposit_fixed_cents: z.number().int().min(0).optional().nullable(),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx) => {
    const { data, error } = await ctx.db
      .from('chefs')
      .select(
        `
        booking_enabled, booking_slug, booking_headline, booking_bio_short, booking_min_notice_days,
        booking_model, booking_base_price_cents, booking_pricing_type,
        booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents
      `
      )
      .eq('id', ctx.tenantId)
      .single()

    if (error || !data) {
      return apiSuccess({
        booking_enabled: false,
        booking_slug: null,
        booking_headline: null,
        booking_bio_short: null,
        booking_min_notice_days: 7,
        booking_model: 'inquiry_first',
        booking_base_price_cents: null,
        booking_pricing_type: 'flat_rate',
        booking_deposit_type: 'percent',
        booking_deposit_percent: null,
        booking_deposit_fixed_cents: null,
      })
    }

    const d = data as any
    return apiSuccess({
      booking_enabled: d.booking_enabled ?? false,
      booking_slug: d.booking_slug ?? null,
      booking_headline: d.booking_headline ?? null,
      booking_bio_short: d.booking_bio_short ?? null,
      booking_min_notice_days: d.booking_min_notice_days ?? 7,
      booking_model: d.booking_model ?? 'inquiry_first',
      booking_base_price_cents: d.booking_base_price_cents ?? null,
      booking_pricing_type: d.booking_pricing_type ?? 'flat_rate',
      booking_deposit_type: d.booking_deposit_type ?? 'percent',
      booking_deposit_percent: d.booking_deposit_percent ?? null,
      booking_deposit_fixed_cents: d.booking_deposit_fixed_cents ?? null,
    })
  },
  { scopes: ['settings:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateBookingBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Validation: instant-book requires base price and Stripe Connect
    if (parsed.data.booking_model === 'instant_book') {
      const basePriceCents = parsed.data.booking_base_price_cents
      if (!basePriceCents || basePriceCents <= 0) {
        // Check if there's an existing base price
        const { data: chef } = await ctx.db
          .from('chefs')
          .select('booking_base_price_cents, stripe_onboarding_complete')
          .eq('id', ctx.tenantId)
          .single()

        const existingPrice = (chef as any)?.booking_base_price_cents
        if (!existingPrice || existingPrice <= 0) {
          return apiError(
            'instant_book_requires_price',
            'Instant-book requires a base price greater than $0',
            422
          )
        }

        if (!(chef as any)?.stripe_onboarding_complete) {
          return apiError(
            'instant_book_requires_stripe',
            'Instant-book requires completed Stripe Connect setup',
            422
          )
        }
      }
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // Only include fields that were provided
    if (parsed.data.booking_enabled !== undefined)
      update.booking_enabled = parsed.data.booking_enabled
    if (parsed.data.booking_slug !== undefined)
      update.booking_slug = parsed.data.booking_slug.toLowerCase().trim()
    if (parsed.data.booking_headline !== undefined)
      update.booking_headline = parsed.data.booking_headline || null
    if (parsed.data.booking_bio_short !== undefined)
      update.booking_bio_short = parsed.data.booking_bio_short || null
    if (parsed.data.booking_min_notice_days !== undefined)
      update.booking_min_notice_days = parsed.data.booking_min_notice_days
    if (parsed.data.booking_model !== undefined) update.booking_model = parsed.data.booking_model
    if (parsed.data.booking_base_price_cents !== undefined)
      update.booking_base_price_cents = parsed.data.booking_base_price_cents
    if (parsed.data.booking_pricing_type !== undefined)
      update.booking_pricing_type = parsed.data.booking_pricing_type
    if (parsed.data.booking_deposit_type !== undefined)
      update.booking_deposit_type = parsed.data.booking_deposit_type
    if (parsed.data.booking_deposit_percent !== undefined)
      update.booking_deposit_percent = parsed.data.booking_deposit_percent
    if (parsed.data.booking_deposit_fixed_cents !== undefined)
      update.booking_deposit_fixed_cents = parsed.data.booking_deposit_fixed_cents

    const { error } = await ctx.db
      .from('chefs')
      .update(update as any)
      .eq('id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/settings/booking] Update error:', error)
      return apiError('update_failed', 'Failed to update booking settings', 500)
    }

    // Return the updated settings
    const { data: updated } = await ctx.db
      .from('chefs')
      .select(
        `
        booking_enabled, booking_slug, booking_headline, booking_bio_short, booking_min_notice_days,
        booking_model, booking_base_price_cents, booking_pricing_type,
        booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents
      `
      )
      .eq('id', ctx.tenantId)
      .single()

    const d = (updated as any) ?? {}
    return apiSuccess({
      booking_enabled: d.booking_enabled ?? false,
      booking_slug: d.booking_slug ?? null,
      booking_headline: d.booking_headline ?? null,
      booking_bio_short: d.booking_bio_short ?? null,
      booking_min_notice_days: d.booking_min_notice_days ?? 7,
      booking_model: d.booking_model ?? 'inquiry_first',
      booking_base_price_cents: d.booking_base_price_cents ?? null,
      booking_pricing_type: d.booking_pricing_type ?? 'flat_rate',
      booking_deposit_type: d.booking_deposit_type ?? 'percent',
      booking_deposit_percent: d.booking_deposit_percent ?? null,
      booking_deposit_fixed_cents: d.booking_deposit_fixed_cents ?? null,
    })
  },
  { scopes: ['settings:write'] }
)
