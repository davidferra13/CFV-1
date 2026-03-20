'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getPricingInsights, type PricingInsights } from './pricing-insights'

// ─── Server Action ───────────────────────────────────────────────────────────

export async function fetchPricingInsights(params: {
  eventType?: string
  guestCountRange?: [number, number]
}): Promise<PricingInsights> {
  const user = await requireChef()

  return getPricingInsights({
    tenantId: user.tenantId!,
    eventType: params.eventType,
    guestCountRange: params.guestCountRange,
  })
}
