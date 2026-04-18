// Conversation Scaffold Helpers
// Deterministic utilities that derive event/menu starter data from inquiry threads.
// These helpers avoid AI dependencies so conversion remains reliable in all environments.

const DEFAULT_SERVE_TIME = '19:00:00'

const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
}

const STATE_ABBRS = new Set(Object.values(STATE_NAME_TO_ABBR))

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeState(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  if (STATE_ABBRS.has(upper)) return upper

  const lower = trimmed.toLowerCase()
  return STATE_NAME_TO_ABBR[lower] ?? null
}

function asIsoDate(input: Date): string {
  return `${input.getFullYear()}-${String(input.getMonth() + 1).padStart(2, '0')}-${String(input.getDate()).padStart(2, '0')}`
}

function parseHourMinute(rawHour: string, rawMinute: string | undefined, meridiem?: string) {
  const hour = Number.parseInt(rawHour, 10)
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) return null
  const minute = rawMinute ? Number.parseInt(rawMinute, 10) : 0
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null

  let normalizedHour = hour
  const mer = meridiem?.toLowerCase()

  if (mer === 'pm' && normalizedHour < 12) normalizedHour += 12
  if (mer === 'am' && normalizedHour === 12) normalizedHour = 0
  if (!mer && normalizedHour <= 7) {
    // In dinner workflows "eat at 7" almost always means evening.
    normalizedHour += 12
  }

  if (normalizedHour < 0 || normalizedHour > 23) return null

  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

function parseTimeFromPhrase(text: string, phraseRegex: RegExp): string | null {
  const match = phraseRegex.exec(text)
  if (!match) return null
  return parseHourMinute(match[1], match[2], match[3])
}

function addHours(time: string, hours: number): string | null {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const h = Number.parseInt(match[1], 10)
  const m = Number.parseInt(match[2], 10)
  const s = Number.parseInt(match[3], 10)
  if ([h, m, s].some((n) => !Number.isFinite(n))) return null
  const total = (((h + hours) % 24) + 24) % 24
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseMonthDayPlaceholder(confirmedDate: string): { month: number; day: number } | null {
  const match = /^YYYY-(\d{2})-(\d{2})$/.exec(confirmedDate)
  if (!match) return null

  const month = Number.parseInt(match[1], 10)
  const day = Number.parseInt(match[2], 10)
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { month, day }
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 3 && token !== 'with' && token !== 'and')
  )
}

function scoreOption(selectionText: string, option: string): number {
  const selectionTokens = tokenize(selectionText)
  const optionTokens = tokenize(option)
  let score = 0
  for (const token of optionTokens) {
    if (selectionTokens.has(token)) score++
  }
  return score
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(trimmed)
  }
  return output
}

