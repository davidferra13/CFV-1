// Heuristic info change detection for Communication Capture Loop (Deliverable 2)
// Detects guest count, date, dietary, menu feedback, cancellation, payment, and address changes.
// Pure heuristic: no AI dependency. Works without Ollama.

import type { SuggestedUpdate, InfoChangeType } from './info-change-types'

type DetectionRule = {
  type: InfoChangeType
  patterns: RegExp[]
  extractor: (text: string, match: RegExpMatchArray) => string | null
  label: (value: string | null) => string
  targetField: string
  targetEntity: 'event' | 'client'
  /** Tags that boost confidence when present */
  boostTags?: string[]
}

const GUEST_COUNT_PATTERNS = [
  /(\d{1,4})\s*(?:guests?|people|covers?|seats?|pax|heads?|persons?)/i,
  /(?:guests?|people|covers?|seats?|pax)\s*(?:to|is|are|changed?\s*to|now|=)\s*(\d{1,4})/i,
  /(?:changed?|updated?|moved?|switched?)\s*(?:to|the)\s*(?:guest\s*count\s*(?:to)?)\s*(\d{1,4})/i,
]

const DATE_PATTERNS = [
  /(?:moved?|rescheduled?|changed?|pushed?|shifted?)\s*(?:to|the\s*date\s*to)\s*(\w+\s+\d{1,2}(?:\s*,?\s*\d{4})?)/i,
  /(?:new\s*date|date\s*(?:is|changed?\s*to))\s*:?\s*(\w+\s+\d{1,2}(?:\s*,?\s*\d{4})?)/i,
  /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(?:instead|now|new\s*date)/i,
]

const DIETARY_KEYWORDS = [
  'vegetarian',
  'pescatarian',
  'vegan',
  'allergy',
  'allergic',
  'allergies',
  'gluten',
  'gluten-free',
  'kosher',
  'halal',
  'dairy-free',
  'dairy free',
  'nut-free',
  'nut free',
  'peanut',
  'shellfish',
  'celiac',
  'keto',
  'paleo',
  'lactose',
  'soy-free',
  'soy free',
  'egg-free',
  'egg free',
  'low-carb',
  'low carb',
  'plant-based',
  'plant based',
]

const DIETARY_PATTERNS = DIETARY_KEYWORDS.map((kw) => new RegExp(`\\b${kw}\\b`, 'i'))

