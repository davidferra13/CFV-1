/**
 * Receipt OCR - Extract grocery prices from receipt photos.
 *
 * Delegates to parse-receipt.ts (Gemma 4 + parseWithOllama + Zod validation).
 * This file adapts the richer ReceiptExtraction shape into the legacy
 * ReceiptParseResult/ReceiptLineItem types consumed by existing callers.
 */

import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { parseReceiptImage as extractReceipt } from '@/lib/ai/parse-receipt'

export interface ReceiptLineItem {
  rawText: string
  productName: string
  quantity: number
  unitPrice: number // cents
  totalPrice: number // cents
  unit: string
  confidence: number // 0-1
}

export interface ReceiptParseResult {
  success: boolean
  error?: string
  storeName: string | null
  date: string | null
  items: ReceiptLineItem[]
  subtotal: number | null // cents
  tax: number | null // cents
  total: number | null // cents
}

const CONFIDENCE_MAP = { high: 0.95, medium: 0.75, low: 0.4 } as const

/**
 * Parse a grocery receipt image. Delegates to the canonical parse-receipt.ts
 * and adapts the result into the legacy ReceiptParseResult shape.
 */
export async function parseReceiptImage(
  imageBase64: string,
  _mimeType: string = 'image/jpeg'
): Promise<ReceiptParseResult> {
  try {
    const extraction = await extractReceipt(imageBase64)

    const baseConfidence = CONFIDENCE_MAP[extraction.confidence] ?? 0.75

    const items: ReceiptLineItem[] = extraction.lineItems.map((li) => ({
      rawText: li.description,
      productName: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPriceCents,
      totalPrice: li.totalPriceCents,
      unit: li.unit,
      confidence: baseConfidence,
    }))

    return {
      success: true,
      storeName: extraction.storeName,
      date: extraction.purchaseDate,
      items,
      subtotal: extraction.subtotalCents,
      tax: extraction.taxCents,
      total: extraction.totalCents,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return {
      success: false,
      error: msg,
      storeName: null,
      date: null,
      items: [],
      subtotal: null,
      tax: null,
      total: null,
    }
  }
}
