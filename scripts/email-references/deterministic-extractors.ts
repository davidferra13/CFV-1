/**
 * Deterministic field extraction from email text.
 *
 * Pure regex/formula functions - no AI, no Ollama, no network calls.
 * Runs instantly on any email, produces structured data for every field
 * that can be reliably extracted without LLM interpretation.
 *
 * Regex patterns sourced from lib/gmail/classify.ts (Layer 4.5 heuristic)
 * and extended to return matched VALUES, not just boolean scores.
 */

import type {
  DeterministicFields,
  DateMention,
  GuestCountMention,
  BudgetMention,
} from './extraction-types'

// ─── Quoted Text Stripping ──────────────────────────────────────────────
// Email replies include quoted text from previous messages. We must strip
// it before extraction to avoid double-counting facts from earlier emails.

function stripQuotedText(body: string): string {
  const lines = body.split('\n')
  const result: string[] = []
  let inQuotedBlock = false

  for (const line of lines) {
    // "On <date>, <name> wrote:" block starts quoted text
    if (/^On .+ wrote:$/i.test(line.trim())) {
      inQuotedBlock = true
      continue
    }
    // Lines starting with > are quoted
    if (line.trimStart().startsWith('>')) {
      continue
    }
    // "Sent from my iPhone" and similar signatures end the useful content
    if (/^Sent from my (iPhone|iPad|Galaxy|Android)/i.test(line.trim())) {
      break
    }
    // Gmail "---------- Forwarded message ----------"
    if (line.includes('---------- Forwarded message ----------')) {
      break
    }
    if (!inQuotedBlock) {
      result.push(line)
    }
  }

  return result.join('\n').trim()
}

// ─── Phone Numbers ──────────────────────────────────────────────────────

export function extractPhones(text: string): string[] {
  const phoneRegex = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g
  const matches = text.match(phoneRegex) || []
  // Dedupe and normalize
  const seen = new Set<string>()
  const result: string[] = []
  for (const m of matches) {
    const normalized = m.replace(/[^\d+]/g, '')
    if (normalized.length >= 10 && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(m.trim())
    }
  }
  return result
}

// ─── Email Addresses ────────────────────────────────────────────────────

export function extractEmails(text: string): string[] {
  const emailRegex = /[\w.+-]+@[\w.-]+\.\w{2,}/gi
  const matches = text.match(emailRegex) || []
  const seen = new Set<string>()
  const result: string[] = []
  for (const m of matches) {
    const lower = m.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      result.push(lower)
    }
  }
  return result
}

