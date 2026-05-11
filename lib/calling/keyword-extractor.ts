// Keyword-based call transcript extraction (fallback when Ollama is offline)
// Expands on YES_WORDS/NO_WORDS with regex patterns for price, delivery,
// quantity, and sentiment. Returns a partial CallExtractionResult.

import type { CallExtractionResult } from './call-llm-processor'

// ---------------------------------------------------------------------------
// Word lists
// ---------------------------------------------------------------------------

const YES_WORDS = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'we do',
  'absolutely',
  'correct',
  'sure',
  'affirmative',
  'we have',
  'in stock',
  'got it',
  'got some',
  'we got',
  'have it',
  'we carry',
  'carry that',
  'definitely',
  'of course',
  'certainly',
]

const NO_WORDS = [
  'no',
  'nope',
  'nah',
  "we don't",
  "don't have",
  'out of stock',
  'not right now',
  'unavailable',
  'we do not',
  'not available',
  'sorry',
  "don't carry",
  "we're out",
  'fresh out',
  'sold out',
  'not in',
  'none left',
]

const POSITIVE_WORDS = [
  'happy to',
  'love to',
  'glad',
  'great',
  'wonderful',
  'excellent',
  'no problem',
  'anytime',
  'welcome',
  'pleasure',
  'look forward',
]

const NEGATIVE_WORDS = [
  'unfortunately',
  'regret',
  'afraid',
  'can not',
  "can't",
  'impossible',
  'difficult',
  'tough',
  'hard to',
  'not possible',
]

const HESITANT_WORDS = [
  'maybe',
  'might',
  'possibly',
  'depends',
  'not sure',
  'let me check',
  'have to see',
  'uncertain',
  'iffy',
  'could be',
]

const URGENCY_WORDS = [
  'limited',
  'running low',
  'last',
  'going fast',
  'price going up',
  'almost out',
  'only a few',
  "won't last",
  'seasonal',
  'ending soon',
  'while supplies last',
  'hurry',
  'selling quick',
]

const DELIVERY_WORDS = [
  'deliver',
  'delivery',
  'drop off',
  'drop-off',
  'dropoff',
  'pickup',
  'pick up',
  'pick-up',
  'bring',
  'ship',
  'send over',
]

// ---------------------------------------------------------------------------
// Unit aliases for normalization
// ---------------------------------------------------------------------------

const UNIT_ALIASES: Record<string, string> = {
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  lbs: 'lb',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  piece: 'each',
  pieces: 'each',
  each: 'each',
  unit: 'each',
  units: 'each',
  item: 'each',
  items: 'each',
  dozen: 'dozen',
  dozens: 'dozen',
  case: 'case',
  cases: 'case',
  box: 'case',
  boxes: 'case',
  bag: 'bag',
  bags: 'bag',
  gallon: 'gallon',
  gallons: 'gallon',
  quart: 'quart',
  quarts: 'quart',
  pint: 'pint',
  pints: 'pint',
  liter: 'liter',
  liters: 'liter',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  kgs: 'kg',
  bunch: 'bunch',
  bunches: 'bunch',
}

const UNIT_PATTERN =
  'pound|pounds|lb|lbs|ounce|ounces|oz|piece|pieces|each|unit|units|item|items|dozen|dozens|case|cases|box|boxes|bag|bags|gallon|gallons|quart|quarts|pint|pints|liter|liters|kilogram|kilograms|kg|kgs|bunch|bunches'

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function normalizeUnit(raw: string): string {
  return UNIT_ALIASES[raw.toLowerCase()] ?? raw.toLowerCase()
}

