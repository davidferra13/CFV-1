// Inquiry Smart Fill Parser
// Extracts structured inquiry data from pasted text/messages

'use server'

import { z } from 'zod'
import { type ParseResult } from './parse'
import { parseWithOllama } from './parse-ollama'

// ============================================
// PARSED INQUIRY SCHEMA
// ============================================

const ParsedInquirySchema = z.object({
  parsed: z.object({
    client_name: z.string().default(''),
    client_email: z.string().nullable().default(null),
    client_phone: z.string().nullable().default(null),
    channel: z
      .enum(['text', 'email', 'instagram', 'take_a_chef', 'phone', 'website', 'other'])
      .nullable()
      .default(null),
    confirmed_date: z.string().nullable().default(null),
    confirmed_guest_count: z.number().nullable().default(null),
    confirmed_location: z.string().nullable().default(null),
    confirmed_occasion: z.string().nullable().default(null),
    confirmed_budget_cents: z.number().nullable().default(null),
    confirmed_dietary_restrictions: z.array(z.string()).default([]),
    confirmed_service_expectations: z.string().nullable().default(null),
    confirmed_cannabis_preference: z.string().nullable().default(null),
    source_message: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
    referral_source: z.string().nullable().default(null),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]),
})

export type ParsedInquiry = z.infer<typeof ParsedInquirySchema>['parsed']

const INQUIRY_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's inquiry management system. Your job is to parse pasted text messages, emails, DMs, or notes about a potential client inquiry into structured JSON.

RULES:
- Extract client name, contact info, event details, and any preferences mentioned.
- For dates: use ISO format (YYYY-MM-DD). If relative ("next Saturday", "August 15th"), compute the date. Current year is 2026.
- For budget: convert to cents. "$2500" → 250000, "$100/person for 8" → 80000.
- For guest count: extract the number.
- Channel: infer from the content (text message format → "text", email format → "email", Instagram DM → "instagram", etc.)
- Dietary restrictions: extract any mentions of allergies, dietary needs, preferences.
- Service expectations: "plated dinner", "family style", "cocktail party", etc.
- The source_message should be the original text, preserved for reference.
- Notes should capture additional context not fitting other fields.
- NEVER invent facts. If not mentioned, leave as null.

RESPOND WITH ONLY valid JSON (no markdown, no explanation):
{
  "parsed": {
    "client_name": "string",
    "client_email": "string or null",
    "client_phone": "string or null",
    "channel": "text|email|instagram|take_a_chef|phone|website|other or null",
    "confirmed_date": "YYYY-MM-DD string or null",
    "confirmed_guest_count": "number or null",
    "confirmed_location": "string or null",
    "confirmed_occasion": "string or null",
    "confirmed_budget_cents": "number in cents or null",
    "confirmed_dietary_restrictions": ["string"],
    "confirmed_service_expectations": "string or null",
    "confirmed_cannabis_preference": "string or null",
    "source_message": "string or null (original text preserved)",
    "notes": "string or null",
    "referral_source": "string or null"
  },
  "confidence": "high|medium|low",
  "warnings": ["string"]
}`

/**
 * Parse inquiry details from text (messages, emails, DMs, notes)
 */
export async function parseInquiryFromText(rawText: string): Promise<ParseResult<ParsedInquiry>> {
  const result = await parseWithOllama(INQUIRY_SYSTEM_PROMPT, rawText, ParsedInquirySchema)
  return result
}
