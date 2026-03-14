// Transcript Parser
// Parses conversation transcripts (calls, emails, texts, meeting notes)
// and extracts structured entities: clients, events, inquiries, notes.

'use server'

import { z } from 'zod'
import { type ParseResult } from './parse'
import { parseWithOllama } from './parse-ollama'
import { ParsedClientSchema, type ParsedClient } from './parse-client-schema'
import { parseClientsHeuristically, toFallbackWarning } from './fallback-parsers'

// ============================================
// TRANSCRIPT RESPONSE SCHEMA
// ============================================

const TranscriptEventSchema = z.object({
  client_name: z.string().nullable().default(null),
  event_date: z.string().nullable().default(null),
  guest_count: z.number().nullable().default(null),
  occasion: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  budget_cents: z.number().nullable().default(null),
  dietary_restrictions: z.array(z.string()).default([]),
  service_style: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
})

export type ParsedTranscriptEvent = z.infer<typeof TranscriptEventSchema>

const TranscriptInquirySchema = z.object({
  client_name: z.string().nullable().default(null),
  channel: z
    .enum(['phone', 'email', 'text', 'instagram', 'website', 'referral', 'other'])
    .nullable()
    .default(null),
  event_date: z.string().nullable().default(null),
  guest_count: z.number().nullable().default(null),
  occasion: z.string().nullable().default(null),
  budget_range_min_cents: z.number().nullable().default(null),
  budget_range_max_cents: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
})

export type ParsedTranscriptInquiry = z.infer<typeof TranscriptInquirySchema>

const TranscriptNoteSchema = z.object({
  type: z.enum([
    'follow_up',
    'dietary_update',
    'scheduling',
    'preference',
    'action_item',
    'general',
  ]),
  content: z.string(),
  related_client: z.string().nullable().default(null),
})

export type ParsedTranscriptNote = z.infer<typeof TranscriptNoteSchema>

const TranscriptResponseSchema = z.object({
  parsed: z.object({
    clients: z.array(ParsedClientSchema.shape.parsed).default([]),
    events: z.array(TranscriptEventSchema).default([]),
    inquiries: z.array(TranscriptInquirySchema).default([]),
    notes: z.array(TranscriptNoteSchema).default([]),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]),
})

export type TranscriptResult = z.infer<typeof TranscriptResponseSchema>['parsed']

// ============================================
// SYSTEM PROMPT
// ============================================

const TRANSCRIPT_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's management system (ChefFlow). Your job is to parse a CONVERSATION TRANSCRIPT — a real exchange between a chef and a potential or existing client — and extract structured data.

The transcript may be from: a phone call, text messages, emails, DMs, meeting notes, or voice-to-text transcription.

IDENTIFY THE PARTIES:
- The chef (the person using ChefFlow) — their info is NOT extracted as a client.
- The client/prospect — their info IS extracted.
- If it's unclear who is who, treat the person asking for chef services as the client.

EXTRACT INTO THESE CATEGORIES:

1. CLIENTS — anyone mentioned who is or could be a client.
2. EVENTS — any specific event discussed (date, guest count, occasion, location, budget, dietary needs, service style).
3. INQUIRIES — if this is a first contact or new request, capture it as an inquiry with channel and budget range.
4. NOTES — follow-ups, dietary updates, scheduling notes, preferences, action items, or anything useful that doesn't fit the above.

RULES:
- One transcript can produce MULTIPLE clients (e.g., "My friend Lisa might want to book too").
- One transcript can produce MULTIPLE events (e.g., "We want a dinner party AND a brunch the next day").
- Allergies are SAFETY-CRITICAL. Flag ALL allergy mentions, even casual ones.
- Money amounts in cents. "$3000" → 300000. "$50/person for 20 guests" → budget_cents: 100000.
- Dates: use ISO format (YYYY-MM-DD). If only "June 15" is mentioned with no year, assume the next occurrence.
- NEVER invent facts. Only extract what is stated or clearly implied.
- If the transcript mentions updates to an existing client (e.g., "Oh, and Sarah is now vegetarian"), extract that in the client's dietary_restrictions.