function extractPrice(text: string): { price: number; unit: string | null; raw: string } | null {
  // $14.50/lb, $14.50 per pound, $14.50 a case
  const dollarSign = text.match(
    new RegExp(`\\$(\\d+(?:\\.\\d{1,2})?)\\s*(?:(?:a|per|/)\\s*(${UNIT_PATTERN}))?`, 'i')
  )
  if (dollarSign) {
    return {
      price: parseFloat(dollarSign[1]),
      unit: dollarSign[2] ? normalizeUnit(dollarSign[2]) : null,
      raw: dollarSign[0],
    }
  }

  // "14 dollars", "14 dollars a pound"
  const dollarWord = text.match(
    new RegExp(
      `(\\d+(?:\\.\\d{1,2})?)\\s*(?:dollars?|bucks?)(?:\\s*(?:a|per|/)\\s*(${UNIT_PATTERN}))?`,
      'i'
    )
  )
  if (dollarWord) {
    return {
      price: parseFloat(dollarWord[1]),
      unit: dollarWord[2] ? normalizeUnit(dollarWord[2]) : null,
      raw: dollarWord[0],
    }
  }

  // "14.50 a pound", "45 per case" (bare number with unit, no dollar sign)
  const bareWithUnit = text.match(
    new RegExp(`(\\d+(?:\\.\\d{1,2})?)\\s*(?:a|per|/)\\s*(${UNIT_PATTERN})`, 'i')
  )
  if (bareWithUnit) {
    return {
      price: parseFloat(bareWithUnit[1]),
      unit: normalizeUnit(bareWithUnit[2]),
      raw: bareWithUnit[0],
    }
  }

  return null
}

