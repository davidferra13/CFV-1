/**
 * Tier 1: RECEIPT
 * Chef's own purchase (manual, grocery_entry, po_receipt, vendor_invoice) within 90 days.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  type PriceRow,
  type ResolvedPrice,
} from '../resolve-price-helpers'

export const receiptPriceResolver: TierResolver = {
  tier: 1,
  name: 'receipt',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const receipt = (await db.execute(sql`
      SELECT price_per_unit_cents, unit, store_name, purchase_date, source
      FROM ingredient_price_history
      WHERE ingredient_id = ${ctx.ingredientId}
        AND tenant_id = ${ctx.tenantId}
        AND source IN ('manual', 'receipt', 'grocery_entry', 'po_receipt', 'vendor_invoice')
        AND purchase_date > CURRENT_DATE - INTERVAL '90 days'
      ORDER BY purchase_date DESC
      LIMIT 1
    `)) as unknown as PriceRow[]

    if (receipt.length > 0) {
      const row = receipt[0]
      if (row.price_per_unit_cents !== null) {
        return withDecay({
          cents: row.price_per_unit_cents,
          unit: row.unit || 'each',
          source: 'receipt',
          sourceTier: row.source,
          resolutionTier: 'chef_receipt',
          store: sourceDisplayStore('receipt', row.store_name),
          confidence: 1.0,
          freshness: computeFreshness(row.purchase_date),
          confirmedAt: row.purchase_date,
          reason: null,
        })
      }
    }

    return null
  },
}
