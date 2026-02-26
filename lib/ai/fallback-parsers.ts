import type { ParseResult } from './parse'
import type { ParsedClient } from './parse-client'
import type { ParsedRecipe } from './parse-recipe'

const ALLERGY_KEYWORDS = [
  'allergy',
  'allergic',
  'nut',
  'peanut',
  'shellfish',
  'dairy',
  'gluten',
  'soy',
  'sesame',
  'egg',
]

const RECIPE_VERB_PATTERN =
  /\b(sear|saute|simmer|bake|roast|whisk|deglaze|marinate|braise|poach|grill|recipe|ingredients?)\b/i

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function firstMatch(value: string, pattern: RegExp): string | null {
  const match = value.match(pattern)
  return match?.[1] ? match[1].trim() : null
}

function splitBlocks(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const byBlankLines = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (byBlankLines.length > 1) return byBlankLines

  return normalized
    .split(/\n(?=(?:[-*]\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s*[-:])/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function inferReferralSource(block: string): ParsedClient['referral_source'] {
  if (/instagram|ig\b/i.test(block)) return 'instagram'
  if (/take\s*a\s*chef/i.test(block)) return 'take_a_chef'
  if (/website|site|web/i.test(block)) return 'website'
  if (/referr/i.test(block)) return 'referral'
  if (/phone|call/i.test(block)) return 'phone'
  if (/email/i.test(block)) return 'email'
  return null
}

function inferContactMethod(block: string): ParsedClient['preferred_contact_method'] {
  if (/text|sms/i.test(block)) return 'text'
  if (/instagram|ig\b/i.test(block)) return 'instagram'
  if (/phone|call/i.test(block)) return 'phone'
  if (/email/i.test(block)) return 'email'
  return null
}

function inferSpiceTolerance(block: string): ParsedClient['spice_tolerance'] {
  if (/very hot|extra spicy/i.test(block)) return 'very_hot'
  if (/\bhot\b/i.test(block)) return 'hot'
  if (/\bmedium\b/i.test(block)) return 'medium'
  if (/\bmild\b/i.test(block)) return 'mild'
  if (/no spice|not spicy|zero spice/i.test(block)) return 'none'
  return null
}

function extractAllergies(block: string): string[] {
  const lower = block.toLowerCase()
  const hits = ALLERGY_KEYWORDS.filter((keyword) => lower.includes(keyword))
  return [...new Set(hits.map((value) => value.replace('allergic', 'allergy')))]
}

function inferAverageSpendCents(block: string): number | null {
  const perPerson = block.match(/\$?\s*(\d+(?:\.\d+)?)\s*\/\s*person/i)
  const guestCount = block.match(/(\d+)\s*(?:guests?|people|ppl|persons?)/i)
  if (perPerson) {
    const price = Math.round(Number(perPerson[1]) * 100)
    const guests = guestCount ? Number(guestCount[1]) : 1
    return price * Math.max(1, guests)
  }

  const total = block.match(/\$?\s*(\d{2,6}(?:\.\d{1,2})?)/)
  if (!total) return null
  return Math.round(Number(total[1]) * 100)
}

function inferPaymentBehavior(block: string): string | null {
  if (/venmo/i.test(block)) return 'venmo'
  if (/zelle/i.test(block)) return 'zelle'
  if (/paypal/i.test(block)) return 'paypal'
  if (/cash/i.test(block)) return 'cash'
  if (/check/i.test(block)) return 'check'
  if (/card|credit|debit|visa|mastercard|amex/i.test(block)) return 'card'
  return null
}

function inferClientName(block: string, index: number): string {
  const direct = firstMatch(block, /^(?:[-*]\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*[-:]/)
  if (direct) return direct

  const fallback = firstMatch(block, /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/)
  if (fallback) return fallback

  return `Imported Client ${index + 1}`
}

function buildClient(block: string, index: number): ParsedClient {
  const normalized = normalizeWhitespace(block)
  const fullName = inferClientName(block, index)
  const email = firstMatch(normalized, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)
  const phone = firstMatch(normalized, /(\+?\d[\d\s().-]{7,}\d)/)
  const partnerName =
    firstMatch(
      normalized,
      /\b(?:married to|partner(?: is)?|husband(?: is)?|wife(?: is)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    ) || null
  const address = firstMatch(
    normalized,
    /\b(\d{1,6}\s+[A-Za-z0-9.\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Ln|Dr|Drive)\b[^.,;]*)/i
  )

  return {
    full_name: fullName,
    email,
    phone,
    partner_name: partnerName,
    address,
    dietary_restrictions: [],
    allergies: extractAllergies(normalized),
    dislikes: [],
    spice_tolerance: inferSpiceTolerance(normalized),
    favorite_cuisines: [],
    favorite_dishes: [],
    preferred_contact_method: inferContactMethod(normalized),
    referral_source: inferReferralSource(normalized),
    referral_source_detail: null,
    regular_guests: [],
    household_members: [],
    addresses: [],
    parking_instructions: null,
    access_instructions: firstMatch(
      normalized,
      /\b(?:enter|entry|access)\s+(?:through|via)\s+([^.,;]+)/i
    ),
    kitchen_size: null,
    kitchen_constraints: null,
    house_rules: null,
    equipment_available: [],
    equipment_must_bring: [],
    vibe_notes: null,
    what_they_care_about: null,
    wine_beverage_preferences: null,
    average_spend_cents: inferAverageSpendCents(normalized),
    payment_behavior: inferPaymentBehavior(normalized),
    tipping_pattern: null,
    status: 'active',
    children: [],
    farewell_style: null,
    personal_milestones: null,
    field_confidence: {},
  }
}

function inferRecipeCategory(block: string): ParsedRecipe['category'] {
  if (/sauce/i.test(block)) return 'sauce'
  if (/soup/i.test(block)) return 'soup'
  if (/salad/i.test(block)) return 'salad'
  if (/pasta/i.test(block)) return 'pasta'
  if (/dessert|cake|cookie|ice cream|sorbet/i.test(block)) return 'dessert'
  if (/drink|cocktail|beverage/i.test(block)) return 'beverage'
  if (/bread|loaf/i.test(block)) return 'bread'
  if (/appetizer|starter/i.test(block)) return 'appetizer'
  return 'other'
}

function inferRecipeName(block: string, index: number): string {
  const explicit = firstMatch(block, /^(?:[-*]\s*)?([A-Za-z][A-Za-z0-9 '&]{2,50})\s*[-:]/)
  if (explicit) return normalizeWhitespace(explicit)
  return `Imported Recipe ${index + 1}`
}

function looksLikeRecipe(block: string): boolean {
  return RECIPE_VERB_PATTERN.test(block)
}

function inferAllergenFlags(block: string): string[] {
  const flags: string[] = []
  const lower = block.toLowerCase()
  if (/cream|milk|cheese|butter|yogurt/.test(lower)) flags.push('dairy')
  if (/flour|bread|pasta|wheat/.test(lower)) flags.push('gluten')
  if (/shrimp|prawn|crab|lobster|shellfish/.test(lower)) flags.push('shellfish')
  if (/peanut|almond|walnut|cashew|pecan|nut/.test(lower)) flags.push('nuts')
  return [...new Set(flags)]
}

export function toFallbackWarning(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown parser error'
  return `AI parser failed strict validation (${message}). Used fallback extraction instead.`
}

export function parseClientsHeuristically(
  rawText: string,
  warning?: string
): ParseResult<ParsedClient[]> {
  const blocks = splitBlocks(rawText)
  const parsed = blocks.map((block, index) => buildClient(block, index))

  if (parsed.length === 0 && rawText.trim()) {
    parsed.push(buildClient(rawText, 0))
  }

  const warnings = [warning || 'Used fallback parser. Review fields before saving.']

  return {
    parsed,
    confidence: 'low',
    warnings,
  }
}

export function parseRecipesHeuristically(rawText: string): ParsedRecipe[] {
  const blocks = splitBlocks(rawText)
  const recipeBlocks = blocks.filter(looksLikeRecipe)

  return recipeBlocks.map((block, index) => ({
    name: inferRecipeName(block, index),
    category: inferRecipeCategory(block),
    description: null,
    method: normalizeWhitespace(block),
    method_detailed: normalizeWhitespace(block),
    ingredients: [],
    yield_quantity: null,
    yield_unit: null,
    yield_description: null,
    prep_time_minutes: null,
    cook_time_minutes: null,
    total_time_minutes: null,
    dietary_tags: [],
    allergen_flags: inferAllergenFlags(block),
    adaptations: null,
    notes: null,
    field_confidence: {},
  }))
}