CLIENT fields:
- full_name, email, phone, partner_name, address, dietary_restrictions, allergies, dislikes, spice_tolerance (none|mild|medium|hot|very_hot), favorite_cuisines, favorite_dishes, preferred_contact_method (phone|email|text|instagram), referral_source, referral_source_detail, regular_guests, household_members, addresses, parking_instructions, access_instructions, kitchen_size, kitchen_constraints, house_rules, equipment_available, vibe_notes, what_they_care_about, wine_beverage_preferences, average_spend_cents, status (active|dormant|repeat_ready|vip), children, field_confidence

EVENT fields:
- client_name, event_date (ISO), guest_count, occasion, location, budget_cents, dietary_restrictions, service_style, notes

INQUIRY fields:
- client_name, channel (phone|email|text|instagram|website|referral|other), event_date, guest_count, occasion, budget_range_min_cents, budget_range_max_cents, notes

NOTE fields:
- type (follow_up|dietary_update|scheduling|preference|action_item|general), content, related_client

EXAMPLE:

Input: "hey chef this is Lisa. so my mom's bday is march 22, wanting to do a nice dinner at her place in Wellesley. prob 8 people. she's lactose intolerant btw, and my aunt has a tree nut allergy. thinking maybe $150 a head? also my friend Dave might reach out to you for his wedding in september, I gave him your number"
Output: { "parsed": { "clients": [{ "full_name": "Lisa", "dietary_restrictions": [], "allergies": [], "referral_source": null, "vibe_notes": null, "field_confidence": { "full_name": "confirmed" } }, { "full_name": "Lisa's mother", "dietary_restrictions": ["lactose intolerant"], "allergies": [], "field_confidence": { "full_name": "inferred", "dietary_restrictions": "confirmed" } }, { "full_name": "Dave", "referral_source": "referral", "referral_source_detail": "Referred by Lisa", "field_confidence": { "full_name": "confirmed" } }], "events": [{ "client_name": "Lisa", "event_date": "2026-03-22", "guest_count": 8, "occasion": "Birthday dinner (Lisa's mother)", "location": "Wellesley", "budget_cents": 120000, "dietary_restrictions": ["lactose intolerant", "tree nut allergy"], "service_style": null, "notes": "At mother's place" }], "inquiries": [{ "client_name": "Dave", "channel": "phone", "event_date": null, "guest_count": null, "occasion": "Wedding", "budget_range_min_cents": null, "budget_range_max_cents": null, "notes": "September wedding, referred by Lisa, may reach out" }], "notes": [{ "type": "action_item", "content": "Lisa's aunt has tree nut allergy — flag for menu planning", "related_client": "Lisa" }] }, "confidence": "high", "warnings": ["Lisa's mother's name not provided — stored as 'Lisa's mother'", "Dave's wedding details are sparse — he hasn't reached out yet"] }

RESPOND WITH ONLY valid JSON (no markdown, no explanation).`

// ============================================
// PARSER FUNCTION
// ============================================

/**
 * Parse a conversation transcript into structured entities.
 * Returns clients, events, inquiries, and notes.
 */
export async function parseTranscript(rawText: string): Promise<ParseResult<TranscriptResult>> {
  try {
    const result = await parseWithOllama(
      TRANSCRIPT_SYSTEM_PROMPT,
      rawText,
      TranscriptResponseSchema,
      {
        modelTier: 'standard',
        timeoutMs: 90_000,
      }
    )
    return result
  } catch (error) {
    // Heuristic fallback: try to at least extract clients
    const clientFallback = parseClientsHeuristically(rawText, toFallbackWarning(error))

    return {
      parsed: {
        clients: clientFallback.parsed,
        events: [],
        inquiries: [],
        notes:
          clientFallback.parsed.length > 0
            ? [
                {
                  type: 'general' as const,
                  content:
                    'Imported using fallback parsing. Event and inquiry details could not be extracted automatically.',
                  related_client: null,
                },
              ]
            : [
                {
                  type: 'general' as const,
                  content: rawText.slice(0, 500),
                  related_client: null,
                },
              ],
      },
      confidence: 'low',
      warnings: [
        ...clientFallback.warnings,
        'Used fallback parser for transcript. Review extracted data carefully.',
      ],
    }
  }
}
