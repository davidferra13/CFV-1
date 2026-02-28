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

EXAMPLES:

Input: "hey! saw your page on IG. my husband and I are celebrating our anniversary june 14, would love a nice dinner at home for just the two of us. I'm gluten free and he's allergic to shellfish. Budget around $800. - Jessica"
Output: { "parsed": { "client_name": "Jessica", "client_email": null, "client_phone": null, "channel": "instagram", "confirmed_date": "2026-06-14", "confirmed_guest_count": 2, "confirmed_location": null, "confirmed_occasion": "Anniversary dinner", "confirmed_budget_cents": 80000, "confirmed_dietary_restrictions": ["gluten-free", "shellfish allergy"], "confirmed_service_expectations": null, "confirmed_cannabis_preference": null, "source_message": "hey! saw your page on IG. my husband and I are celebrating our anniversary june 14, would love a nice dinner at home for just the two of us. I'm gluten free and he's allergic to shellfish. Budget around $800. - Jessica", "notes": null, "referral_source": "instagram" }, "confidence": "high", "warnings": [] }

Input: "From: mark.chen@email.com\nSubject: Dinner party inquiry\n\nHi Chef,\nI found you through Take a Chef. I'm hosting a dinner party for 12 people on August 23rd at my place in Brookline. We're thinking plated, 4-course, around $200/person. Two guests are vegan, one has a nut allergy. Let me know if you're available!\nBest, Mark Chen\n617-555-0199"
Output: { "parsed": { "client_name": "Mark Chen", "client_email": "mark.chen@email.com", "client_phone": "617-555-0199", "channel": "email", "confirmed_date": "2026-08-23", "confirmed_guest_count": 12, "confirmed_location": "Brookline", "confirmed_occasion": "Dinner party", "confirmed_budget_cents": 240000, "confirmed_dietary_restrictions": ["vegan (2 guests)", "nut allergy (1 guest)"], "confirmed_service_expectations": "Plated, 4-course", "confirmed_cannabis_preference": null, "source_message": null, "notes": "Found through Take a Chef", "referral_source": "take_a_chef" }, "confidence": "high", "warnings": [] }

RESPOND WITH ONLY valid JSON (no markdown, no explanation).`

/**
 * Parse inquiry details from text (messages, emails, DMs, notes)
 */
export async function parseInquiryFromText(rawText: string): Promise<ParseResult<ParsedInquiry>> {
  const result = await parseWithOllama(INQUIRY_SYSTEM_PROMPT, rawText, ParsedInquirySchema)
  return result
}
