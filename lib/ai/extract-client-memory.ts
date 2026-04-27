'use server'

import { z } from 'zod'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'
import { batchUpsertClientMemory } from '@/lib/clients/client-memory-actions'
import type { ExtractedMemory } from '@/lib/clients/client-memory-types'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ExtractedMemorySchema = z.object({
  memories: z.array(
    z.object({
      key: z.string(),
      value: z.union([z.string(), z.array(z.string()), z.number(), z.boolean()]),
      confidence: z.number().min(0).max(100).optional(),
    })
  ),
})

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are a memory extraction engine for a private chef's client management system.

Given event details, menus, messages, or notes about a client, extract structured facts.

ONLY extract facts that are clearly stated or strongly implied. Never guess or infer weakly.

Return JSON with this exact structure:
{
  "memories": [
    { "key": "<memory_key>", "value": "<value>", "confidence": <0-100> }
  ]
}

Valid memory keys (use ONLY these):
- "allergy" - food allergies (value: string or string[])
- "hard_dislike" - foods they refuse (value: string or string[])
- "dietary_restriction" - vegetarian, kosher, halal, etc. (value: string)
- "pacing_preference" - fast, relaxed, multi-course, etc. (value: string)
- "service_style" - plated, family-style, buffet, tasting, etc. (value: string)
- "guest_pattern" - typical group size, who they host (value: string)
- "communication_style" - formal, casual, responsive, slow, etc. (value: string)
- "favorite_dish" - dishes they loved (value: string or string[])
- "wine_preference" - wine/drink preferences (value: string or string[])
- "kids_names" - children's names (value: string[])
- "birthday" - client or family member birthdays (value: string)
- "anniversary" - anniversary date (value: string)
- "tradition" - recurring traditions or rituals (value: string)
- "notable_preference" - anything else notable (value: string)
- "household_size" - number of people in household (value: number)
- "pet_info" - pets in the home (value: string)

Set confidence:
- 100: explicitly stated ("I'm allergic to shellfish")
- 80: strongly implied (ordered same dish 3 times)
- 60: weakly implied (mentioned once in passing)

If no facts can be extracted, return: { "memories": [] }
Do NOT fabricate information. Only extract what is clearly present.`

// ---------------------------------------------------------------------------
// Extract from raw text (event data, messages, notes)
// ---------------------------------------------------------------------------

export async function extractClientMemoryFromText(input: {
  client_id: string
  text: string
  source: 'event_parse' | 'message_parse' | 'completion_extract' | 'menu_parse'
  source_event_id?: string | null
}): Promise<{ success: true; count: number } | { success: false; error: string }> {
  if (!input.text.trim()) {
    return { success: true, count: 0 }
  }

  try {
    const result = await parseWithOllama(EXTRACTION_PROMPT, input.text, ExtractedMemorySchema, {
      modelTier: 'standard',
    })

    if (!result.memories || result.memories.length === 0) {
      return { success: true, count: 0 }
    }

    const extracted: ExtractedMemory[] = result.memories.map((m) => ({
      key: m.key,
      value: m.value,
      confidence: m.confidence,
    }))

    return await batchUpsertClientMemory({
      client_id: input.client_id,
      memories: extracted,
      source: input.source,
      source_event_id: input.source_event_id ?? null,
    })
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[client-memory] Extraction failed:', err)
    return { success: false, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Build extraction text from event data
// ---------------------------------------------------------------------------

export async function buildEventExtractionText(event: {
  occasion?: string | null
  guest_count?: number | null
  notes?: string | null
  dietary_notes?: string | null
  special_requests?: string | null
  menus?: Array<{ name: string; dishes?: Array<{ name?: string | null; courseName?: string }> }>
  messages?: Array<{ content: string; sender_name?: string }>
}): Promise<string> {
  const parts: string[] = []

  if (event.occasion) parts.push(`Occasion: ${event.occasion}`)
  if (event.guest_count) parts.push(`Guest count: ${event.guest_count}`)
  if (event.notes) parts.push(`Client notes: ${event.notes}`)
  if (event.dietary_notes) parts.push(`Dietary notes: ${event.dietary_notes}`)
  if (event.special_requests) parts.push(`Special requests: ${event.special_requests}`)

  if (event.menus?.length) {
    for (const menu of event.menus) {
      parts.push(`Menu: ${menu.name}`)
      if (menu.dishes?.length) {
        parts.push(`Dishes: ${menu.dishes.map((d) => d.name || d.courseName).join(', ')}`)
      }
    }
  }

  if (event.messages?.length) {
    const clientMessages = event.messages.slice(-10) // last 10 messages
    for (const msg of clientMessages) {
      parts.push(`Message: ${msg.content}`)
    }
  }

  return parts.join('\n')
}
