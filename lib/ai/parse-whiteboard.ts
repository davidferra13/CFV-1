'use server'

import { z } from 'zod'
import { parseWithOllama } from './parse-ollama'
import { requireChef } from '@/lib/auth/get-user'
import { OllamaOfflineError } from './ollama-errors'

// ============================================
// WHITEBOARD CAPTURE SCHEMA
// ============================================

const WhiteboardItemSchema = z.object({
  category: z.enum([
    'client_followup',
    'dinner_detail',
    'recipe_note',
    'prep_task',
    'shopping_item',
    'menu_idea',
    'business_note',
    'contact_info',
    'date_reminder',
    'general',
  ]),
  content: z.string(),
  clientName: z.string().nullable(),
  eventDate: z.string().nullable(),
  urgency: z.enum(['high', 'medium', 'low']),
  suggestedAction: z.string(),
})

export type WhiteboardItem = z.infer<typeof WhiteboardItemSchema>

const WhiteboardResultSchema = z.object({
  items: z.array(WhiteboardItemSchema),
  rawTranscription: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]),
})

export type WhiteboardResult = z.infer<typeof WhiteboardResultSchema>

const WHITEBOARD_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's business management system. You are reading a photo of a WHITEBOARD or HANDWRITTEN NOTES.

Your job is to:
1. Transcribe ALL text you can read from the whiteboard
2. Break each distinct item into a categorized, actionable entry
3. Identify client names, dates, and urgency levels

CATEGORIES:
- client_followup: Any mention of needing to contact, respond to, or update a client/person
- dinner_detail: Specific dinner/event details (guest count, location, occasion, dietary needs, budget)
- recipe_note: Recipe ideas, ingredient lists, dish names, cooking notes, techniques
- prep_task: Preparation tasks, timelines, equipment needs
- shopping_item: Ingredients or supplies to buy
- menu_idea: Menu concepts, course ideas, pairings
- business_note: Business decisions, pricing thoughts, platform notes (Take a Chef, Airbnb, etc.)
- contact_info: Phone numbers, emails, addresses
- date_reminder: Important dates, deadlines, booking dates
- general: Anything that doesn't fit the above

URGENCY:
- high: Client waiting on response, upcoming event within 2 weeks, time-sensitive
- medium: Needs attention this week but not urgent
- low: Ideas, future planning, nice-to-have

RULES:
- Extract EVERYTHING visible. Do not skip items because they seem minor.
- If a name appears, always populate clientName.
- If a date appears near an item, populate eventDate (use YYYY-MM-DD format, infer year as 2026 if not shown).
- For suggestedAction, write a concrete next step (e.g. "Text Sarah to confirm May 10 dinner" not "Follow up").
- Handwriting may be messy. Do your best. Flag low confidence in warnings.
- NEVER invent information not visible on the whiteboard.

RESPOND WITH ONLY valid JSON (no markdown, no explanation).`

/**
 * Parse a whiteboard photo into structured, actionable items.
 * Uses Gemma 4 vision to read handwritten notes and categorize them.
 */
export async function parseWhiteboardImage(
  base64Image: string,
  mediaType: string = 'image/jpeg'
): Promise<WhiteboardResult> {
  await requireChef()

  try {
    return await parseWithOllama(
      WHITEBOARD_SYSTEM_PROMPT,
      'Read this whiteboard/notes photo. Extract and categorize every item. Return only valid JSON.',
      WhiteboardResultSchema,
      {
        images: [base64Image],
        maxTokens: 4096,
        timeoutMs: 45_000,
        modelTier: 'complex',
      }
    )
  } catch (error) {
    if (error instanceof OllamaOfflineError) throw error
    throw new Error(
      `Whiteboard parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
