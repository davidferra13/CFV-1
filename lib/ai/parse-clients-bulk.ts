// Bulk Client Smart Import Parser
// Parses multiple clients from a single text dump

'use server'

import { z } from 'zod'
import { type ParseResult } from './parse'
import { dispatchPrivate } from '@/lib/ai/dispatch'
import { ParsedClientSchema, type ParsedClient } from './parse-client-schema'
import { parseClientsHeuristically, toFallbackWarning } from './fallback-parsers'

// ============================================
// BULK RESPONSE SCHEMA
// ============================================

const BulkClientsResponseSchema = z.object({
  parsed: z.array(ParsedClientSchema.shape.parsed),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]),
})

const BULK_CLIENT_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's client management system. Your job is to parse a text dump containing information about MULTIPLE clients and return each as a separate structured record.

RULES:
- Identify distinct clients in the text. Clients are usually separated by line breaks, dashes, or new paragraphs.
- Each client entry should be parsed independently with its own fields.
- Extract ONLY what is explicitly stated or clearly implied. NEVER invent facts.
- For each client's fields, track whether it was "confirmed" (explicitly stated), "inferred" (reasonably deduced), or "unknown" (not mentioned).
- Allergies are SAFETY-CRITICAL. If any allergy is even hinted at, include it and add a warning.
- Money amounts: if the text says "$100/person" and mentions guests, compute average_spend_cents in cents.
- Names: the FIRST name mentioned per entry is usually the client name.
- Nicknames: if someone is referred to by a nickname with their real name also given, use the real name as full_name.

RESPOND WITH ONLY valid JSON (no markdown, no explanation):
{
  "parsed": [
    {
      "full_name": "string (required)",
      "email": "string or null",
      "phone": "string or null",
      "partner_name": "string or null",
      "address": "string or null",
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
      "average_spend_cents": "number or null (in cents)",
      "payment_behavior": "string or null",
      "tipping_pattern": "string or null",
      "status": "active|dormant|repeat_ready|vip",
      "children": ["string"],
      "farewell_style": "string or null",
      "personal_milestones": null,
      "field_confidence": {"field_name": "confirmed|inferred|unknown"}
    }
  ],
  "confidence": "high|medium|low",
  "warnings": ["string - per-client or global warnings"]
}`

/**
 * Parse multiple clients from a text dump
 */
export async function parseClientsFromBulk(rawText: string): Promise<ParseResult<ParsedClient[]>> {
  try {
    const result = (
      await dispatchPrivate(BULK_CLIENT_SYSTEM_PROMPT, rawText, BulkClientsResponseSchema)
    ).result
    return result
  } catch (error) {
    return parseClientsHeuristically(rawText, toFallbackWarning(error))
  }
}
