/**
 * Ollama-based extraction for the GOLDMINE build pipeline.
 *
 * NO 'use server' - this is a build script module, not a server action.
 * Calls Ollama directly via the ollama npm package.
 *
 * Used for freeform fields that regex can't reliably extract:
 * client names, occasion normalization, service style, referral interpretation.
 *
 * Model routing:
 *   first-contact → standard (qwen3-coder:30b) - structured JSON extraction
 *   follow-up → fast (qwen3:4b) - shorter responses, simpler classification
 *   outbound → fast (qwen3:4b) - supplementary enrichment
 */

import { Ollama } from 'ollama'
import { z } from 'zod'
import {
  OllamaEnrichedFieldsSchema,
  FollowUpFieldsSchema,
  type OllamaEnrichedFields,
  type FollowUpFields,
} from './extraction-types'

// ─── Config ─────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const MODEL_FAST = process.env.OLLAMA_MODEL_FAST || 'qwen3:4b'
const MODEL_STANDARD = process.env.OLLAMA_MODEL || 'qwen3-coder:30b'
const TIMEOUT_MS = 60_000
const MAX_TOKENS = 512

// ─── Ollama Client ──────────────────────────────────────────────────────

let ollamaClient: Ollama | null = null

function getOllama(): Ollama {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: OLLAMA_BASE_URL })
  }
  return ollamaClient
}

// ─── Generic Ollama Call with 3-Strike Skip ─────────────────────────────

function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenceMatch ? fenceMatch[1].trim() : raw.trim()
}

