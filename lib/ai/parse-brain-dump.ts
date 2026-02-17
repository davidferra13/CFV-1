// Brain Dump Parser
// The most flexible import — chef dumps information and the system
// figures out what it is and where it goes

'use server'

import { z } from 'zod'
import { parseWithAI, type ParseResult } from './parse'
import { ParsedClientSchema, type ParsedClient } from './parse-client'
import { ParsedRecipeSchema, type ParsedRecipe } from './parse-recipe'

// ============================================
// BRAIN DUMP RESPONSE SCHEMA
// ============================================

const NoteSchema = z.object({
  type: z.string(),
  content: z.string(),
  suggestedAction: z.string()
})

export type ParsedNote = z.infer<typeof NoteSchema>

const BrainDumpResponseSchema = z.object({
  parsed: z.object({
    clients: z.array(ParsedClientSchema.shape.parsed).default([]),
    recipes: z.array(ParsedRecipeSchema.shape.parsed).default([]),
    notes: z.array(NoteSchema).default([]),
    unstructured: z.array(z.string()).default([])
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([])
})

export type BrainDumpResult = z.infer<typeof BrainDumpResponseSchema>['parsed']

const BRAIN_DUMP_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's management system (ChefFlow). Your job is to parse a free-form "brain dump" — the chef is typing everything they know, and you need to categorize and structure it.

The dump may contain ANY mix of:
1. CLIENT INFO — names, dietary preferences, allergies, addresses, payment history, household members, etc.
2. RECIPES — recipe names, ingredients, methods, yields, etc.
3. GENERAL NOTES — event ideas, site notes, scheduling preferences, business ideas, etc.
4. UNSTRUCTURED — anything you can't confidently categorize

RULES:
- One dump might reference multiple types: "John lives nearby, always does Valentine's Day, and his pan sauce recipe is..." → extract client info for John AND a recipe for pan sauce.
- For CLIENTS: extract into the full client structure with all applicable fields.
- For RECIPES: extract into the full recipe structure with ingredients and method.
- For NOTES: categorize as "event_idea", "site_note", "business_note", "scheduling", or "general". Include a suggestedAction field.
- For UNSTRUCTURED: include the raw text of anything you can't categorize.
- Allergies are SAFETY-CRITICAL. Any allergy mention gets flagged.
- Money amounts in cents. "$100/person" → 10000 cents.
- NEVER invent facts. Only extract what is stated or clearly implied.

CLIENT fields:
- full_name, email, phone, partner_name, address, dietary_restrictions, allergies, dislikes, spice_tolerance (none|mild|medium|hot|very_hot), favorite_cuisines, favorite_dishes, preferred_contact_method (phone|email|text|instagram), referral_source (take_a_chef|instagram|referral|website|phone|email|other), referral_source_detail, regular_guests [{name, relationship, notes}], household_members [{name, relationship, notes}], addresses [{label, address, city, state, zip, notes}], parking_instructions, access_instructions, kitchen_size, kitchen_constraints, house_rules, equipment_available, equipment_must_bring, vibe_notes, what_they_care_about, wine_beverage_preferences, average_spend_cents, payment_behavior, tipping_pattern, status (active|dormant|repeat_ready|vip), children, farewell_style, personal_milestones, field_confidence

RECIPE fields:
- name, category (sauce|protein|starch|vegetable|fruit|dessert|bread|pasta|soup|salad|appetizer|condiment|beverage|other), description, method, method_detailed, ingredients [{name, quantity, unit, preparation_notes, is_optional, estimated, category, allergen_flags}], yield_quantity, yield_unit, yield_description, prep_time_minutes, cook_time_minutes, total_time_minutes, dietary_tags, allergen_flags, adaptations, notes, field_confidence

RESPOND WITH ONLY valid JSON (no markdown, no explanation):
{
  "parsed": {
    "clients": [ ... client objects ... ],
    "recipes": [ ... recipe objects ... ],
    "notes": [
      {"type": "event_idea|site_note|business_note|scheduling|general", "content": "string", "suggestedAction": "string"}
    ],
    "unstructured": ["string - raw text of anything uncategorizable"]
  },
  "confidence": "high|medium|low",
  "warnings": ["string"]
}`

/**
 * Parse a brain dump into categorized structured data
 */
export async function parseBrainDump(rawText: string): Promise<ParseResult<BrainDumpResult>> {
  const result = await parseWithAI(
    BRAIN_DUMP_SYSTEM_PROMPT,
    rawText,
    BrainDumpResponseSchema
  )
  return result
}
