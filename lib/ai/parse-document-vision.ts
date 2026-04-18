// AI Vision Document Parser
// Accepts images or PDFs, detects content type, and extracts structured data.
// Uses Gemma 4 native vision via Ollama. Fully local, no cloud dependency.
// Resolves the previous privacy concern: client_info path (names, emails, allergies)
// now stays local instead of going to cloud.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'

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
- Do NOT invent data - only extract what is clearly present
- For receipts, convert all money values to cents (multiply dollars by 100)
- For recipes, expand abbreviations
- For allergies, over-flag rather than miss
- If the document is blurry or hard to read, set confidence to "low" and add warnings`

/**
 * Parse an uploaded file (image or PDF) using Gemma 4 native vision.
 * Detects content type and extracts structured data.
 */
export async function parseDocumentWithVision(
  base64Data: string,
  mediaType: string,
  filename?: string
): Promise<VisionDetectionResult> {
  await requireChef()

  const isPdf = mediaType === 'application/pdf'

  return parseWithOllama(
    VISION_SYSTEM_PROMPT,
    `Analyze this ${isPdf ? 'PDF document' : 'image'}${filename ? ` (filename: ${filename})` : ''}. Detect the content type and extract structured data. Return only valid JSON.`,
    VisionDetectionSchema,
    {
      images: [base64Data],
      maxTokens: 4096,
      timeoutMs: 30_000,
    }
  )
}