function extractQuantity(text: string): { quantity: number | null; unit: string | null } {
  // "50 pounds", "3 cases", "200 units"
  const exact = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})`, 'i'))
  if (exact) {
    return { quantity: parseFloat(exact[1]), unit: normalizeUnit(exact[2]) }
  }

  // "a few", "several", etc.: return null quantity but flag the unit if present
  const vague = text.match(/\b(a few|several|some|plenty|a lot)\b/i)
  if (vague) {
    return { quantity: null, unit: null }
  }

  return { quantity: null, unit: null }
}

function extractDeliveryWindow(text: string): string | null {
  // "between 6 and 8 am"
  const between = text.match(
    /between\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+and\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  )
  if (between) return `between ${between[1]} and ${between[2]}`

  // "around 6am", "at 7:30 pm"
  const around = text.match(
    /(?:around|at|approximately|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  )
  if (around) return around[0]

  // "tomorrow morning", "Thursday afternoon"
  const dayTime = text.match(
    /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(morning|afternoon|evening|am|pm)\b/i
  )
  if (dayTime) return dayTime[0]

  // "tomorrow", "Thursday"
  const day = text.match(
    /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
  )
  if (day) return day[0]

  // "morning", "afternoon"
  const period = text.match(/\b(morning|afternoon|evening)\b/i)
  if (period) return period[0]

  return null
}

function extractDeliveryMinimum(text: string): string | null {
  // "$200 minimum", "minimum order of $100", "minimum $50"
  const minDollar = text.match(/\$(\d+(?:\.\d{1,2})?)\s*minimum/i)
  if (minDollar) return `$${minDollar[1]} minimum`

  const minOrder = text.match(/minimum\s*(?:order\s*(?:of\s*)?)?\$(\d+(?:\.\d{1,2})?)/i)
  if (minOrder) return `$${minOrder[1]} minimum`

  return null
}

function detectSentiment(text: string): 'positive' | 'neutral' | 'hesitant' | 'negative' {
  const lower = text.toLowerCase()
  let positiveScore = 0
  let negativeScore = 0
  let hesitantScore = 0

  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) positiveScore++
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) negativeScore++
  }
  for (const w of HESITANT_WORDS) {
    if (lower.includes(w)) hesitantScore++
  }

  if (hesitantScore > positiveScore && hesitantScore > negativeScore) return 'hesitant'
  if (negativeScore > positiveScore) return 'negative'
  if (positiveScore > 0) return 'positive'
  return 'neutral'
}

function detectAvailability(text: string): boolean | null {
  const lower = text.toLowerCase()
  const yesMatch = YES_WORDS.some((w) => lower.includes(w))
  const noMatch = NO_WORDS.some((w) => lower.includes(w))

  if (yesMatch && !noMatch) return true
  if (noMatch && !yesMatch) return false
  // Both or neither: ambiguous
  return null
}

function detectUrgency(text: string): boolean {
  const lower = text.toLowerCase()
  return URGENCY_WORDS.some((w) => lower.includes(w))
}

function detectDeliveryAvailable(text: string): boolean | null {
  const lower = text.toLowerCase()
  const hasDeliveryWord = DELIVERY_WORDS.some((w) => lower.includes(w))
  if (!hasDeliveryWord) return null

  // Check if delivery is negated
  const negated =
    /\b(?:no|don't|do not|can't|cannot|won't|will not)\s+(?:deliver|delivery|drop off)/i.test(text)
  if (negated) return false
  return true
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Extracts structured data from a call transcript using keyword and regex
 * matching. This is the fallback when Ollama is unavailable. Results will
 * have lower confidence than LLM extraction.
 */
export function extractFromKeywords(
  transcript: string,
  ingredientName: string,
  vendorName: string
): CallExtractionResult {
  if (!transcript || transcript.trim().length === 0) {
    return {
      available: null,
      confidence: 0,
      availability_notes: null,
      price: null,
      price_unit: null,
      price_conditions: null,
      price_competitiveness: 0,
      quantity_available: null,
      quantity_unit: null,
      delivery_available: null,
      delivery_window: null,
      delivery_minimum: null,
      delivery_contact: null,
      vendor_sentiment: 'neutral',
      urgency_detected: false,
      follow_up_needed: false,
      follow_up_reason: null,
      summary: `Call with ${vendorName} about ${ingredientName}: no transcript captured.`,
    }
  }

  const available = detectAvailability(transcript)
  const priceData = extractPrice(transcript)
  const quantityData = extractQuantity(transcript)
  const deliveryAvailable = detectDeliveryAvailable(transcript)
  const deliveryWindow = extractDeliveryWindow(transcript)
  const deliveryMinimum = extractDeliveryMinimum(transcript)
  const sentiment = detectSentiment(transcript)
  const urgency = detectUrgency(transcript)

  // Confidence: keyword matching is less reliable; cap at 0.6
  let confidence = 0.3
  if (available !== null) confidence += 0.15
  if (priceData) confidence += 0.1
  if (quantityData.quantity !== null) confidence += 0.05

  // Determine follow-up need
  const followUpNeeded = available === null || (available === true && priceData === null)
  const followUpReason =
    available === null
      ? 'Could not determine availability from transcript'
      : available === true && priceData === null
        ? 'Availability confirmed but no price captured'
        : null

  // Build summary
  const parts: string[] = []
  if (available === true) parts.push(`${ingredientName} available`)
  else if (available === false) parts.push(`${ingredientName} not available`)
  else parts.push(`${ingredientName} availability unclear`)

  if (priceData) parts.push(`at $${priceData.price}${priceData.unit ? '/' + priceData.unit : ''}`)
  if (deliveryWindow) parts.push(`delivery ${deliveryWindow}`)
  if (urgency) parts.push('(limited stock/urgency detected)')

  const summary = `${vendorName}: ${parts.join(', ')}.`

  return {
    available,
    confidence: Math.min(confidence, 0.6),
    availability_notes: null,
    price: priceData?.price ?? null,
    price_unit: priceData?.unit ?? null,
    price_conditions: null,
    price_competitiveness: 0, // Cannot assess without market data in keyword mode
    quantity_available: quantityData.quantity,
    quantity_unit: quantityData.unit,
    delivery_available: deliveryAvailable,
    delivery_window: deliveryWindow,
    delivery_minimum: deliveryMinimum,
    delivery_contact: null, // Cannot reliably extract contact names with regex
    vendor_sentiment: sentiment,
    urgency_detected: urgency,
    follow_up_needed: followUpNeeded,
    follow_up_reason: followUpReason,
    summary,
  }
}