// ─── Date Mentions ──────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function tryParseDate(raw: string): string | null {
  // "June 15" / "Jun 15th" / "September 18"
  const monthDay = raw.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  )
  if (monthDay) {
    const month = MONTH_NAMES[monthDay[1].toLowerCase().slice(0, 3)]
    const day = parseInt(monthDay[2])
    if (month && day >= 1 && day <= 31) {
      // Infer year from context - emails in dataset are 2023-2025
      return `YYYY-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  // "10/4" or "10/4/2025"
  const slashDate = raw.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slashDate) {
    const month = parseInt(slashDate[1])
    const day = parseInt(slashDate[2])
    const year = slashDate[3]
      ? slashDate[3].length === 2
        ? `20${slashDate[3]}`
        : slashDate[3]
      : 'YYYY'
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

function getContext(text: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - 40)
  const end = Math.min(text.length, matchIndex + matchLength + 40)
  return text.slice(start, end).replace(/\n/g, ' ').trim()
}

export function extractDates(text: string): DateMention[] {
  const results: DateMention[] = []
  const seen = new Set<string>()

  // Month + day patterns
  const monthDayRegex =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/gi
  let match
  while ((match = monthDayRegex.exec(text)) !== null) {
    const raw = match[0]
    if (seen.has(raw.toLowerCase())) continue
    seen.add(raw.toLowerCase())
    results.push({
      raw,
      parsed: tryParseDate(raw),
      context: getContext(text, match.index, match[0].length),
    })
  }

  // MM/DD or MM/DD/YYYY
  const slashRegex = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g
  while ((match = slashRegex.exec(text)) !== null) {
    const raw = match[0]
    if (seen.has(raw)) continue
    seen.add(raw)
    const month = parseInt(match[1])
    const day = parseInt(match[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      results.push({
        raw,
        parsed: tryParseDate(raw),
        context: getContext(text, match.index, match[0].length),
      })
    }
  }

  return results
}

// ─── Guest Counts ───────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
}

export function extractGuestCounts(text: string): GuestCountMention[] {
  const results: GuestCountMention[] = []
  const lower = text.toLowerCase()

  // "N guests/people/persons/adults/couples"
  const numPeople = /\b(\d+)\s*(?:guests?|people|persons?|adults?|couples?)\b/gi
  let match
  while ((match = numPeople.exec(lower)) !== null) {
    results.push({ raw: match[0], number: parseInt(match[1]), range_low: null, range_high: null })
  }

  // "dinner/party for N"
  const dinnerFor = /\b(?:dinner|party|event|celebration|gathering)\s+(?:for|of)\s+(\d+)/gi
  while ((match = dinnerFor.exec(lower)) !== null) {
    results.push({ raw: match[0], number: parseInt(match[1]), range_low: null, range_high: null })
  }

  // "dinner for two" / "two of us" / "just the two of us"
  if (/\b(?:just\s+)?(?:the\s+)?two\s+of\s+us\b/i.test(lower)) {
    results.push({ raw: 'two of us', number: 2, range_low: null, range_high: null })
  }
  if (/\bdinner\s+for\s+two\b/i.test(lower)) {
    results.push({ raw: 'dinner for two', number: 2, range_low: null, range_high: null })
  }

  // "for my wife/husband/partner/family"
  if (/\bfor\s+(?:my\s+)?(?:wife|husband|partner)\b/i.test(lower) && results.length === 0) {
    results.push({ raw: 'for partner (implied 2)', number: 2, range_low: null, range_high: null })
  }

  // "N-M guests" range
  const range = /\b(\d+)\s*[-–to]+\s*(\d+)\s*(?:guests?|people|persons?)\b/gi
  while ((match = range.exec(lower)) !== null) {
    const low = parseInt(match[1])
    const high = parseInt(match[2])
    results.push({ raw: match[0], number: null, range_low: low, range_high: high })
  }

  // "dinner for word-number"
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    const wordRegex = new RegExp(`\\b(?:dinner|party)\\s+for\\s+${word}\\b`, 'i')
    if (wordRegex.test(lower)) {
      results.push({ raw: `dinner for ${word}`, number: num, range_low: null, range_high: null })
    }
  }

  return results
}

// ─── Budget Mentions ────────────────────────────────────────────────────

export function extractBudgetMentions(text: string): BudgetMention[] {
  const results: BudgetMention[] = []

  // "$1,200" / "$750" / "$2500"
  const dollarRegex = /\$\s?([\d,]+(?:\.\d{1,2})?)\s*(?:\/\s*(?:person|pp|head|guest))?\b/gi
  let match
  while ((match = dollarRegex.exec(text)) !== null) {
    const raw = match[0]
    const amount = parseFloat(match[1].replace(/,/g, ''))
    const perPerson = /\/\s*(?:person|pp|head|guest)/i.test(raw)
    if (!isNaN(amount) && amount > 0) {
      results.push({
        raw,
        amount_cents: Math.round(amount * 100),
        per_person: perPerson,
      })
    }
  }

  // "budget of 1200" / "around 800" (no dollar sign, but budget context)
  const budgetContext =
    /\b(?:budget|price|cost|rate|charge)\s+(?:of\s+|is\s+|around\s+|about\s+)?\$?([\d,]+)\b/gi
  while ((match = budgetContext.exec(text)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''))
    if (!isNaN(amount) && amount >= 50) {
      // Only if not already captured by dollar regex
      const alreadyCaptured = results.some(
        (r) => Math.abs((r.amount_cents || 0) - amount * 100) < 100
      )
      if (!alreadyCaptured) {
        results.push({
          raw: match[0],
          amount_cents: Math.round(amount * 100),
          per_person: false,
        })
      }
    }
  }

  // "$100-150/person" range
  const rangeRegex =
    /\$\s?([\d,]+)\s*[-–to]+\s*\$?\s*([\d,]+)\s*(?:\/\s*(?:person|pp|head|guest))?\b/gi
  while ((match = rangeRegex.exec(text)) !== null) {
    const low = parseFloat(match[1].replace(/,/g, ''))
    const high = parseFloat(match[2].replace(/,/g, ''))
    const perPerson = /\/\s*(?:person|pp|head|guest)/i.test(match[0])
    if (!isNaN(low) && !isNaN(high)) {
      // Use midpoint
      const mid = (low + high) / 2
      results.push({
        raw: match[0],
        amount_cents: Math.round(mid * 100),
        per_person: perPerson,
      })
    }
  }

  return results
}

// ─── Dietary Mentions ───────────────────────────────────────────────────

const DIETARY_PATTERNS: [RegExp, string][] = [
  [/\bgluten[- ]?free\b/i, 'gluten-free'],
  [/\bceliac\b/i, 'celiac'],
  [/\bvegan\b/i, 'vegan'],
  [/\bvegetarian\b/i, 'vegetarian'],
  [/\bdairy[- ]?free\b/i, 'dairy-free'],
  [/\blactose[- ]?(?:free|intolerant)\b/i, 'lactose-intolerant'],
  [/\bnut[- ]?free\b/i, 'nut-free'],
  [/\btree\s+nut\s+allerg/i, 'tree nut allergy'],
  [/\bshellfish\s+allerg/i, 'shellfish allergy'],
  [/\bfish\s+allerg/i, 'fish allergy'],
  [/\bkosher\b/i, 'kosher'],
  [/\bhalal\b/i, 'halal'],
  [/\bpescatarian\b/i, 'pescatarian'],
  [/\bketo\b/i, 'keto'],
  [/\bpaleo\b/i, 'paleo'],
  [/\bsoy[- ]?free\b/i, 'soy-free'],
  [/\begg[- ]?free\b/i, 'egg-free'],
  [/\ballerg(?:y|ies|ic)\s+to\s+(\w+)/i, 'allergy'],
  [/\bfood\s+allerg/i, 'food allergy (unspecified)'],
  [/\bdietary\s+restrict/i, 'dietary restriction (unspecified)'],
  [/\bno\s+(?:red\s+)?meat\b/i, 'no meat'],
  [/\bno\s+pork\b/i, 'no pork'],
  [/\bno\s+seafood\b/i, 'no seafood'],
]

export function extractDietaryMentions(text: string): string[] {
  const results: string[] = []
  for (const [regex, label] of DIETARY_PATTERNS) {
    const match = text.match(regex)
    if (match) {
      if (label === 'allergy' && match[1]) {
        results.push(`${match[1]} allergy`)
      } else {
        results.push(label)
      }
    }
  }
  return [...new Set(results)]
}

// ─── Cannabis Mentions ──────────────────────────────────────────────────

export function extractCannabisMentions(text: string): string[] {
  const results: string[] = []
  const lower = text.toLowerCase()

  if (/\bcannabis\b/i.test(lower)) results.push('cannabis')
  if (/\bthc\b/i.test(lower)) results.push('THC')
  if (/\binfused\b/i.test(lower) && /\b(?:meal|dinner|food|course|edible)\b/i.test(lower)) {
    results.push('infused meal')
  }
  if (/\bedible/i.test(lower)) results.push('edible')
  if (/\b(?:marijuana|420)\b/i.test(lower)) results.push('marijuana/420')

  // Try to extract specifics like "cannabis meal for 1 guest"
  const specificMatch = text.match(/cannabis\s+(?:meal|dinner|course)\s+(?:for\s+)?(\d+)/i)
  if (specificMatch) {
    results.push(`cannabis meal for ${specificMatch[1]}`)
  }

  return [...new Set(results)]
}

// ─── Occasion Keywords ──────────────────────────────────────────────────

const OCCASION_PATTERNS: [RegExp, string][] = [
  [/\bbirthday\b/i, 'birthday'],
  [/\banniversary\b/i, 'anniversary'],
  [/\bwedding\b/i, 'wedding'],
  [/\brehearsal\s+dinner\b/i, 'rehearsal dinner'],
  [/\bretirement\b/i, 'retirement'],
  [/\bgraduation\b/i, 'graduation'],
  [/\bengagement\b/i, 'engagement'],
  [/\bbaby\s*shower\b/i, 'baby shower'],
  [/\bbridal\s*shower\b/i, 'bridal shower'],
  [/\bholiday\b/i, 'holiday'],
  [/\bthanksgiving\b/i, 'thanksgiving'],
  [/\bchristmas\b/i, 'christmas'],
  [/\bnew\s*year/i, 'new years'],
  [/\bvalentine/i, 'valentines'],
  [/\b(?:4th|fourth)\s+of\s+july\b/i, '4th of july'],
  [/\bmemorial\s*day\b/i, 'memorial day'],
  [/\blabor\s*day\b/i, 'labor day'],
  [/\bteam\s*bonding\b/i, 'team bonding'],
  [/\bcorporate\b/i, 'corporate'],
  [/\bbachelorette\b/i, 'bachelorette'],
  [/\bbachelor\s*party\b/i, 'bachelor party'],
  [/\bmini[- ]?moon\b/i, 'mini-moon'],
  [/\bhoneymoon\b/i, 'honeymoon'],
  [/\bdate\s+night\b/i, 'date night'],
  [/\bdinner\s+party\b/i, 'dinner party'],
  [/\bholiday\s+party\b/i, 'holiday party'],
  [/\bfamily\s+(?:dinner|gathering|reunion)\b/i, 'family gathering'],
]

export function extractOccasionKeywords(text: string): string[] {
  const results: string[] = []
  for (const [regex, label] of OCCASION_PATTERNS) {
    if (regex.test(text)) {
      results.push(label)
    }
  }
  return [...new Set(results)]
}

// ─── Location Mentions ──────────────────────────────────────────────────

// General location patterns (not just Maine/NH - universal for any chef)
const LOCATION_PATTERNS: [RegExp, string][] = [
  // Maine
  [/\bmaine\b/i, 'Maine'],
  [/\bportland(?:,?\s*(?:me|maine))?\b/i, 'Portland, ME'],
  [/\bkennebunk(?:port)?\b/i, 'Kennebunkport, ME'],
  [/\bogunquit\b/i, 'Ogunquit, ME'],
  [/\bcamden\b/i, 'Camden, ME'],
  [/\brockport\b/i, 'Rockport, ME'],
  [/\bbar\s+harbor\b/i, 'Bar Harbor, ME'],
  [/\bacadia\b/i, 'Acadia, ME'],
  [/\bnaples(?:,?\s*(?:me|maine))?\b/i, 'Naples, ME'],
  [/\bharrison\b/i, 'Harrison, ME'],
  [/\bbridgton\b/i, 'Bridgton, ME'],
  [/\bfreeport\b/i, 'Freeport, ME'],
  [/\bkittery\b/i, 'Kittery, ME'],
  [/\byork(?:,?\s*(?:me|maine))\b/i, 'York, ME'],
  [/\bscarborough\b/i, 'Scarborough, ME'],
  [/\bcape\s+elizabeth\b/i, 'Cape Elizabeth, ME'],
  [/\bnorway(?:,?\s*(?:me|maine))\b/i, 'Norway, ME'],
  // New Hampshire
  [/\bnew\s+hampshire\b/i, 'New Hampshire'],
  [/\bportsmouth(?:,?\s*(?:nh|new\s+hampshire))?\b/i, 'Portsmouth, NH'],
  [/\bhampton\b/i, 'Hampton, NH'],
  [/\bnorth\s+conway\b/i, 'North Conway, NH'],
  [/\bconway\b/i, 'Conway, NH'],
  [/\blincoln(?:,?\s*(?:nh))?\b/i, 'Lincoln, NH'],
  [/\bloon\s+mountain\b/i, 'Loon Mountain, NH'],
  [/\bbretton\s+woods\b/i, 'Bretton Woods, NH'],
  [/\bwhite\s+mountains\b/i, 'White Mountains, NH'],
  [/\blake\s+winnipesaukee\b/i, 'Lake Winnipesaukee, NH'],
  [/\bmeredith\b/i, 'Meredith, NH'],
  [/\bwolfeboro\b/i, 'Wolfeboro, NH'],
  [/\bsunapee\b/i, 'Sunapee, NH'],
  [/\btuftonboro\b/i, 'Tuftonboro, NH'],
  // Massachusetts
  [/\bbrookline\b/i, 'Brookline, MA'],
  [/\bboston\b/i, 'Boston, MA'],
  [/\bcape\s+cod\b/i, 'Cape Cod, MA'],
  [/\bnantucket\b/i, 'Nantucket, MA'],
  [/\bmartha'?s?\s+vineyard\b/i, "Martha's Vineyard, MA"],
]

export function extractLocationMentions(text: string): string[] {
  const results: string[] = []
  for (const [regex, label] of LOCATION_PATTERNS) {
    if (regex.test(text)) {
      results.push(label)
    }
  }

  // Generic "in [City], [State]" pattern for locations not in the list
  const genericLocation = /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+)\b/g
  let match
  while ((match = genericLocation.exec(text)) !== null) {
    const loc = `${match[1]}, ${match[2]}`
    if (!results.some((r) => r.toLowerCase().includes(match![1].toLowerCase()))) {
      results.push(loc)
    }
  }

  return [...new Set(results)]
}

// ─── Referral Signals ───────────────────────────────────────────────────

export function extractReferralSignals(text: string): string[] {
  const results: string[] = []
  const lower = text.toLowerCase()

  // Airbnb/VRBO host referral
  if (
    /\b(?:airbnb|air\s*b\s*n\s*b|vrbo)\b/i.test(lower) &&
    /\b(?:host|staying|renting|rental|property|cabin|cottage|lodge|house)\b/i.test(lower)
  ) {
    results.push('airbnb_host')
  }

  // General referral
  if (/\brecommended\s+(?:by|you)/i.test(lower)) results.push('recommendation')
  if (/\breferred/i.test(lower)) results.push('referral')
  if (/\bgot\s+your\s+(?:name|number|contact|info)/i.test(lower)) results.push('contact_referral')
  if (/\bheard\s+about\s+you/i.test(lower)) results.push('word_of_mouth')
  if (/\bfound\s+you\s+(?:on|through|via)/i.test(lower)) results.push('online_discovery')
  if (/\bhost\s+(?:provided|gave|suggested)/i.test(lower)) results.push('host_referral')

  // Specific platforms
  if (/\b(?:your|the)\s+website/i.test(lower)) results.push('website')
  if (/\binstagram\b/i.test(lower)) results.push('instagram')
  if (/\bfacebook\b/i.test(lower)) results.push('facebook')
  if (/\bgoogle\b/i.test(lower) && /\bsearch|found/i.test(lower)) results.push('google_search')
  if (/\byelp\b/i.test(lower)) results.push('yelp')

  return [...new Set(results)]
}

// ─── Master Extractor ───────────────────────────────────────────────────

export function extractAllDeterministicFields(subject: string, body: string): DeterministicFields {
  // Strip quoted text to avoid extracting facts from previous messages
  const cleanBody = stripQuotedText(body)
  const fullText = `${subject}\n${cleanBody}`

  return {
    phones: extractPhones(fullText),
    emails: extractEmails(cleanBody), // Don't extract from subject (often has sender email)
    dates: extractDates(fullText),
    guest_counts: extractGuestCounts(fullText),
    budget_mentions: extractBudgetMentions(fullText),
    dietary_mentions: extractDietaryMentions(fullText),
    cannabis_mentions: extractCannabisMentions(fullText),
    occasion_keywords: extractOccasionKeywords(fullText),
    location_mentions: extractLocationMentions(fullText),
    referral_signals: extractReferralSignals(fullText),
  }
}
