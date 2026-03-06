'use server'

// Remy — Vision Actions (Phase 4A & 4B)
// Receipt scanning and dish photo documentation via Ollama vision models.
// PRIVACY: All images processed locally via Ollama (LLaVA) — never sent to cloud.
// This handles private data: store names, prices, dish photos for the chef's portfolio.

import { Ollama } from 'ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

const VISION_MODEL = 'llava:7b' // or bakllava, minicpm-v
const OLLAMA_ENDPOINTS = [
  process.env.OLLAMA_HOST || 'http://localhost:11434',
  'http://127.0.0.1:11434',
]

async function getOllamaClient(): Promise<Ollama> {
  for (const host of OLLAMA_ENDPOINTS) {
    try {
      const client = new Ollama({ host })
      await client.list() // Quick connectivity check
      return client
    } catch {
      continue
    }
  }
  throw new OllamaOfflineError()
}

// ─── Receipt Scanning (4A) ──────────────────────────────────────────────────

export interface ReceiptData {
  storeName: string | null
  date: string | null
  lineItems: Array<{ name: string; quantity: number | null; price: number | null }>
  subtotal: number | null
  tax: number | null
  total: number | null
  confidence: 'high' | 'medium' | 'low'
}

const RECEIPT_PROMPT = `Analyze this receipt image and extract the following information as JSON:

{
  "storeName": "Store name or null",
  "date": "Date in YYYY-MM-DD format or null",
  "lineItems": [{"name": "item name", "quantity": 1, "price": 4.99}],
  "subtotal": 45.99,
  "tax": 3.68,
  "total": 49.67,
  "confidence": "high" or "medium" or "low"
}

Rules:
- Prices should be numbers (not strings)
- If you can't read a value, set it to null
- confidence = "high" if text is clear, "medium" if partially readable, "low" if mostly unreadable
- Return ONLY valid JSON, no markdown fencing or explanation`

/**
 * Extract structured data from a receipt image using Ollama vision.
 * Returns parsed receipt data for chef confirmation before logging.
 */
export async function scanReceipt(imageBase64: string): Promise<ReceiptData> {
  const client = await getOllamaClient()

  const response = await client.generate({
    model: VISION_MODEL,
    prompt: RECEIPT_PROMPT,
    images: [imageBase64],
    stream: false,
    options: { temperature: 0.1, num_predict: 2000 },
  })

  try {
    // Extract JSON from response (may have markdown fencing)
    const text = response.response.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        storeName: null,
        date: null,
        lineItems: [],
        subtotal: null,
        tax: null,
        total: null,
        confidence: 'low',
      }
    }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      storeName: parsed.storeName ?? null,
      date: parsed.date ?? null,
      lineItems: Array.isArray(parsed.lineItems)
        ? parsed.lineItems.map((item: any) => ({
            name: String(item.name ?? ''),
            quantity: typeof item.quantity === 'number' ? item.quantity : null,
            price: typeof item.price === 'number' ? item.price : null,
          }))
        : [],
      subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
      tax: typeof parsed.tax === 'number' ? parsed.tax : null,
      total: typeof parsed.total === 'number' ? parsed.total : null,
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
    }
  } catch {
    return {
      storeName: null,
      date: null,
      lineItems: [],
      subtotal: null,
      tax: null,
      total: null,
      confidence: 'low',
    }
  }
}

/**
 * Format receipt data as a Remy response for chef confirmation.
 */
export async function formatReceiptForConfirmation(
  data: ReceiptData,
  eventHint?: string
): Promise<string> {
  const lines: string[] = []

  if (data.confidence === 'low') {
    lines.push(
      "**Receipt quality is low** — I couldn't read much. You may need to enter this manually.\n"
    )
  }

  lines.push('**Receipt scan results:**\n')

  if (data.storeName) lines.push(`- **Store:** ${data.storeName}`)
  if (data.date) lines.push(`- **Date:** ${data.date}`)

  if (data.lineItems.length > 0) {
    lines.push(`\n**${data.lineItems.length} items:**`)
    for (const item of data.lineItems.slice(0, 20)) {
      const qty = item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''
      const price = item.price !== null ? ` — $${item.price.toFixed(2)}` : ''
      lines.push(`- ${qty}${item.name}${price}`)
    }
    if (data.lineItems.length > 20) {
      lines.push(`_...and ${data.lineItems.length - 20} more items_`)
    }
  }

  lines.push('')
  if (data.subtotal !== null) lines.push(`- Subtotal: $${data.subtotal.toFixed(2)}`)
  if (data.tax !== null) lines.push(`- Tax: $${data.tax.toFixed(2)}`)
  if (data.total !== null) lines.push(`- **Total: $${data.total.toFixed(2)}**`)

  lines.push('')
  if (eventHint) {
    lines.push(`Log this as an expense for **${eventHint}**? Say "yes" or tell me which event.`)
  } else {
    lines.push(
      'Which event should I log this expense to? Or say "general expense" for non-event spending.'
    )
  }

  return lines.join('\n')
}

// ─── Dish Photo Documentation (4B) ─────────────────────────────────────────

export interface DishPhotoTags {
  dishType: string | null
  presentationStyle: string | null
  platingNotes: string | null
  suggestedTags: string[]
  confidence: 'high' | 'medium' | 'low'
}

const DISH_PHOTO_PROMPT = `Analyze this dish photo and describe it for a private chef's portfolio. Return JSON:

{
  "dishType": "Main category (e.g., 'Beef Wellington', 'Chocolate Tart', 'Lobster Bisque')",
  "presentationStyle": "Plating style (e.g., 'Fine dining', 'Family style', 'Rustic', 'Modern minimalist')",
  "platingNotes": "Brief description of the plating and visual elements",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "confidence": "high" or "medium" or "low"
}

Rules:
- suggestedTags should include: protein, cuisine style, course type, key ingredients, occasion fit
- Return ONLY valid JSON, no markdown fencing`

/**
 * Analyze a dish photo and extract tags/metadata for portfolio documentation.
 */
export async function analyzeDishPhoto(imageBase64: string): Promise<DishPhotoTags> {
  const client = await getOllamaClient()

  const response = await client.generate({
    model: VISION_MODEL,
    prompt: DISH_PHOTO_PROMPT,
    images: [imageBase64],
    stream: false,
    options: { temperature: 0.3, num_predict: 1000 },
  })

  try {
    const text = response.response.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        dishType: null,
        presentationStyle: null,
        platingNotes: null,
        suggestedTags: [],
        confidence: 'low',
      }
    }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      dishType: parsed.dishType ?? null,
      presentationStyle: parsed.presentationStyle ?? null,
      platingNotes: parsed.platingNotes ?? null,
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags.map(String) : [],
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
    }
  } catch {
    return {
      dishType: null,
      presentationStyle: null,
      platingNotes: null,
      suggestedTags: [],
      confidence: 'low',
    }
  }
}

/**
 * Format dish photo analysis as a Remy response.
 */
export async function formatDishPhotoResponse(data: DishPhotoTags): Promise<string> {
  const lines: string[] = ['**Dish photo analysis:**\n']

  if (data.dishType) lines.push(`- **Dish:** ${data.dishType}`)
  if (data.presentationStyle) lines.push(`- **Style:** ${data.presentationStyle}`)
  if (data.platingNotes) lines.push(`- **Notes:** ${data.platingNotes}`)
  if (data.suggestedTags.length > 0) {
    lines.push(`- **Tags:** ${data.suggestedTags.join(', ')}`)
  }

  lines.push('\nWant me to save this to your portfolio? I can tag it and add it to your documents.')

  return lines.join('\n')
}
