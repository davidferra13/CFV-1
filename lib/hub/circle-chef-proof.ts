import type { ChefServiceConfig } from '@/lib/chef-services/service-config-actions'
import { createServerClient } from '@/lib/db/server'
import { getPublicPortfolio, type PublicPortfolioPhoto } from '@/lib/events/photo-actions'
import {
  getPublicChefBuyerSignals,
  getPublicShowcaseMenus,
  type PublicShowcaseMenu,
} from '@/lib/public/chef-profile-readiness'

const CONTEXT_MESSAGE_LIMIT = 24
const SHOWCASE_MENU_LIMIT = 12
const PORTFOLIO_PHOTO_LIMIT = 24

export type CircleChefProofMessage = {
  id: string
  body: string
  createdAt: string
  messageType: string
  notificationType: string | null
}

export type CircleChefProofData = {
  chefId: string
  chefName: string
  pricing: {
    startingPriceLabel: string | null
    dinnerRangeLabel: string | null
    minimumBookingLabel: string | null
    depositLabel: string | null
    includedItems: string[]
    dietaryItems: string[]
  }
  menus: PublicShowcaseMenu[]
  photos: PublicPortfolioPhoto[]
  recentMessages: CircleChefProofMessage[]
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatRange(lowCents: number | null, highCents: number | null): string | null {
  if (lowCents && highCents && lowCents !== highCents) {
    return `${formatCurrency(lowCents)}-${formatCurrency(highCents)}`
  }

  const singleValue = lowCents ?? highCents
  return singleValue ? formatCurrency(singleValue) : null
}

function formatStartingPrice(input: {
  basePriceCents: number | null
  pricingType: 'flat_rate' | 'per_person' | null
}): string | null {
  if (!input.basePriceCents) return null

  return `${formatCurrency(input.basePriceCents)}/${input.pricingType === 'per_person' ? 'person' : 'booking'}`
}

function formatDepositLabel(input: {
  depositType: 'percent' | 'fixed' | null
  depositPercent: number | null
  depositFixedCents: number | null
}): string | null {
  if (input.depositType === 'fixed' && input.depositFixedCents) {
    return `${formatCurrency(input.depositFixedCents)} to hold the date`
  }

  if (typeof input.depositPercent === 'number' && input.depositPercent > 0) {
    return `${input.depositPercent}% to hold the date`
  }

  return null
}

export async function getCircleChefProofData(input: {
  groupId: string
  tenantId: string | null
}): Promise<CircleChefProofData | null> {
  if (!input.tenantId) return null

  const db: any = createServerClient({ admin: true })

  const [chefResult, serviceConfigResult, recentMessagesResult, menus, photos] = await Promise.all([
    db
      .from('chefs')
      .select(
        'id, display_name, business_name, booking_base_price_cents, booking_pricing_type, booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents'
      )
      .eq('id', input.tenantId)
      .single(),
    db.from('chef_service_config').select('*').eq('chef_id', input.tenantId).maybeSingle(),
    db
      .from('hub_messages')
      .select('id, body, created_at, message_type, notification_type')
      .eq('group_id', input.groupId)
      .is('deleted_at', null)
      .not('body', 'is', null)
      .order('created_at', { ascending: false })
      .limit(CONTEXT_MESSAGE_LIMIT),
    getPublicShowcaseMenus(input.tenantId, { limit: SHOWCASE_MENU_LIMIT }).catch(() => []),
    getPublicPortfolio(input.tenantId, { limit: PORTFOLIO_PHOTO_LIMIT }).catch(() => []),
  ])

  if (!chefResult.data) return null

  const chef = chefResult.data as {
    id: string
    display_name: string | null
    business_name: string | null
    booking_base_price_cents: number | null
    booking_pricing_type: 'flat_rate' | 'per_person' | null
    booking_deposit_type: 'percent' | 'fixed' | null
    booking_deposit_percent: number | null
    booking_deposit_fixed_cents: number | null
  }

  const serviceConfig = (serviceConfigResult.data ?? null) as ChefServiceConfig | null
  const buyerSignals = await getPublicChefBuyerSignals(
    input.tenantId,
    {
      bookingBasePriceCents: chef.booking_base_price_cents,
      bookingPricingType: chef.booking_pricing_type,
      bookingDepositType: chef.booking_deposit_type,
      bookingDepositPercent: chef.booking_deposit_percent,
      bookingDepositFixedCents: chef.booking_deposit_fixed_cents,
    },
    serviceConfig
  ).catch(() => null)

  const recentMessages = (
    (recentMessagesResult.data ?? []) as Array<{
      id: string
      body: string | null
      created_at: string
      message_type: string
      notification_type: string | null
    }>
  )
    .filter((message) => message.body && message.message_type !== 'system')
    .map((message) => ({
      id: message.id,
      body: message.body ?? '',
      createdAt: message.created_at,
      messageType: message.message_type,
      notificationType: message.notification_type,
    }))

  return {
    chefId: chef.id,
    chefName: chef.display_name || chef.business_name || 'Your chef',
    pricing: {
      startingPriceLabel: formatStartingPrice({
        basePriceCents: chef.booking_base_price_cents,
        pricingType: chef.booking_pricing_type,
      }),
      dinnerRangeLabel: buyerSignals
        ? formatRange(buyerSignals.pricing.dinnerLowCents, buyerSignals.pricing.dinnerHighCents)
        : null,
      minimumBookingLabel:
        buyerSignals?.pricing.minimumBookingCents != null
          ? formatCurrency(buyerSignals.pricing.minimumBookingCents)
          : null,
      depositLabel: buyerSignals
        ? formatDepositLabel({
            depositType: buyerSignals.pricing.depositType,
            depositPercent: buyerSignals.pricing.depositPercent,
            depositFixedCents: buyerSignals.pricing.depositFixedCents,
          })
        : null,
      includedItems: buyerSignals?.service.includedItems.slice(0, 4) ?? [],
      dietaryItems: buyerSignals?.service.dietaryItems.slice(0, 3) ?? [],
    },
    menus,
    photos,
    recentMessages,
  }
}
