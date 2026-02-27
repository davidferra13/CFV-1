// Ollama-powered menu text parser
// Takes raw extracted text from a menu document and identifies dishes.
// Uses LOCAL Ollama only — data never leaves the machine.
// This is text comprehension (reading what the chef wrote), NOT recipe generation.

'use server'

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'

// ============================================
// SCHEMA
// ============================================

const ParsedDishSchema = z.object({
  dish_name: z.string().min(1),
  course: z.string().default('other'),
  description: z.string().default(''),
  dietary_tags: z.array(z.string()).default([]),
})

const MenuParseResultSchema = z.object({
  dishes: z.array(ParsedDishSchema),
})

export type ParsedDish = z.infer<typeof ParsedDishSchema> & {
  confidence?: number
}

export type MenuParseResult = {
  dishes: ParsedDish[]
  warnings: string[]
  raw_text: string
}

// ============================================
// SYSTEM PROMPT
// ============================================

const MENU_PARSER_PROMPT = `You are a menu parser for a private chef platform. Extract dishes from the provided menu text.

For each dish, identify:
- dish_name: The name of the dish (e.g., "Pan-Seared Diver Scallops")
- course: Which course this belongs to. Use one of: amuse, canapé, appetizer, soup, salad, fish, entrée, cheese, dessert, side, beverage, other
- description: Any description text that accompanies the dish (e.g., "with cauliflower purée, brown butter, and microgreens"). If none, use empty string.
- dietary_tags: Any dietary indicators mentioned (GF, DF, V, VG, NF, SF, EF, etc.). If none, use empty array.

CRITICAL RULES:
- Extract ONLY what is written on the menu. Do NOT add, infer, or generate any information.
- If a course heading is missing, infer the most likely course from the dish name and its position in the menu.
- If a dish has no description, set description to "".
- Ignore pricing, footnotes, restaurant names, dates, and non-dish text.
- Each distinct dish should be its own entry — do not merge multiple dishes into one.

Return a JSON object with a "dishes" array.`

// ============================================
// PARSER
// ============================================

/**
 * Parse raw menu text into structured dish entries using Ollama.
 * This is legitimate AI use — interpreting unstructured text, not generating recipes.
 */
export async function parseMenuText(rawText: string): Promise<MenuParseResult> {
  const warnings: string[] = []

  if (!rawText || rawText.trim().length < 10) {
    return { dishes: [], warnings: ['Text too short to parse'], raw_text: rawText }
  }

  // Truncate extremely long texts to avoid overwhelming the model
  const maxChars = 8000
  let textToSend = rawText
  if (rawText.length > maxChars) {
    textToSend = rawText.slice(0, maxChars)
    warnings.push(`Text truncated from ${rawText.length} to ${maxChars} characters`)
  }

  const result = await parseWithOllama(MENU_PARSER_PROMPT, textToSend, MenuParseResultSchema, {
    modelTier: 'fast',
    timeoutMs: 90_000,
    maxTokens: 2048,
  })

  const dishes: ParsedDish[] = result.dishes.map((d) => ({
    ...d,
    course: normalizeCourse(d.course),
  }))

  if (dishes.length === 0) {
    warnings.push('No dishes were found in the text')
  }

  return { dishes, warnings, raw_text: rawText }
}

/**
 * Parse pasted/typed text directly (no file upload needed).
 */
export async function parseMenuFromPastedText(text: string): Promise<MenuParseResult> {
  return parseMenuText(text)
}

// ============================================
// HELPERS
// ============================================

const VALID_COURSES = new Set([
  'amuse',
  'canapé',
  'appetizer',
  'soup',
  'salad',
  'fish',
  'entrée',
  'cheese',
  'dessert',
  'side',
  'beverage',
  'other',
])

function normalizeCourse(course: string): string {
  const lower = course.toLowerCase().trim()

  // Direct match
  if (VALID_COURSES.has(lower)) return lower

  // Common aliases
  const aliases: Record<string, string> = {
    'amuse bouche': 'amuse',
    'amuse-bouche': 'amuse',
    'hors doeuvre': 'canapé',
    "hors d'oeuvre": 'canapé',
    "hors d'oeuvres": 'canapé',
    passed: 'canapé',
    starter: 'appetizer',
    'first course': 'appetizer',
    first: 'appetizer',
    'second course': 'fish',
    main: 'entrée',
    'main course': 'entrée',
    entree: 'entrée',
    protein: 'entrée',
    meat: 'entrée',
    intermezzo: 'other',
    'palate cleanser': 'other',
    sweet: 'dessert',
    sweets: 'dessert',
    'petit four': 'dessert',
    'petit fours': 'dessert',
    mignardise: 'dessert',
    drink: 'beverage',
    wine: 'beverage',
    cocktail: 'beverage',
    accompaniment: 'side',
    garnish: 'side',
    vegetable: 'side',
    starch: 'side',
  }

  if (aliases[lower]) return aliases[lower]

  // Partial match
  for (const [alias, course] of Object.entries(aliases)) {
    if (lower.includes(alias)) return course
  }

  return 'other'
}
