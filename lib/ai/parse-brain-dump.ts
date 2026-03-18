// Brain Dump Parser
// The most flexible import - chef dumps information and the system
// figures out what it is and where it goes

'use server'

import { z } from 'zod'
import { type ParseResult } from './parse'
import { parseWithOllama } from './parse-ollama'
import { ParsedClientSchema, type ParsedClient } from './parse-client-schema'
import { ParsedRecipeSchema, type ParsedRecipe } from './parse-recipe-schema'
import {
  parseClientsHeuristically,
  parseRecipesHeuristically,
  toFallbackWarning,
} from './fallback-parsers'

// ============================================
// BRAIN DUMP RESPONSE SCHEMA
// ============================================

const NoteSchema = z.object({
  type: z.string(),
  content: z.string(),
  suggestedAction: z.string(),
})

export type ParsedNote = z.infer<typeof NoteSchema>

const BrainDumpResponseSchema = z.object({
  parsed: z.object({
    clients: z.array(ParsedClientSchema.shape.parsed).default([]),
    recipes: z.array(ParsedRecipeSchema.shape.parsed).default([]),
    notes: z.array(NoteSchema).default([]),
    unstructured: z.array(z.string()).default([]),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]),
})

export type BrainDumpResult = z.infer<typeof BrainDumpResponseSchema>['parsed']

const BRAIN_DUMP_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's management system (ChefFlow). Your job is to parse a free-form "brain dump" - the chef is typing everything they know, and you need to categorize and structure it.

The dump may contain ANY mix of:
1. CLIENT INFO - names, dietary preferences, allergies, addresses, payment history, household members, etc.
2. RECIPES - recipe names, ingredients, methods, yields, etc.
3. GENERAL NOTES - event ideas, site notes, scheduling preferences, business ideas, etc.
4. UNSTRUCTURED - anything you can't confidently categorize

RULES:
- One dump might reference multiple types: "John lives nearby, always does Valentine's Day, and his pan sauce recipe is..." → extract client info for John AND a recipe for pan sauce.
- For CLIENTS: extract into the full client structure with all applicable fields.
- If the text explicitly asks to create a separate profile/client for another person (e.g. "also create a profile for Tony"), include that person as a separate item in parsed.clients (not only as partner_name/household_member).
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

EXAMPLE:

Input: "Sarah Mitchell - nut allergy, husband Tom is vegan. They live in Newton, tip well, love Italian. Her chocolate lava cake: 4oz dark chocolate, 2 eggs, 1/4 cup sugar, 2 tbsp flour, pinch of salt. Bake 12 min at 425. Also need to follow up with the Hendersons about their July 4th party."
Output: { "parsed": { "clients": [{ "full_name": "Sarah Mitchell", "allergies": ["nut allergy"], "dietary_restrictions": [], "partner_name": "Tom", "vibe_notes": "Tips well", "favorite_cuisines": ["Italian"], "addresses": [{ "label": "home", "city": "Newton" }], "household_members": [{ "name": "Tom", "relationship": "husband", "notes": "Vegan" }], "field_confidence": { "full_name": "confirmed", "allergies": "confirmed" } }], "recipes": [{ "name": "Chocolate Lava Cake", "category": "dessert", "description": "Individual chocolate lava cakes", "method": "Melt chocolate, combine with eggs, sugar, flour, salt. Bake 12 min at 425°F.", "ingredients": [{ "name": "dark chocolate", "quantity": 4, "unit": "oz", "category": "baking", "allergen_flags": [] }, { "name": "eggs", "quantity": 2, "unit": "each", "category": "dairy", "allergen_flags": ["eggs"] }, { "name": "sugar", "quantity": 0.25, "unit": "cup", "category": "baking", "allergen_flags": [] }, { "name": "flour", "quantity": 2, "unit": "tbsp", "category": "baking", "allergen_flags": ["gluten"] }, { "name": "salt", "quantity": 1, "unit": "pinch", "estimated": true, "category": "spice", "allergen_flags": [] }], "allergen_flags": ["eggs", "gluten"], "field_confidence": { "name": "confirmed", "ingredients": "confirmed" } }], "notes": [{ "type": "follow_up", "content": "Follow up with the Hendersons about their July 4th party", "suggestedAction": "Contact the Hendersons to confirm July 4th party details" }], "unstructured": [] }, "confidence": "high", "warnings": ["Sarah's chocolate lava cake attributed to her based on context - verify ownership"] }

RESPOND WITH ONLY valid JSON (no markdown, no explanation).`

/**
 * Parse a brain dump into categorized structured data
 */
export async function parseBrainDump(rawText: string): Promise<ParseResult<BrainDumpResult>> {
  try {
    const result = await parseWithOllama(
      BRAIN_DUMP_SYSTEM_PROMPT,
      rawText,
      BrainDumpResponseSchema,
      {
        modelTier: 'complex',
        maxTokens: 1536,
      }
    )
    return result
  } catch (error) {
    const clientFallback = parseClientsHeuristically(rawText, toFallbackWarning(error))
    const recipes = parseRecipesHeuristically(rawText)
    const hasStructuredData = clientFallback.parsed.length > 0 || recipes.length > 0

    return {
      parsed: {
        clients: clientFallback.parsed,
        recipes,
        notes: hasStructuredData
          ? [
              {
                type: 'general',
                content: 'Imported using fallback parsing. Please review all fields before saving.',
                suggestedAction: 'Review extracted data and adjust details as needed.',
              },
            ]
          : [
              {
                type: 'general',
                content: rawText.slice(0, 400),
                suggestedAction: 'Review and classify this note manually.',
              },
            ],
        unstructured: hasStructuredData ? [] : [rawText],
      },
      confidence: 'low',
      warnings: [
        ...clientFallback.warnings,
        'Used fallback parser for brain dump. Review extracted data carefully before saving.',
      ],
    }
  }
}
