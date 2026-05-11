'use server'

// Server actions for bulk buy UI interactions.

import {
  findBulkBuyOpportunities,
  getShoppingConsolidation,
  type BulkBuyOpportunity,
  type ShoppingConsolidation,
} from './bulk-buy'

export type { BulkBuyOpportunity, ShoppingConsolidation }

/**
 * Get bulk buy opportunities for a date range.
 */
export async function getBulkBuyOpportunities(
  startDate: string,
  endDate: string
): Promise<{ opportunities: BulkBuyOpportunity[]; error?: string }> {
  if (!startDate || !endDate) {
    return { opportunities: [], error: 'Date range required' }
  }

  if (startDate > endDate) {
    return { opportunities: [], error: 'Start date must be before end date' }
  }

  try {
    const opportunities = await findBulkBuyOpportunities({
      start: startDate,
      end: endDate,
    })
    return { opportunities }
  } catch (err: any) {
    console.error('[getBulkBuyOpportunities]', err)
    return { opportunities: [], error: 'Failed to find bulk buy opportunities' }
  }
}

/**
 * Get a consolidated shopping list across events in a date range.
 */
export async function fetchShoppingConsolidation(
  startDate: string,
  endDate: string
): Promise<{ consolidation: ShoppingConsolidation | null; error?: string }> {
  if (!startDate || !endDate) {
    return { consolidation: null, error: 'Date range required' }
  }

  try {
    const consolidation = await getShoppingConsolidation({
      start: startDate,
      end: endDate,
    })
    return { consolidation }
  } catch (err: any) {
    console.error('[fetchShoppingConsolidation]', err)
    return { consolidation: null, error: 'Failed to consolidate shopping list' }
  }
}
