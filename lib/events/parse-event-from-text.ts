// Natural Language Event Parser
// Uses Google Gemini to extract structured event data from free-form text.
// AI policy compliant: output is a draft — never auto-saved. Chef must confirm.

'use server'

import { z } from 'zod'
import { parseWithAI } from '@/lib/ai/parse'

// ── Schema ───────────────────────────────────────────────────────────────────

const ParsedEventDraftSchema = z.object({
  // Core fields
  client_name: z.string().nullable().describe('Full name or company name of the client'),
  event_date: z.string().nullable().describe('ISO date YYYY-MM-DD, infer year from context'),
  serve_time: z.string().nullable().describe('24h HH:MM format when food should be served'),
  guest_count: z.number().int().positive().nullable(),
  occasion: z.string().nullable().describe('e.g. "Birthday Dinner", "Corporate Event"'),

  // Location — free-form description, chef fills details later
  location_description: z.string().nullable().describe('Address or venue description from the text'),

  // Financials — parse dollar amounts to cents (integer)
  quoted_price_cents: z.number().int().nonnegative().nullable()
    .describe('Quoted total price in cents. "$2,800" → 280000'),
  deposit_amount_cents: z.number().int().nonnegative().nullable()
    .describe('Deposit amount in cents if mentioned'),

  // Extra context
  dietary_notes: z.string().nullable().describe('Any dietary restrictions or allergies mentioned'),
  notes: z.string().nullable().describe('Any other details not captured above'),

  // AI confidence feedback
  confidence_notes: z.string()
    .describe('Brief note about uncertain fields or assumptions made'),
  uncertain_fields: z.array(z.string())
    .describe('List of field names the AI is not confident about'),
})

export type ParsedEventDraft = z.infer<typeof ParsedEventDraftSchema>

// ── System prompt ────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10)

const SYSTEM_PROMPT = `You are an assistant helping a private chef quickly capture event details from a free-form description.

Today's date is ${today}. Use this to resolve relative dates like "Saturday the 28th", "next Friday", "in two weeks".

Extract structured data from the chef's input. Be liberal in interpretation — the goal is to pre-fill a form, not to be a gatekeeper.

Rules:
- All monetary amounts convert to integer cents (e.g. "$2,800" → 280000, "$500 deposit" → 50000)
- Dates must be YYYY-MM-DD format
- Times must be 24h HH:MM (e.g. "7pm" → "19:00", "6:30" → "18:30")
- If a field is genuinely not mentioned, return null — don't invent values
- If a field is mentioned but ambiguous, include it with your best guess and list it in uncertain_fields
- Return ONLY valid JSON matching the schema

Output JSON with these keys: client_name, event_date, serve_time, guest_count, occasion, location_description, quoted_price_cents, deposit_amount_cents, dietary_notes, notes, confidence_notes, uncertain_fields`

// ── Action ───────────────────────────────────────────────────────────────────

export async function parseEventFromText(
  rawText: string
): Promise<{ draft: ParsedEventDraft | null; error?: string }> {
  if (!rawText.trim()) {
    return { draft: null, error: 'Please describe the event first.' }
  }

  try {
    const draft = await parseWithAI(SYSTEM_PROMPT, rawText, ParsedEventDraftSchema)
    return { draft }
  } catch (err) {
    console.error('[parseEventFromText] Error:', err)
    return {
      draft: null,
      error: err instanceof Error ? err.message : 'AI parsing failed. Please try again.',
    }
  }
}