const MENU_FEEDBACK_PATTERNS = [
  /(?:loved?\s*the|really\s*liked?\s*the|enjoyed?\s*the)\s+(.{3,60})/i,
  /(?:didn'?t\s*like|not\s*a\s*fan\s*of|skip\s*the|hold\s*the|no\s*more)\s+(.{3,60})/i,
  /(?:wants?\s*more|would\s*love\s*more|more\s*of\s*the)\s+(.{3,60})/i,
  /(?:favorite\s*(?:dish|part|thing)\s*was)\s+(.{3,60})/i,
]

const CANCELLATION_PATTERNS = [
  /\b(?:cancel(?:l?ed|l?ing)?|postpone[ds]?|not\s*happening|called?\s*(?:it\s*)?off)\b/i,
  /\b(?:won'?t\s*(?:be\s*)?(?:happening|going|doing|needing))\b/i,
]

const PAYMENT_PATTERNS = [
  /\b(?:paid|sent\s*(?:the\s*)?deposit|venmo|zelle|check|payment|transferred?)\b/i,
  /\$\s*\d+/i,
  /\b(?:balance|invoice|receipt)\s*(?:paid|sent|received)/i,
]

const ADDRESS_PATTERNS = [
  /\b(?:new\s*address|changed?\s*(?:the\s*)?location|different\s*venue|moved?\s*(?:the\s*)?(?:venue|location|address))\b/i,
  /\b(?:address\s*(?:is|changed?\s*to|now))\s*:?\s*(.{5,100})/i,
]

const RULES: DetectionRule[] = [
  {
    type: 'guest_count',
    patterns: GUEST_COUNT_PATTERNS,
    extractor: (_text, match) => {
      const num = match[1]
      return num && parseInt(num, 10) > 0 && parseInt(num, 10) <= 9999 ? num : null
    },
    label: (v) =>
      v
        ? `Guest count changed to ${v}. Update the event?`
        : 'Guest count change detected. Update the event?',
    targetField: 'guest_count',
    targetEntity: 'event',
    boostTags: ['guest_count'],
  },
  {
    type: 'date_change',
    patterns: DATE_PATTERNS,
    extractor: (_text, match) => match[1]?.trim() || null,
    label: (v) =>
      v ? `Date changed to ${v}. Update the event?` : 'Date change detected. Update the event?',
    targetField: 'event_date',
    targetEntity: 'event',
    boostTags: ['date_change'],
  },
  {
    type: 'dietary_change',
    patterns: DIETARY_PATTERNS,
    extractor: (_text, match) => match[0]?.trim() || null,
    label: (v) =>
      v
        ? `Dietary update: ${v}. Update the client profile?`
        : 'Dietary change detected. Update the client profile?',
    targetField: 'dietary_notes',
    targetEntity: 'client',
    boostTags: ['dietary_change'],
  },
  {
    type: 'menu_feedback',
    patterns: MENU_FEEDBACK_PATTERNS,
    extractor: (_text, match) => match[1]?.trim() || match[0]?.trim() || null,
    label: (v) =>
      v ? `Menu feedback: "${v}". Save as a note?` : 'Menu feedback detected. Save as a note?',
    targetField: 'menu_notes',
    targetEntity: 'event',
    boostTags: ['menu_feedback'],
  },
  {
    type: 'cancellation',
    patterns: CANCELLATION_PATTERNS,
    extractor: () => null,
    label: () => 'Possible cancellation or postponement. Review the event status?',
    targetField: 'status',
    targetEntity: 'event',
  },
  {
    type: 'payment',
    patterns: PAYMENT_PATTERNS,
    extractor: (text) => {
      const dollarMatch = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/i)
      return dollarMatch ? dollarMatch[1].replace(/,/g, '') : null
    },
    label: (v) =>
      v ? `Payment of $${v} mentioned. Log a payment?` : 'Payment mentioned. Log a payment?',
    targetField: 'payment',
    targetEntity: 'event',
    boostTags: ['payment'],
  },
  {
    type: 'address_change',
    patterns: ADDRESS_PATTERNS,
    extractor: (_text, match) => match[1]?.trim() || null,
    label: (v) =>
      v
        ? `New location: "${v}". Update the event?`
        : 'Address or venue change detected. Update the event?',
    targetField: 'location',
    targetEntity: 'event',
  },
]

/**
 * Detect potential info changes in captured communication text.
 * Returns high-confidence matches only by default; tags from the capture form boost confidence.
 */
export function detectInfoChanges(text: string, tags: string[] = []): SuggestedUpdate[] {
  if (!text || text.trim().length < 3) return []

  const results: SuggestedUpdate[] = []
  const seenTypes = new Set<InfoChangeType>()

  for (const rule of RULES) {
    if (seenTypes.has(rule.type)) continue

    for (const pattern of rule.patterns) {
      const match = text.match(pattern)
      if (!match) continue

      const extracted = rule.extractor(text, match)
      const hasBoostedTag = rule.boostTags?.some((t) => tags.includes(t)) ?? false

      // Determine confidence: tag presence boosts; extracted value boosts
      let confidence: 'high' | 'medium' | 'low' = 'low'
      if (hasBoostedTag && extracted) {
        confidence = 'high'
      } else if (hasBoostedTag || extracted) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }

      // Only surface medium+ confidence to avoid noise
      if (confidence === 'low') continue

      results.push({
        type: rule.type,
        confidence,
        label: rule.label(extracted),
        extractedValue: extracted,
        targetField: rule.targetField,
        targetEntity: rule.targetEntity,
      })

      seenTypes.add(rule.type)
      break
    }
  }

  return results
}
