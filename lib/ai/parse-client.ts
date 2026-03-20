// Client Smart Import Parser
// Extracts structured client data from natural language text

'use server'

import { type Confidence, type ParseResult } from './parse'
import { parseWithOllama } from './parse-ollama'
import { parseClientsHeuristically, toFallbackWarning } from './fallback-parsers'
import { ParsedClientSchema, type ParsedClient } from './parse-client-schema'
import { log } from '@/lib/logger'

// ParsedClientSchema and ParsedClient are defined in ./parse-client-schema (no 'use server').
// Re-export the TYPE only for consumers that import from this file.
export type { ParsedClient } from './parse-client-schema'

const CLIENT_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's client management system. Your job is to parse natural language text about a client into structured JSON.

RULES:
- Extract ONLY what is explicitly stated or clearly implied. NEVER invent facts.
- For each field, track whether it was "confirmed" (explicitly stated), "inferred" (reasonably deduced), or "unknown" (not mentioned).
- Allergies are SAFETY-CRITICAL. If any allergy is even hinted at, include it and add a warning.
- Money amounts: if the text says "$100/person" and mentions "4 guests", compute average_spend_cents as 10000 (per-person in cents). If there's a total, use that.
- Names: the FIRST name or nickname mentioned is usually the client. Partners/spouses are separate.
- Regular guests: people who frequently attend but aren't the primary client.
- Addresses: extract multiple if mentioned (home, parents' house, vacation, etc.)
- Contact method: infer from channel context (e.g., "texts me" → "text")
- Status: default to "active" unless there's reason to think otherwise.

RESPOND WITH ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "parsed": {
    "full_name": "string (required)",
    "email": "string or null",
    "phone": "string or null",
    "partner_name": "string or null",
    "address": "string or null (primary address as single line)",
    "dietary_restrictions": ["string"],
    "allergies": ["string - SAFETY CRITICAL"],
    "dislikes": ["string"],
    "spice_tolerance": "none|mild|medium|hot|very_hot or null",
    "favorite_cuisines": ["string"],
    "favorite_dishes": ["string"],
    "preferred_contact_method": "phone|email|text|instagram or null",
    "referral_source": "take_a_chef|instagram|referral|website|phone|email|other or null",
    "referral_source_detail": "string or null",
    "regular_guests": [{"name": "string", "relationship": "string", "notes": "string"}],
    "household_members": [{"name": "string", "relationship": "string", "notes": "string"}],
    "addresses": [{"label": "string", "address": "string", "city": "string", "state": "string", "zip": "string", "notes": "string"}],
    "parking_instructions": "string or null",
    "access_instructions": "string or null",
    "kitchen_size": "string or null",
    "kitchen_constraints": "string or null",
    "house_rules": "string or null",
    "equipment_available": ["string"],
    "equipment_must_bring": ["string"],
    "vibe_notes": "string or null",
    "what_they_care_about": "string or null",
    "wine_beverage_preferences": "string or null",
    "average_spend_cents": number or null,
    "payment_behavior": "string or null (e.g., 'cash', 'venmo', 'check')",
    "tipping_pattern": "string or null",
    "status": "active|dormant|repeat_ready|vip",
    "children": ["string"],
    "farewell_style": "string or null",
    "personal_milestones": null,
    "field_confidence": {"field_name": "confirmed|inferred|unknown"}
  },
  "confidence": "high|medium|low",
  "warnings": ["string - especially for allergy mentions and ambiguities"]
}`

/**
 * Parse a single client from natural language text
 */
export async function parseClientFromText(rawText: string): Promise<ParseResult<ParsedClient>> {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Cannot parse empty client text. Please provide client information.')
  }

  const startTime = Date.now()
  log.ai.info('parseClientFromText started', { context: { inputLength: rawText.length } })

  try {
    const result = await parseWithOllama(CLIENT_SYSTEM_PROMPT, rawText, ParsedClientSchema)
    log.ai.info('parseClientFromText completed', { durationMs: Date.now() - startTime })
    return result
  } catch (error) {
    log.ai.warn('parseClientFromText fell back to heuristic parser', {
      durationMs: Date.now() - startTime,
      error,
    })
    const fallback = parseClientsHeuristically(rawText, toFallbackWarning(error))
    return {
      parsed: fallback.parsed[0],
      confidence: 'low',
      warnings: fallback.warnings,
    }
  }
}
