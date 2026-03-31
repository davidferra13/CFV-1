/**
 * Wholesale Price Handler
 * Sync handler for wholesale prices harvested by the email agent.
 * Pulls from the Pi's email-agent SQLite DB via HTTP API
 * and writes to ingredient_price_history with source = 'openclaw_wholesale'.
 */

import { pgClient } from '@/lib/db'
import type { CartridgeSyncResult } from './cartridge-registry'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

export async function handleWholesaleSync(_data: unknown): Promise<CartridgeSyncResult> {
  const sql = pgClient
  let matched = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  try {
    // Pull unsynced wholesale prices from the Pi's email agent
    const res = await fetch(`${OPENCLAW_API}/api/wholesale/unsynced`, {
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      return {
        success: false,
        cartridge: 'wholesale-prices',
        matched: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        errorDetails: [`Pi API returned ${res.status}: ${await res.text()}`],
      }
    }

    const prices = (await res.json()) as WholesalePrice[]

    if (!prices || prices.length === 0) {
      return {
        success: true,
        cartridge: 'wholesale-prices',
        matched: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      }
    }

    for (const price of prices) {
      try {
        if (!price.canonical_ingredient_id) {
          skipped++
          continue
        }

        // Check if this ingredient exists in our system
        const existing = await sql`
          SELECT id FROM system_ingredients WHERE id = ${price.canonical_ingredient_id}
        `

        if (existing.length === 0) {
          skipped++
          continue
        }

        matched++

        // Upsert into ingredient_price_history
        await sql`
          INSERT INTO ingredient_price_history (
            ingredient_id, tenant_id, price_cents, unit, source,
            store_name, purchase_date, notes
          ) VALUES (
            ${price.canonical_ingredient_id},
            NULL,
            ${price.price_cents},
            ${price.unit || 'lb'},
            'openclaw_wholesale',
            ${price.distributor_name || 'wholesale'},
            now(),
            ${`Wholesale: ${price.raw_product_name}${price.case_size ? ` (${price.case_size})` : ''}`}
          )
        `

        updated++
      } catch (err) {
        errors.push(
          `Failed to sync ${price.raw_product_name}: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    }

    return {
      success: true,
      cartridge: 'wholesale-prices',
      matched,
      updated,
      skipped,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined,
    }
  } catch (err) {
    return {
      success: false,
      cartridge: 'wholesale-prices',
      matched,
      updated,
      skipped,
      errors: 1,
      errorDetails: [err instanceof Error ? err.message : 'Unknown error'],
    }
  }
}

interface WholesalePrice {
  id: number
  canonical_ingredient_id: string | null
  raw_product_name: string
  price_cents: number
  unit: string | null
  case_size: string | null
  distributor_name: string | null
}
