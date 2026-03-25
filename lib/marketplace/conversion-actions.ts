'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { isMarketplaceSource, getMarketplacePlatform } from './platforms'

export type MarketplaceConversionData = {
  isMarketplace: boolean
  platformLabel: string | null
  platformChannel: string | null
  clientName: string | null
  chefSlug: string | null
  directBookingUrl: string | null
}

const EMPTY: MarketplaceConversionData = {
  isMarketplace: false,
  platformLabel: null,
  platformChannel: null,
  clientName: null,
  chefSlug: null,
  directBookingUrl: null,
}

/**
 * Check if an event came from ANY marketplace platform and return conversion data.
 * Works for Take a Chef, Yhangry, Cozymeal, Bark, Thumbtack, GigSalad, etc.
 */
export async function getMarketplaceConversionData(
  eventId: string
): Promise<MarketplaceConversionData> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  try {
    const { data: event } = await db
      .from('events')
      .select('client_id, inquiry_id, client:clients(full_name, referral_source)')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) return EMPTY

    const client = event.client as { full_name: string; referral_source: string | null } | null

    // Check client referral_source first
    let matchedChannel: string | null = null
    if (isMarketplaceSource(client?.referral_source)) {
      matchedChannel = client!.referral_source!
    }

    // Check inquiry channel if client source didn't match
    if (!matchedChannel && event.inquiry_id) {
      const { data: inquiry } = await db
        .from('inquiries')
        .select('channel')
        .eq('id', event.inquiry_id)
        .eq('tenant_id', tenantId)
        .single()

      if (isMarketplaceSource(inquiry?.channel)) {
        matchedChannel = inquiry!.channel
      }
    }

    if (!matchedChannel) return EMPTY

    const platform = getMarketplacePlatform(matchedChannel)

    // Fetch chef slug for the direct booking link
    const { data: chef } = await db.from('chefs').select('booking_slug').eq('id', tenantId).single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
    const directBookingUrl = chef?.booking_slug
      ? `${appUrl}/chef/${chef.booking_slug}/inquire`
      : null

    return {
      isMarketplace: true,
      platformLabel: platform?.label ?? matchedChannel,
      platformChannel: matchedChannel,
      clientName: client?.full_name || null,
      chefSlug: chef?.booking_slug || null,
      directBookingUrl,
    }
  } catch {
    return EMPTY
  }
}