export async function ollamaCallWithFallback<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  model: string,
  maxAttempts = 3
): Promise<T | null> {
  const ollama = getOllama()

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await Promise.race([
        ollama.chat({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          format: 'json',
          options: { num_predict: MAX_TOKENS },
          keep_alive: '30m',
          think: false,
        } as any) as unknown as Promise<{ message: { content: string } }>,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Ollama timeout')), TIMEOUT_MS)
        ),
      ])

      const rawText = response.message.content
      if (!rawText) {
        console.warn(`  [attempt ${attempt}/${maxAttempts}] Empty response from Ollama`)
        continue
      }

      const jsonStr = extractJson(rawText)
      let parsed: unknown
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        console.warn(`  [attempt ${attempt}/${maxAttempts}] Invalid JSON: ${rawText.slice(0, 100)}`)
        continue
      }

      const result = schema.safeParse(parsed)
      if (result.success) {
        return result.data
      }

      console.warn(
        `  [attempt ${attempt}/${maxAttempts}] Schema validation failed: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`  [attempt ${attempt}/${maxAttempts}] Ollama error: ${msg}`)
    }
  }

  // 3 strikes - return null, deterministic results still valid
  return null
}

// ─── First-Contact Extraction ───────────────────────────────────────────

const FIRST_CONTACT_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef platform. Extract structured information from a client's first inquiry email.

RULES:
- Extract ONLY what is explicitly stated. NEVER invent facts.
- client_name: The client's name if stated (e.g., signed at the bottom, or "this is Jessica").
- occasion_normalized: Normalize to a short category: "birthday", "anniversary", "wedding", "dinner party", "corporate", "holiday", "date night", "honeymoon", "mini-moon", "team bonding", "graduation", "retirement", "bachelorette", or null if not mentioned.
- service_style: "plated", "family style", "cocktail", "buffet", "intimate dinner", "tasting menu", or null if not mentioned.
- referral_source: How they found the chef: "airbnb_host", "website", "instagram", "facebook", "google", "word_of_mouth", "take_a_chef", "thumbtack", "yelp", or null if not mentioned.
- cannabis_preference: Describe any cannabis/THC/infused dining request, or null.
- special_notes: Any relevant context that doesn't fit other fields. Keep brief.
- confidence: "high" if the email is clearly an inquiry with good detail, "medium" if sparse, "low" if ambiguous.

RESPOND WITH ONLY valid JSON matching this schema:
{
  "client_name": string | null,
  "occasion_normalized": string | null,
  "service_style": string | null,
  "referral_source": string | null,
  "cannabis_preference": string | null,
  "special_notes": string | null,
  "confidence": "high" | "medium" | "low"
}`

export async function ollamaExtractFirstContact(
  body: string
): Promise<OllamaEnrichedFields | null> {
  // Truncate very long emails to first 3000 chars
  const content = body.slice(0, 3000)
  return ollamaCallWithFallback(
    FIRST_CONTACT_SYSTEM_PROMPT,
    content,
    OllamaEnrichedFieldsSchema,
    MODEL_STANDARD
  )
}

// ─── Follow-Up Extraction ───────────────────────────────────────────────

const FOLLOW_UP_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef platform. A client is replying within an existing email thread. Extract what NEW information this specific message adds.

RULES:
- Focus on what's NEW in this message, not repeated from earlier in the thread.
- information_type: classify this message as one of: "date_change", "guest_count_update", "dietary_addition", "menu_selection", "menu_discussion", "logistics", "confirmation", "cancellation", "pricing_discussion", "gratitude", "question", "general".
- new_facts: key-value pairs of any NEW facts. Examples: {"date": "2025-09-19"}, {"guest_count": "10"}, {"dietary": "one guest is vegan"}, {"arrival_time": "5pm"}.
- supersedes: list any facts this message overrides. Examples: ["date"] if the date changed, ["guest_count"] if count updated.
- confidence: "high" if the new info is clear, "medium" if inferred, "low" if ambiguous.

THREAD CONTEXT (what we already know):
{THREAD_CONTEXT}

RESPOND WITH ONLY valid JSON matching this schema:
{
  "information_type": string,
  "new_facts": { [key: string]: string },
  "supersedes": string[],
  "confidence": "high" | "medium" | "low"
}`

export async function ollamaExtractFollowUp(
  body: string,
  threadContext: string
): Promise<FollowUpFields | null> {
  const prompt = FOLLOW_UP_SYSTEM_PROMPT.replace('{THREAD_CONTEXT}', threadContext)
  const content = body.slice(0, 2000)
  return ollamaCallWithFallback(prompt, content, FollowUpFieldsSchema, MODEL_FAST)
}

// ─── Outbound Menu Extraction ───────────────────────────────────────────

const OUTBOUND_MENU_SCHEMA = z.object({
  menu_items: z.array(z.string()),
  courses_offered: z.number().nullable(),
  tone: z.enum(['formal', 'casual', 'warm', 'brief']).nullable(),
})

const OUTBOUND_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef platform. The chef is replying to a client. Extract menu items, course count, and tone.

RULES:
- menu_items: list specific dishes/items mentioned (e.g., "pan-seared halibut", "lobster bisque", "chocolate lava cake"). Empty array if no menu items discussed.
- courses_offered: number of courses mentioned (e.g., "4-course dinner" → 4). null if not mentioned.
- tone: overall tone of the reply: "formal" (Dear/professional), "casual" (Hey/relaxed), "warm" (enthusiastic/friendly), "brief" (short/to-the-point). null if unclear.

RESPOND WITH ONLY valid JSON:
{
  "menu_items": string[],
  "courses_offered": number | null,
  "tone": "formal" | "casual" | "warm" | "brief" | null
}`

export async function ollamaExtractOutbound(
  body: string
): Promise<{ menu_items: string[]; courses_offered: number | null; tone: string | null } | null> {
  const content = body.slice(0, 3000)
  return ollamaCallWithFallback(OUTBOUND_SYSTEM_PROMPT, content, OUTBOUND_MENU_SCHEMA, MODEL_FAST)
}

// ─── Connection Test ────────────────────────────────────────────────────

export async function testOllamaConnection(): Promise<boolean> {
  try {
    const ollama = getOllama()
    await Promise.race([
      ollama.list(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return true
  } catch {
    return false
  }
}