function extractSelectionSnippet(conversation: string): string | null {
  const normalizedConversation = conversation
    // Common mojibake from exported email bodies.
    .replace(/â/g, "'")
    .replace(/’/g, "'")
    .replace(/â|â/g, '"')
    .replace(/“|”/g, '"')

  const markers = [
    /i(?:'|[^a-z0-9]{0,8})d like to do:\s*([\s\S]{0,300}?)(?:thank you|let me know|we are|sent from my iphone|on\s+\w{3},|\n\n|$)/i,
    /we(?:'d| would)? like to do:\s*([\s\S]{0,300}?)(?:thank you|let me know|we are|sent from my iphone|on\s+\w{3},|\n\n|$)/i,
    /we(?:'d| would)? like:\s*([\s\S]{0,300}?)(?:thank you|let me know|we are|sent from my iphone|on\s+\w{3},|\n\n|$)/i,
  ]

  for (const marker of markers) {
    const match = marker.exec(normalizedConversation)
    if (match?.[1]) return normalizeWhitespace(match[1])
  }

  return null
}

function extractCourseOptions(conversation: string): string[] {
  const options: string[] = []
  const courseBlockRegex = /Course\s+\d+([\s\S]*?)(?=Course\s+\d+|On\s+\w{3},|$)/gi
  let blockMatch: RegExpExecArray | null = null

  while ((blockMatch = courseBlockRegex.exec(conversation)) !== null) {
    const block = blockMatch[1]
    if (!block) continue

    const optionRegex = /([A-Z][A-Za-z0-9&'’\- ]{3,90}?)(?=\s+with\b|\s+filled with\b|$)/g
    let optionMatch: RegExpExecArray | null = null
    while ((optionMatch = optionRegex.exec(block)) !== null) {
      const candidate = normalizeWhitespace(optionMatch[1])
      if (candidate.length < 4) continue
      if (/^course\s+\d+$/i.test(candidate)) continue
      options.push(candidate)
    }
  }

  return unique(options)
}

export function resolveInquiryDateForEvent(
  confirmedDate: string | null | undefined,
  firstContactAt?: string | null
): string | null {
  if (!confirmedDate) return null

  // Date already includes a concrete year/time.
  const directDate = new Date(confirmedDate)
  if (!Number.isNaN(directDate.getTime()) && !confirmedDate.startsWith('YYYY-')) {
    return asIsoDate(directDate)
  }

  const placeholder = parseMonthDayPlaceholder(confirmedDate)
  if (!placeholder) return null

  const anchor = firstContactAt ? new Date(firstContactAt) : new Date()
  if (Number.isNaN(anchor.getTime())) return null

  const anchorYear = anchor.getUTCFullYear()
  const anchorMonth = anchor.getUTCMonth() + 1
  const anchorDay = anchor.getUTCDate()

  let year = anchorYear
  if (
    placeholder.month < anchorMonth ||
    (placeholder.month === anchorMonth && placeholder.day < anchorDay - 7)
  ) {
    year += 1
  }

  const resolved = new Date(Date.UTC(year, placeholder.month - 1, placeholder.day))
  if (Number.isNaN(resolved.getTime())) return null
  return asIsoDate(resolved)
}

export function inferEventTimesFromConversation(conversationText: string): {
  serveTime: string
  arrivalTime: string | null
} {
  const conversation = normalizeWhitespace(conversationText)

  const explicitServe =
    parseTimeFromPhrase(
      conversation,
      /\b(?:eat|dinner)\s+(?:around|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
    ) ??
    parseTimeFromPhrase(
      conversation,
      /\bserve(?:\s+time)?\s+(?:around|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
    )

  const explicitArrival = parseTimeFromPhrase(
    conversation,
    /\b(?:see you|arrive|arrival)\s+(?:around|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  )

  let serveTime = explicitServe ?? DEFAULT_SERVE_TIME
  let arrivalTime = explicitArrival

  if (!arrivalTime && /\barrive\s+2\s+hours?\s+prior\b/i.test(conversation)) {
    arrivalTime = addHours(serveTime, -2)
  }

  return { serveTime, arrivalTime }
}

export function parseCityStateFromConversation(
  confirmedLocation: string | null | undefined,
  conversationText: string
): { city: string | null; state: string | null } {
  if (confirmedLocation) {
    const direct = /^([^,]+),\s*([A-Za-z. ]+)$/.exec(confirmedLocation.trim())
    if (direct) {
      const state = normalizeState(direct[2])
      if (state) {
        return { city: direct[1].trim(), state }
      }
    }
  }

  const conversation = conversationText.replace(/\s+/g, ' ')
  const cityStateRegex =
    /\b([A-Z][A-Za-z'-]{1,30}(?:\s+[A-Z][A-Za-z'-]{1,30}){0,2}),\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|Maine|New Hampshire|Massachusetts)\b/g
  const match = cityStateRegex.exec(conversation)
  if (match) {
    return { city: match[1].trim(), state: normalizeState(match[2]) }
  }

  return { city: null, state: normalizeState(confirmedLocation ?? null) }
}

/**
 * Extract US zip code from freeform address text.
 * Matches 5-digit or ZIP+4 format (e.g. "01830" or "01830-1234").
 */
export function parseZipFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  const match = /\b(\d{5}(?:-\d{4})?)\b/.exec(address.trim())
  return match ? match[1] : null
}

export function extractSelectedDishNamesFromConversation(conversationText: string): string[] {
  const conversation = normalizeWhitespace(conversationText)
  const selectionSnippet = extractSelectionSnippet(conversation)
  const courseOptions = extractCourseOptions(conversation)

  const patternSelections: Array<{ regex: RegExp; dish: string }> = [
    { regex: /\bpork dumplings?\b/i, dish: 'Pork Dumplings' },
    { regex: /\bfried pickles?\b/i, dish: 'Fried Pickles' },
    { regex: /\brib[\s-]?eye\b/i, dish: 'Ribeye and Lobster' },
    { regex: /\blobster\b/i, dish: 'Ribeye and Lobster' },
    { regex: /\bmousse\b/i, dish: 'Chocolate Mousse' },
    { regex: /\bcheesecake\b/i, dish: 'Basque Cheesecake' },
    { regex: /\blava cake\b/i, dish: 'Chocolate Lava Cake' },
  ]

  const selected: string[] = []
  if (selectionSnippet) {
    for (const item of patternSelections) {
      if (item.regex.test(selectionSnippet)) selected.push(item.dish)
    }
  }

  if (selectionSnippet && courseOptions.length > 0) {
    const scored = courseOptions
      .map((option) => ({ option, score: scoreOption(selectionSnippet, option) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.option.length - b.option.length)
      .map((x) => x.option)

    for (const option of scored.slice(0, 4)) {
      selected.push(option)
    }
  }

  const uniqueSelected = unique(selected)
  if (uniqueSelected.length > 0) return uniqueSelected.slice(0, 5)

  if (courseOptions.length > 0) return courseOptions.slice(0, 4)

  return []
}

export function buildAutoMenuCourseNamesFromConversation(conversationText: string): string[] {
  const extracted = extractSelectedDishNamesFromConversation(conversationText)
  if (extracted.length >= 3) return extracted.slice(0, 5)

  const padded = [...extracted]
  const defaults = ['Seasonal Starter', "Chef's Main", 'Signature Dessert']

  for (const fallback of defaults) {
    if (padded.length >= 3) break
    if (!padded.some((x) => x.toLowerCase() === fallback.toLowerCase())) {
      padded.push(fallback)
    }
  }

  return padded.slice(0, 5)
}
