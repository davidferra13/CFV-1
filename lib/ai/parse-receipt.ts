// AI Receipt Extraction
// Uses Gemini vision to extract structured data from receipt photos

'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const MODEL = 'gemini-2.5-flash'

// --- Schema ---

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number().int(),
  totalPriceCents: z.number().int(),
  category: z.enum([
    'protein', 'produce', 'dairy', 'pantry', 'alcohol', 'supplies', 'personal', 'unknown'
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
   - Description: expand abbreviations (e.g., "BNLS CHKN BRST" → "Boneless Chicken Breast", "ORG WHL MLK" → "Organic Whole Milk")
   - Quantity: default to 1 if not explicit
   - Unit price in cents (multiply dollars by 100)
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
- low: receipt is blurry, faded, or partially cut off — significant guessing required

FLAG WARNINGS for:
- Items where the price seems unusually high or low
- Abbreviated items you're uncertain about
- Tax calculations that don't add up
- Missing or unreadable sections

RESPOND WITH ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "storeName": "string or null",
  "storeLocation": "string or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "purchaseTime": "HH:MM or null",
  "lineItems": [
    {
      "description": "string",
      "quantity": 1,
      "unitPriceCents": 499,
      "totalPriceCents": 499,
      "category": "produce"
    }
  ],
  "subtotalCents": 0,
  "taxCents": 0,
  "totalCents": 0,
  "paymentMethod": "string or null",
  "itemCount": 0,
  "confidence": "high",
  "warnings": []
}`

/**
 * Parse a receipt image using Gemini vision capabilities.
 * Accepts a base64-encoded image and returns structured extraction data.
 */
export async function parseReceiptImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
): Promise<ReceiptExtraction> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Receipt extraction requires a Gemini API key.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: RECEIPT_SYSTEM_PROMPT,
  })

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mediaType,
        data: imageBase64,
      },
    },
    { text: 'Extract all data from this receipt. Return only valid JSON.' },
  ])

  const response = result.response
  const rawText = response.text()

  if (!rawText) {
    throw new Error('No text response from AI')
  }

  // Parse JSON — handle potential markdown wrapping
  let jsonStr = rawText.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('AI returned invalid JSON. Please try again with a clearer photo.')
  }

  // Validate with Zod
  const zodResult = ReceiptExtractionSchema.safeParse(parsed)
  if (!zodResult.success) {
    console.error('[parseReceiptImage] Validation errors:', zodResult.error.issues)
    throw new Error('AI extraction did not match expected format. Please try again.')
  }

  return zodResult.data
}
