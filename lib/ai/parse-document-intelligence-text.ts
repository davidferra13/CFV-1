'use server'

import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import type { VisionDetectionResult } from '@/lib/ai/parse-document-vision'

const MODEL = 'gemini-2.5-flash'

const TextDetectionSchema = z.object({
  detectedType: z.enum(['client_info', 'recipe', 'receipt', 'document', 'menu']),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()),
  extractedData: z.record(z.string(), z.unknown()),
})

const TEXT_SYSTEM_PROMPT = `You are a multi-purpose document analysis AI for a private chef business management system.
You receive extracted document text and must:

1. DETECT what type of content is in the text
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
Store receipt or invoice text. Extract:
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

### menu
Private dining menu, tasting menu, catering menu, or dish list. Extract:
{
  "menu_title": "string or null",
  "service_style": "string or null",
  "dish_count_estimate": 0,
  "menu_text": "full visible menu text",
  "summary": "1-2 sentence summary"
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
- Do NOT invent data, only extract what is clearly present
- For receipts, convert all money values to cents
- For menus, keep menu_text close to the source text
- If the text is partial or messy, set confidence lower and add warnings

RESPOND WITH ONLY valid JSON:
{
  "detectedType": "client_info|recipe|receipt|document|menu",
  "confidence": "high|medium|low",
  "warnings": [],
  "extractedData": { ... }
}`

export async function parseDocumentIntelligenceText(
  text: string,
  filename?: string
): Promise<VisionDetectionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Text document analysis requires Gemini.')
  }

  const cleaned = text.trim()
  if (!cleaned) {
    throw new Error('No document text was available to analyze.')
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        text: `Analyze this extracted document text${filename ? ` from ${filename}` : ''} and return only valid JSON.\n\n${cleaned.slice(0, 24000)}`,
      },
    ],
    config: { systemInstruction: TEXT_SYSTEM_PROMPT },
  })

  const rawText = response.text
  if (!rawText) {
    throw new Error('No text response from parser')
  }

  let jsonStr = rawText.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('Text document parser returned invalid JSON. Please try again.')
  }

  const zodResult = TextDetectionSchema.safeParse(parsed)
  if (!zodResult.success) {
    console.error('[parseDocumentIntelligenceText] Validation errors:', zodResult.error.issues)
    throw new Error('Text document extraction did not match the expected format.')
  }

  return zodResult.data
}
