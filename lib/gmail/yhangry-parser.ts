// Yhangry Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates (Yhangry emails are consistently formatted).
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.
//
// Based on actual Yhangry email format observed:
//   Subject: "New booking request - short drive from you in {Location}"
//   Body: "Hi {ChefName}, Just checking whether you're available on {Date} for
//          a private event in {Location}. ... https://yhangry.com/booking/account/chef/quotes/{ID}"

import type { ParsedEmail } from './types'

// ─── Yhangry Email Types ────────────────────────────────────────────────

export type YhangryEmailType =
  | 'yhangry_new_inquiry'
  | 'yhangry_booking_confirmed'
  | 'yhangry_client_message'
  | 'yhangry_administrative'

export interface YhangryParsedInquiry {
  clientName: string | null
  location: string | null
  eventDate: string | null
  eventType: string | null
  quoteUrl: string | null
  quoteId: string | null
  guestCount: number | null
}

export interface YhangryParsedBooking {
  quoteId: string | null
  quoteUrl: string | null
  amountCents: number | null
  clientName: string | null
}

export interface YhangryParsedMessage {
  quoteId: string | null
  quoteUrl: string | null
}

export interface YhangryParseResult {
  emailType: YhangryEmailType
  inquiry?: YhangryParsedInquiry
  booking?: YhangryParsedBooking
  message?: YhangryParsedMessage
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ────────────────────────────────────────────────────

const YHANGRY_SENDER_DOMAINS = ['yhangry.com']

/**
 * Check if an email is from Yhangry.
 * Returns true if the sender domain matches known Yhangry senders.
 */
export function isYhangryEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  const domain = lower.split('@')[1]
  if (!domain) return false
  return YHANGRY_SENDER_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  )
}

// ─── Email Type Detection ────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: YhangryEmailType }> = [
  { pattern: /new booking request/i, type: 'yhangry_new_inquiry' },
  { pattern: /booking request for\b/i, type: 'yhangry_new_inquiry' },
  { pattern: /chef needed\b/i, type: 'yhangry_new_inquiry' },
  { pattern: /private chef request in\b/i, type: 'yhangry_new_inquiry' },
  {
    pattern: /you('ve| have) (got |received )?a new (request|enquiry|booking request)/i,
    type: 'yhangry_new_inquiry',
  },
  { pattern: /checking whether you'?re available/i, type: 'yhangry_new_inquiry' },
  { pattern: /booking confirmed/i, type: 'yhangry_booking_confirmed' },
  { pattern: /payment (has been |)confirmed/i, type: 'yhangry_booking_confirmed' },
  { pattern: /you have a (new )?message/i, type: 'yhangry_client_message' },
  { pattern: /client (has )?(sent|left) (you )?a message/i, type: 'yhangry_client_message' },
]

/**
 * Detect the Yhangry email type from subject + body text.
 */
export function detectYhangryEmailType(subject: string, body: string): YhangryEmailType {
  // Check subject first
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }
  // Check body as fallback
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(body.slice(0, 500))) return type
  }
  return 'yhangry_administrative'
}

// ─── Field Extraction — New Inquiry ──────────────────────────────────────

