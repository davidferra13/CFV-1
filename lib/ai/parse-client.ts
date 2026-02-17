// Client Smart Import Parser
// Extracts structured client data from natural language text

'use server'

import { z } from 'zod'
import { parseWithAI, type Confidence, type ParseResult } from './parse'

// ============================================
// PARSED CLIENT SCHEMA
// ============================================

const FieldConfidenceSchema = z.enum(['confirmed', 'inferred', 'unknown'])

export const ParsedClientSchema = z.object({
  parsed: z.object({
    full_name: z.string().min(1),
    email: z.string().nullable().default(null),
    phone: z.string().nullable().default(null),
    partner_name: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    dietary_restrictions: z.array(z.string()).default([]),
    allergies: z.array(z.string()).default([]),
    dislikes: z.array(z.string()).default([]),
    spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).nullable().default(null),
    favorite_cuisines: z.array(z.string()).default([]),
    favorite_dishes: z.array(z.string()).default([]),
    preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).nullable().default(null),
    referral_source: z.enum(['take_a_chef', 'instagram', 'referral', 'website', 'phone', 'email', 'other']).nullable().default(null),
    referral_source_detail: z.string().nullable().default(null),
    regular_guests: z.array(z.object({
      name: z.string(),
      relationship: z.string().default(''),
      notes: z.string().default('')
    })).default([]),
    household_members: z.array(z.object({
      name: z.string(),
      relationship: z.string().default(''),
      notes: z.string().default('')
    })).default([]),
    addresses: z.array(z.object({
      label: z.string().default(''),
      address: z.string(),
      city: z.string().default(''),
      state: z.string().default(''),
      zip: z.string().default(''),
      notes: z.string().default('')
    })).default([]),
    parking_instructions: z.string().nullable().default(null),
    access_instructions: z.string().nullable().default(null),
    kitchen_size: z.string().nullable().default(null),
    kitchen_constraints: z.string().nullable().default(null),
    house_rules: z.string().nullable().default(null),
    equipment_available: z.array(z.string()).default([]),
    equipment_must_bring: z.array(z.string()).default([]),
    vibe_notes: z.string().nullable().default(null),
    what_they_care_about: z.string().nullable().default(null),
    wine_beverage_preferences: z.string().nullable().default(null),
    average_spend_cents: z.number().nullable().default(null),
    payment_behavior: z.string().nullable().default(null),
    tipping_pattern: z.string().nullable().default(null),
    status: z.enum(['active', 'dormant', 'repeat_ready', 'vip']).default('active'),
    children: z.array(z.string()).default([]),
    farewell_style: z.string().nullable().default(null),
    personal_milestones: z.any().nullable().default(null),
    field_confidence: z.record(z.string(), FieldConfidenceSchema).default({}),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([])
})

export type ParsedClient = z.infer<typeof ParsedClientSchema>['parsed']

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
  const result = await parseWithAI(
    CLIENT_SYSTEM_PROMPT,
    rawText,
    ParsedClientSchema
  )
  return result
}
