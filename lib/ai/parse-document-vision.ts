// AI Vision Document Parser
// Accepts images or PDFs, detects content type, and extracts structured data

'use server'

import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const MODEL = 'gemini-2.5-flash'

// --- Schemas ---

const VisionDetectionSchema = z.object({
  detectedType: z.enum(['client_info', 'recipe', 'receipt', 'document']),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()),
  extractedData: z.record(z.string(), z.unknown()),
})

export type VisionDetectionResult = z.infer<typeof VisionDetectionSchema>

// --- System Prompt ---

const VISION_SYSTEM_PROMPT = `You are a multi-purpose document analysis AI for a private chef business management system.
You receive images or PDFs and must:

1. DETECT what type of content is in the document
2. EXTRACT structured data based on the detected type

CONTENT TYPES AND THEIR SCHEMAS:

### client_info
Client contact/profile information. Extract:
{
  "full_name": "string",
  "email": "string or null",
  "phone": "string or null",
  "partner_name": "string or null",
  "address": "string or null",
  "dietary_restrictions": ["string"],
  "allergies": ["string"],
  "dislikes": ["string"],
  "notes": "string or null"
}

### recipe
Recipe with ingredients and method. Extract:
{
  "name": "string",
  "category": "sauce|protein|starch|vegetable|fruit|dessert|bread|pasta|soup|salad|appetizer|condiment|beverage|other",
  "description": "string or null",
  "method": "string",
  "ingredients": [{"name": "string", "quantity": 0, "unit": "string", "preparation_notes": "string or null"}],
  "yield_description": "string or null",
  "prep_time_minutes": null,
  "cook_time_minutes": null,
  "dietary_tags": ["string"],
  "allergen_flags": ["string"],
  "notes": "string or null"
}

### receipt
Store receipt or invoice. Extract:
{
  "storeName": "string or null",
  "storeLocation": "string or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "lineItems": [{"description": "string", "quantity": 1, "unitPriceCents": 0, "totalPriceCents": 0, "category": "protein|produce|dairy|pantry|alcohol|supplies|personal|unknown"}],
  "subtotalCents": 0,
  "taxCents": 0,
  "totalCents": 0,
  "paymentMethod": "string or null",
  "itemCount": 0
}

### document
Contracts, policies, templates, or general documents. Extract:
{
  "title": "string",
  "document_type": "contract|template|policy|checklist|note|general",
  "content_text": "full text content",
  "summary": "1-3 sentence summary",
  "key_terms": [{"term": "string", "value": "string"}],
  "tags": ["string"]
}

RULES:
- Choose the SINGLE best matching type
- Do NOT invent data — only extract what is clearly present
- For receipts, convert all money values to cents (multiply dollars by 100)
- For recipes, expand abbreviations
- For allergies, over-flag rather than miss
- If the document is blurry or hard to read, set confidence to "low" and add warnings

RESPOND WITH ONLY valid JSON:
{
  "detectedType": "client_info|recipe|receipt|document",
  "confidence": "high|medium|low",
  "warnings": [],
  "extractedData": { ... }
}`

/**
 * Parse an uploaded file (image or PDF) using Gemini vision.
 * Detects content type and extracts structured data.
 */
export async function parseDocumentWithVision(
  base64Data: string,
  mediaType: string,
  filename?: string
): Promise<VisionDetectionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. File import requires a Gemini API key.')
  }

  const ai = new GoogleGenAI({ apiKey })
  const isPdf = mediaType === 'application/pdf'

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        inlineData: {
          mimeType: mediaType,
          data: base64Data,
        },
      },
      {
        text: `Analyze this ${isPdf ? 'PDF document' : 'image'}${filename ? ` (filename: ${filename})` : ''}. Detect the content type and extract structured data. Return only valid JSON.`,
      },
    ],
    config: { systemInstruction: VISION_SYSTEM_PROMPT },
  })
  const rawText = response.text

  if (!rawText) {
    throw new Error('No text response from parser')
  }

  // Parse JSON
  let jsonStr = rawText.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('Parser returned invalid JSON. Please try again with a clearer file.')
  }

  // Validate
  const zodResult = VisionDetectionSchema.safeParse(parsed)
  if (!zodResult.success) {
    console.error('[parseDocumentWithVision] Validation errors:', zodResult.error.issues)
    throw new Error('Document extraction did not match expected format. Please try again.')
  }

  return zodResult.data
}
