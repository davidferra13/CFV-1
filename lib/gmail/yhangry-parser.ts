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
  return domain ? YHANGRY_SENDER_DOMAINS.includes(domain) : false
}

// ─── Email Type Detection ────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: YhangryEmailType }> = [
  { pattern: /new booking request/i, type: 'yhangry_new_inquiry' },
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

  // Location from subject: "...drive from you in {Location}"
  const subjectLocationMatch = subject.match(/\bin\s+(.+?)$/i)
  // Location from body: "private event in {Location}"
  const bodyLocationMatch = body.match(
    /(?:private event|event|dinner|lunch|party)\s+in\s+(.+?)[\.\n,]/i
  )
  const location = subjectLocationMatch?.[1]?.trim() || bodyLocationMatch?.[1]?.trim() || null
  if (!location) warnings.push('Could not extract location')

  // Date from body: "available on {Date} for"
  const dateMatch = body.match(
    /available\s+on\s+(\w+day,?\s+\w+\s+\d{1,2},?\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2})/i
  )
  let eventDate: string | null = null
  if (dateMatch?.[1]) {
    try {
      const parsed = new Date(dateMatch[1])
      if (!isNaN(parsed.getTime())) {
        eventDate = parsed.toISOString().split('T')[0]
      }
    } catch {
      // Leave null
    }
  }
  if (!eventDate) warnings.push('Could not extract event date')

  // Event type from body — "a private event", "a dinner party", etc.
  const eventTypeMatch = body.match(
    /(?:for\s+)?(?:a\s+)?(private event|dinner party|dinner|lunch|brunch|party|corporate event|wedding)\s/i
  )
  const eventType = eventTypeMatch?.[1]?.trim() || 'private event'

  // Yhangry quote URL: "https://yhangry.com/booking/account/chef/quotes/{ID}"
  const quoteUrlMatch = body.match(/(https?:\/\/yhangry\.com\/booking\/[^\s<>"]+)/i)
  const quoteUrl = quoteUrlMatch?.[1]?.trim() || null

  // Extract quote ID from URL
  const quoteIdMatch = quoteUrl?.match(/quotes\/(\d+)/)
  const quoteId = quoteIdMatch?.[1] || null
  if (!quoteId) warnings.push('Could not extract quote ID from URL')

  // Guest count: "for X guests" or "X people"
  const guestMatch = body.match(/(?:for\s+)?(\d+)\s+(?:guests?|people|persons?|pax)/i)
  const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : null

  return {
    data: {
      clientName: null, // Yhangry doesn't reveal client name in initial email
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

// ─── Main Parser ────────────────────────────────────────────────────────

/**
 * Parse a Yhangry email into structured data.
 * Call this ONLY after confirming `isYhangryEmail(email.from.email)` is true.
 */
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
