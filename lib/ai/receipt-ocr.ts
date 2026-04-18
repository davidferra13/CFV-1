/**
 * Receipt OCR - Extract grocery prices from receipt photos using Ollama-compatible runtime.
 *
 * Routes through the configured Ollama-compatible endpoint (cloud in production).
 * The chef's purchase prices are the highest-confidence data source (tier 1).
 *
 * Flow:
 *   1. Chef uploads receipt photo
 *   2. AI vision model extracts line items
 *   3. Each item is fuzzy-matched to canonical ingredients
 *   4. Chef confirms/edits matches
 *   5. Prices logged to ingredient_price_history as source='receipt'
 */

import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { getOllamaConfig } from '@/lib/ai/providers'

const OLLAMA_URL = process.env.OLLAMA_URL || getOllamaConfig().baseUrl

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

/**
 * Parse a grocery receipt image using Ollama's vision model.
 * Returns structured line items with product names and prices.
 */
export async function parseReceiptImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ReceiptParseResult> {
  // Check if Ollama is running
  try {
    const health = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!health.ok) throw new Error('Ollama not responding')
  } catch {
    throw new OllamaOfflineError()
  }

  const prompt = `You are analyzing a grocery store receipt image. Extract ALL line items with their prices.

Return a JSON object with this EXACT structure (no markdown, no explanation, just JSON):
{
  "store_name": "Store Name or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    {
      "raw_text": "exact text from receipt",
      "product_name": "cleaned product name",
      "quantity": 1,
      "unit_price_cents": 299,
      "total_price_cents": 299,
      "unit": "each",
      "confidence": 0.9
    }
  ],
  "subtotal_cents": null,
  "tax_cents": null,
  "total_cents": null
}

Rules:
- Convert all prices to cents (integers). $2.99 = 299
- "unit" should be: "lb", "oz", "each", "gallon", "dozen", or the unit shown
- If an item shows weight pricing (e.g., "2.31 LB @ $4.99/LB"), set unit to "lb" and unit_price to the per-lb price
- If quantity > 1 (e.g., "2 @ $1.99"), set quantity and unit_price accordingly
- Skip non-food items (bags, coupons, discounts, tax lines)
- confidence: 0.9+ if clearly readable, 0.5-0.8 if partially obscured
- Return ONLY valid JSON, nothing else`

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4',
        prompt,
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 4096,
        },
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout for vision (Gemma 4 is fast)
    })

    if (!response.ok) {
      const err = await response.text()
      return {
        success: false,
        error: `Ollama error: ${err}`,
        storeName: null,
        date: null,
        items: [],
        subtotal: null,
        tax: null,
        total: null,
      }
    }

    const data = await response.json()
    const text = data.response || ''

    // Extract JSON from response (may have markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Could not parse Ollama response as JSON',
        storeName: null,
        date: null,
        items: [],
        subtotal: null,
        tax: null,
        total: null,
      }
    }

    const parsed = JSON.parse(jsonMatch[0])

    const items: ReceiptLineItem[] = (parsed.items || [])
      .map((item: any) => ({
        rawText: item.raw_text || '',
        productName: item.product_name || item.raw_text || '',
        quantity: item.quantity || 1,
        unitPrice: item.unit_price_cents || 0,
        totalPrice: item.total_price_cents || 0,
        unit: item.unit || 'each',
        confidence: item.confidence || 0.5,
      }))
      .filter((item: ReceiptLineItem) => item.unitPrice > 0 || item.totalPrice > 0)

    return {
      success: true,
      storeName: parsed.store_name || null,
      date: parsed.date || null,
      items,
      subtotal: parsed.subtotal_cents || null,
      tax: parsed.tax_cents || null,
      total: parsed.total_cents || null,
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
