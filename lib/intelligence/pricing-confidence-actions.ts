'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  calculatePricingConfidence,
  type PricingConfidenceReport,
} from './pricing-confidence'

/**
 * Get the pricing confidence report for a specific quote.
 * Compares the quote's pricing against historical events and market data.
 */
export async function getPricingConfidenceReport(
  quoteId: string
): Promise<PricingConfidenceReport | null> {
  const user = await requireChef()
  if (!user.tenantId) return null

  try {
    return await calculatePricingConfidence(quoteId, user.tenantId)
  } catch (err) {
    console.error('[getPricingConfidenceReport] Error:', err)
    return null
  }
}