function parseInquiryEmail(
  subject: string,
  body: string
): { data: YhangryParsedInquiry; warnings: string[] } {
  const warnings: string[] = []
  const normalizeDateToken = (value: string) =>
    value
      .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  const normalizeLocation = (value: string) =>
    value
      .replace(/\(\s*\d+\s*guests?\s*\)\s*$/i, '')
      .replace(/\(ca\.[^)]+\)\s*$/i, '')
      .replace(/[.,\s]+$/g, '')
      .trim()
  // Location from subject: "...drive from you in {Location}" and similar.
  const subjectLocationMatch = subject.match(/\bin\s+(.+?)$/i)
  // Location from body: "private event in {Location}"
  const bodyLocationMatch = body.match(
    /(?:private event|event|dinner|lunch|party)\s+in\s+(.+?)[\.\n,]/i
  )
  // Location from body label: "Location: {City}"
  const bodyLocationLabelMatch = body.match(/location:\s*([^\n\r]+)/i)
  const locationRaw =
    subjectLocationMatch?.[1] || bodyLocationLabelMatch?.[1] || bodyLocationMatch?.[1] || null
  const location = locationRaw ? normalizeLocation(locationRaw) : null
  if (!location) warnings.push('Could not extract location')
  // Date from body: "available on {Date} for"
  const dateMatchAvailable = body.match(
    /available\s+on\s+(\w+day,?\s+\w+\s+\d{1,2},?\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2})/i
  )
  // Date from body label: "Event date: Nov 5, 2025"
  const dateMatchLabel = body.match(
    /event\s+date:\s*([a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i
  )
  // Date from body sentence: "event on Monday, December 22, 2025"
  const dateMatchEventOn = body.match(
    /event\s+on\s+([a-z]+day,\s+[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i
  )
  // Subject fallback: "Booking request for Nov 16, 2025 in ..."
  const subjectDateMatchBooking = subject.match(/booking request for\s+(.+?)\s+in\s+/i)
  // Subject fallback: "Chef Needed - Dec 22nd Birthday in ..."
  const subjectDateMatchChefNeeded = subject.match(
    /chef needed\s+[-\u2013\u2014]\s*([a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i
  )
  let eventDate: string | null = null
  const dateCandidate =
    dateMatchAvailable?.[1] ||
    dateMatchLabel?.[1] ||
    dateMatchEventOn?.[1] ||
    subjectDateMatchBooking?.[1] ||
    subjectDateMatchChefNeeded?.[1] ||
    null
  if (dateCandidate) {
    try {
      const parsed = new Date(normalizeDateToken(dateCandidate))
      if (!isNaN(parsed.getTime())) {
        eventDate = parsed.toISOString().split('T')[0]
      }
    } catch {
      // Leave null
    }
  }
  if (!eventDate) warnings.push('Could not extract event date')
  // Event type from body.
  const eventTypeMatch = body.match(
    /(?:for\s+)?(?:a\s+)?(private event|dinner party|dinner|lunch|brunch|party|corporate event|wedding)\s/i
  )
  // Body fallback for newer Yhangry style: "3 course meal | Birthday"
  const bodyPipeEventTypeMatch = body.match(
    /\|\s*(new year's eve|get together|birthday|anniversary|wedding|corporate event|hen party|bachelor(?:ette)? party|dinner party|dinner|lunch|brunch|party)\b/i
  )
  // Body fallback: "birthday booking request"
  const bodyBookingRequestTypeMatch = body.match(
    /\b(birthday|anniversary|wedding|corporate event|hen party|bachelor(?:ette)? party)\s+booking request\b/i
  )
  // Subject fallback: "Chef Needed - Dec 22nd Birthday in ..."
  const subjectEventTypeMatch = subject.match(
    /\b(new year's eve|get together|birthday|anniversary|wedding|corporate event|hen party|bachelor(?:ette)? party|dinner party|dinner|lunch|brunch)\b/i
  )
  const eventType =
    eventTypeMatch?.[1]?.trim() ||
    bodyPipeEventTypeMatch?.[1]?.trim() ||
    bodyBookingRequestTypeMatch?.[1]?.trim() ||
    subjectEventTypeMatch?.[1]?.trim() ||
    'private event'
  // Yhangry quote URL: "https://yhangry.com/booking/account/chef/quotes/{ID}"
  const quoteUrlMatch = body.match(/(https?:\/\/yhangry\.com\/booking\/[^\s<>"]+)/i)
  const quoteUrl = quoteUrlMatch?.[1]?.trim() || null
  // Extract quote ID from URL
  const quoteIdMatch = quoteUrl?.match(/quotes\/(\d+)/)
  const quoteId = quoteIdMatch?.[1] || null
  if (!quoteId) warnings.push('Could not extract quote ID from URL')
  // Guest count: "for X guests" or "X people"
  const guestMatch = body.match(/(?:for\s+)?(\d+)\s+(?:guests?|people|persons?|pax)/i)
  // Body fallback: "Number of people: 6 adults"
  const guestPeopleLabelMatch = body.match(/number\s+of\s+people:\s*(\d+)/i)
  // Body fallback: "Guests: 9 adults"
  const guestLabelMatch = body.match(/guests?\s*:\s*(\d+)/i)
  // Subject fallback: "(8 Guests)"
  const subjectGuestMatch = subject.match(/\((\d+)\s+guests?\)/i)
  const guestCount = guestMatch
    ? parseInt(guestMatch[1], 10)
    : guestPeopleLabelMatch
      ? parseInt(guestPeopleLabelMatch[1], 10)
      : guestLabelMatch
        ? parseInt(guestLabelMatch[1], 10)
        : subjectGuestMatch
          ? parseInt(subjectGuestMatch[1], 10)
          : null
  // Optional client name from call guidance snippet.
  const clientNameFromBody = body.match(/"?hi\s+([a-z][a-z '\-]+),\s*yhangry asked me to call you/i)
  const clientName = clientNameFromBody?.[1]?.trim() || null
  return {
    data: {
      clientName,
      location,
      eventDate,
      eventType,
      quoteUrl,
      quoteId,
      guestCount,
    },
    warnings,
  }
}

// Main parser
export function parseYhangryEmail(email: ParsedEmail): YhangryParseResult {
  const subject = email.subject || ''
  const body = email.body || ''
  const emailType = detectYhangryEmailType(subject, body)
  const result: YhangryParseResult = {
    emailType,
    rawSubject: subject,
    rawBody: body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'yhangry_new_inquiry': {
      const { data, warnings } = parseInquiryEmail(subject, body)
      result.inquiry = data
      result.parseWarnings = warnings
      break
    }

    case 'yhangry_booking_confirmed': {
      // Extract quote URL/ID from body
      const quoteUrlMatch = body.match(/(https?:\/\/yhangry\.com\/booking\/[^\s<>"]+)/i)
      const quoteUrl = quoteUrlMatch?.[1]?.trim() || null
      const quoteIdMatch = quoteUrl?.match(/quotes\/(\d+)/)
      const quoteId = quoteIdMatch?.[1] || null

      // Amount: "£123" or "$456"
      const amountMatch = body.match(/[£$€](\d+(?:[.,]\d{2})?)/)
      let amountCents: number | null = null
      if (amountMatch?.[1]) {
        amountCents = Math.round(parseFloat(amountMatch[1].replace(',', '.')) * 100)
      }

      result.booking = {
        quoteId,
        quoteUrl,
        amountCents,
        clientName: null,
      }
      break
    }

    case 'yhangry_client_message': {
      const quoteUrlMatch = body.match(/(https?:\/\/yhangry\.com\/booking\/[^\s<>"]+)/i)
      const quoteUrl = quoteUrlMatch?.[1]?.trim() || null
      const quoteIdMatch = quoteUrl?.match(/quotes\/(\d+)/)
      const quoteId = quoteIdMatch?.[1] || null

      result.message = { quoteId, quoteUrl }
      break
    }

    case 'yhangry_administrative':
    default:
      // No specific parsing needed
      break
  }

  return result
}
