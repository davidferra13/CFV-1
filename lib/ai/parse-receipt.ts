// AI Receipt Extraction
// Uses Gemma 4 native vision via Ollama to extract structured data from receipt photos.
// Fully local, no cloud dependency.

'use server'

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'

// --- Schema ---

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string().default('each'),
  unitPriceCents: z.number().int(),
  totalPriceCents: z.number().int(),
  category: z.enum([
    'protein',
    'produce',
    'dairy',
    'pantry',
    'alcohol',
    'supplies',
    'personal',
    'unknown',
  ]),
})

const ReceiptExtractionSchema = z.object({
  storeName: z.string().nullable(),
  storeLocation: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  purchaseTime: z.string().nullable(),
  lineItems: z.array(LineItemSchema),
  subtotalCents: z.number().int().nullable(),
  taxCents: z.number().int().nullable(),
  totalCents: z.number().int(),
  paymentMethod: z.string().nullable(),
  itemCount: z.number().int(),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()),
})

export type ReceiptLineItem = z.infer<typeof LineItemSchema>
export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>

// --- System Prompt ---

const RECEIPT_SYSTEM_PROMPT = `You are a receipt data extraction specialist for a private chef's expense tracking system.

Extract structured data from the receipt image. Be thorough and accurate.

INSTRUCTIONS:
1. Extract the store name and location/address if visible
2. Extract the date and time of purchase
3. Extract EVERY line item with:
   - Description: expand abbreviations (e.g., "BNLS CHKN BRST" -> "Boneless Chicken Breast", "ORG WHL MLK" -> "Organic Whole Milk")
   - Quantity: default to 1 if not explicit
   - Unit: the purchase unit (e.g., "lb", "oz", "each", "dozen", "gallon", "bunch", "bag", "can"). Default to "each" if not visible. For weight-priced items like "2.31 LB @ $4.99/LB", set unit to "lb" and quantity to 2.31
   - Unit price in cents (multiply dollars by 100). For weight-priced items, this is the per-unit price (e.g., $4.99/lb = 499)
   - Total price in cents
   - Category: classify each item as one of: protein, produce, dairy, pantry, alcohol, supplies, personal, unknown
4. Extract subtotal, tax, and total in cents
5. Note the payment method if visible (e.g., "Visa ending 1234", "Cash", "Debit")
6. Count total number of items

CATEGORIZATION GUIDE:
- protein: meat, poultry, fish, seafood, tofu, tempeh
- produce: fruits, vegetables, herbs, fresh items
- dairy: milk, cheese, butter, cream, eggs, yogurt
- pantry: oils, vinegar, spices, flour, sugar, pasta, rice, canned goods, sauces
- alcohol: wine, beer, spirits, mixers
- supplies: foil, plastic wrap, bags, paper towels, cleaning supplies
- personal: toiletries, household items, pet food, anything clearly non-food/non-cooking
- unknown: cannot determine category

CONFIDENCE LEVELS:
- high: receipt is clear, all items readable, totals match
- medium: some items unclear or abbreviated but mostly readable
- low: receipt is blurry, faded, or partially cut off - significant guessing required

FLAG WARNINGS for:
- Items where the price seems unusually high or low
- Abbreviated items you're uncertain about
- Tax calculations that don't add up
- Missing or unreadable sections`

/**
 * Parse a receipt image using Gemma 4 native vision via Ollama.
 * Accepts a base64-encoded image and returns structured extraction data.
 */
export async function parseReceiptImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
): Promise<ReceiptExtraction> {
  return parseWithOllama(
    RECEIPT_SYSTEM_PROMPT,
    'Extract all data from this receipt. Return only valid JSON.',
    ReceiptExtractionSchema,
    {
      images: [imageBase64],
      maxTokens: 4096,
      timeoutMs: 30_000,
    }
  )
}
