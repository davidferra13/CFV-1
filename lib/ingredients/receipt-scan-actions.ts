'use server'

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import {
  parseReceiptImage,
  type ReceiptParseResult,
  type ReceiptLineItem,
} from '@/lib/ai/receipt-ocr'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { revalidatePath, revalidateTag } from 'next/cache'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

export interface ReceiptScanResult {
  success: boolean
  error?: string
  receipt: ReceiptParseResult | null
}

export interface ReceiptImportResult {
  success: boolean
  error?: string
  imported: number
  skipped: number
}

/**
 * Scan a receipt image and extract line items.
 * Returns structured data for the chef to review before importing.
 */
export async function scanReceipt(
  imageBase64: string,
  mimeType?: string
): Promise<ReceiptScanResult> {
  await requireChef()

  try {
    const receipt = await parseReceiptImage(imageBase64, mimeType)
    return { success: true, receipt }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to scan receipt',
      receipt: null,
    }
  }
}

/**
 * Import confirmed receipt line items as price history.
 * Called after the chef reviews and confirms the OCR results.
 */
export async function importReceiptPrices(params: {
  storeName: string
  purchaseDate: string
  items: Array<{
    ingredientId: string
    productName: string
    priceCents: number
    unit: string
    quantity: number
  }>
}): Promise<ReceiptImportResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  let imported = 0
  let skipped = 0

  for (const item of params.items) {
    if (!item.ingredientId || !item.priceCents) {
      skipped++
      continue
    }

    try {
      // Calculate per-unit price
      const pricePerUnit =
        item.quantity > 0 ? Math.round(item.priceCents / item.quantity) : item.priceCents

      // Insert into price history
      await db.execute(sql`
        INSERT INTO ingredient_price_history
          (id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
           quantity, unit, purchase_date, store_name, source, notes)
        VALUES (
          gen_random_uuid(), ${item.ingredientId}, ${tenantId},
          ${item.priceCents}, ${pricePerUnit},
          ${item.quantity || 1}, ${item.unit || 'each'}, ${params.purchaseDate},
          ${params.storeName}, 'receipt',
          ${`Receipt scan: ${item.productName}`}
        )
      `)

      // Update ingredient's last price (receipt is highest confidence)
      await db.execute(sql`
        UPDATE ingredients SET
          last_price_cents = ${pricePerUnit},
          last_price_date = ${params.purchaseDate},
          price_unit = ${item.unit || 'each'},
          last_price_source = 'receipt',
          last_price_store = ${params.storeName},
          last_price_confidence = 1.0
        WHERE id = ${item.ingredientId}
          AND tenant_id = ${tenantId}
      `)

      // Also push to Pi for cross-tenant benefit
      try {
        await fetch(`${OPENCLAW_API}/api/prices/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prices: [
              {
                sourceId: `receipt-${params.storeName.toLowerCase().replace(/\s+/g, '-')}`,
                rawProductName: item.productName,
                priceCents: pricePerUnit,
                priceUnit: item.unit || 'each',
                priceType: 'regular',
                pricingTier: 'retail',
                confidence: 'exact_receipt',
              },
            ],
          }),
          signal: AbortSignal.timeout(5000),
        })
      } catch {
        // Non-blocking - Pi push failure doesn't affect local import
      }

      imported++
    } catch (err) {
      console.warn(
        `[receipt] Failed to import ${item.productName}: ${err instanceof Error ? err.message : 'unknown'}`
      )
      skipped++
    }
  }

  if (imported > 0) {
    // Propagate price changes to recipe costs (non-blocking)
    const importedIds = params.items
      .filter((item) => item.ingredientId && item.priceCents)
      .map((item) => item.ingredientId)

    if (importedIds.length > 0) {
      try {
        const { propagatePriceChange } = await import('@/lib/pricing/cost-refresh-actions')
        await propagatePriceChange(importedIds)
      } catch (err) {
        console.error('[non-blocking] Recipe cost cascade failed after receipt import:', err)
      }
    }

    revalidatePath('/ingredients')
    revalidatePath('/recipes')
    revalidateTag('ingredient-prices')
    revalidateTag('recipe-costs')
  }

  return { success: true, imported, skipped }
}
