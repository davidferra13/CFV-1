// The Knot / WeddingWire / WeddingPro Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Covers all brands under The Knot Worldwide (WeddingPro):
//   @theknot.com, @weddingwire.com, @weddingpro.com, @theknotww.com
// Uses regex templates first (WeddingPro emails are consistently formatted),
// with Ollama fallback for edge cases.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── TheKnot Email Types ────────────────────────────────────────────────

export type TheKnotEmailType =
  | 'knot_new_inquiry'
  | 'knot_client_message'
  | 'knot_booking_confirmed'
  | 'knot_administrative'

export interface TheKnotParsedInquiry {
  clientName: string
  weddingDate: string | null
  location: string | null
  guestCount: string | null
  guestCountNumber: number | null
  budgetText: string | null
  serviceType: string | null
  ctaLink: string | null
}

export interface TheKnotParsedMessage {
  clientName: string | null
  ctaLink: string | null
}

export interface TheKnotParsedBooking {
  clientName: string | null
  weddingDate: string | null
  serviceType: string | null
  ctaLink: string | null
}

export interface TheKnotParseResult {
  emailType: TheKnotEmailType
  inquiry?: TheKnotParsedInquiry
  message?: TheKnotParsedMessage
  booking?: TheKnotParsedBooking
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ────────────────────────────────────────────────────

const THEKNOT_SENDER_DOMAINS = ['theknot.com', 'weddingwire.com', 'weddingpro.com', 'theknotww.com']

const THEKNOT_KNOWN_SENDERS = [
  'noreply@theknot.com',
  'noreply@weddingwire.com',
  'leads@theknot.com',
  'leads@weddingwire.com',
  'noreply@weddingpro.com',
  'noreply@theknotww.com',
  'info@theknot.com',
  'info@weddingwire.com',
  'info@weddingpro.com',
]

/**
 * Check if an email is from The Knot / WeddingWire / WeddingPro.
 * Returns true if the sender domain or address matches known WeddingPro senders.
 */
export function isTheKnotEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (THEKNOT_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return domain ? THEKNOT_SENDER_DOMAINS.includes(domain) : false
}

// ─── Email Type Detection ────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: TheKnotEmailType }> = [
  // New inquiry — aggressive matching
  { pattern: /new\s+inquiry/i, type: 'knot_new_inquiry' },
  { pattern: /new\s+lead/i, type: 'knot_new_inquiry' },
  { pattern: /new\s+request/i, type: 'knot_new_inquiry' },
  { pattern: /inquiry\s+from/i, type: 'knot_new_inquiry' },
  { pattern: /is\s+interested/i, type: 'knot_new_inquiry' },
  { pattern: /wants\s+.*(quote|info|pricing)/i, type: 'knot_new_inquiry' },
  { pattern: /new\s+potential\s+client/i, type: 'knot_new_inquiry' },
  { pattern: /wedding\s*.*inquiry/i, type: 'knot_new_inquiry' },
  { pattern: /you\s+have\s+a\s+new\s+lead/i, type: 'knot_new_inquiry' },
  { pattern: /catering\s+request/i, type: 'knot_new_inquiry' },
  { pattern: /requesting\s+a\s+quote/i, type: 'knot_new_inquiry' },

  // Client message
  { pattern: /new\s+message/i, type: 'knot_client_message' },
  { pattern: /sent\s+you\s+a\s+message/i, type: 'knot_client_message' },
  { pattern: /replied\s+to/i, type: 'knot_client_message' },
  { pattern: /message\s+from/i, type: 'knot_client_message' },

  // Booking confirmed
  { pattern: /booking\s+confirmed/i, type: 'knot_booking_confirmed' },
  { pattern: /you've\s+been\s+booked/i, type: 'knot_booking_confirmed' },
  { pattern: /you\u2019ve\s+been\s+booked/i, type: 'knot_booking_confirmed' },
  { pattern: /booked\s+you/i, type: 'knot_booking_confirmed' },

  // Administrative — catch marketing, tips, reviews, newsletters
  { pattern: /weddingpro\s+insights/i, type: 'knot_administrative' },
  { pattern: /review/i, type: 'knot_administrative' },
  { pattern: /newsletter/i, type: 'knot_administrative' },
  { pattern: /\btip\b/i, type: 'knot_administrative' },
]

/**
 * Detect The Knot / WeddingPro email type from the subject line.
 * Optionally checks the body for additional signals when the subject is ambiguous.
 */
export function detectTheKnotEmailType(subject: string, body?: string): TheKnotEmailType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }

  // If subject didn't match, try body as a fallback for inquiry/message signals
  if (body) {
    if (/new\s+inquiry/i.test(body) || /is\s+interested\s+in/i.test(body)) {
      return 'knot_new_inquiry'
    }
    if (/sent\s+you\s+a\s+message/i.test(body) || /new\s+message/i.test(body)) {
      return 'knot_client_message'
    }
    if (/booking\s+confirmed/i.test(body) || /you've\s+been\s+booked/i.test(body)) {
      return 'knot_booking_confirmed'
    }
  }

  return 'knot_administrative'
}

// ─── Field Extraction — New Inquiry ──────────────────────────────────────

function parseInquiryEmail(
  subject: string,
  body: string
): { data: TheKnotParsedInquiry; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "New inquiry from Jessica & Mark" or "Jessica is interested"
  let clientName = 'Unknown'
  const nameFromSubject =
    subject.match(/inquiry\s+from\s+(.+?)(?:\s*[-–—!.|]|$)/i) ||
    subject.match(/lead\s+from\s+(.+?)(?:\s*[-–—!.|]|$)/i) ||
    subject.match(/request\s+from\s+(.+?)(?:\s*[-–—!.|]|$)/i) ||
    subject.match(/^(.+?)\s+is\s+interested/i) ||
    subject.match(/^(.+?)\s+wants/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    // Try body: "Name: Jessica & Mark" or "Couple: Jessica & Mark"
    const nameFromBody =
      body.match(/(?:Name|Couple|Client|Bride|Groom):\s*(.+)/i) ||
      body.match(/from\s+([A-Z][a-z]+(?:\s+(?:&|and)\s+[A-Z][a-z]+)?)/m)
    if (nameFromBody) {
      clientName = nameFromBody[1].trim()
    } else {
      warnings.push('Could not extract client name from subject or body')
    }
  }

  // Wedding date — multiple patterns
  const dateMatch =
    body.match(/(?:Wedding|Event|Ceremony)\s*(?:Date|Day):\s*(.+)/i) ||
    body.match(/(?:Date|When):\s*(.+)/i) ||
    body.match(/(\w+\s+\d{1,2},?\s+\d{4})/i) ||
    body.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
  const weddingDate = dateMatch?.[1]?.trim() || null

  // Location — venue or city
  const locationMatch =
    body.match(/(?:Venue|Location|City|Where):\s*(.+)/i) ||
    body.match(/(?:Reception|Ceremony)\s*(?:Venue|Location):\s*(.+)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Guest count
  const guestMatch =
    body.match(
      /(?:Guest|Guests|Guest\s*Count|Number\s*of\s*Guests?|Estimated\s*Guests?):\s*(.+)/i
    ) || body.match(/(\d+)\s*(?:guests?|people|attendees)/i)
  const guestCount = guestMatch?.[1]?.trim() || null
  let guestCountNumber: number | null = null
  if (guestCount) {
    const singleNum = guestCount.match(/(\d+)/)
    if (singleNum) {
      guestCountNumber = parseInt(singleNum[1], 10)
    }
    // Handle ranges like "100-150" or "100 to 150"
    const rangeMatch = guestCount.match(/(\d+)\s*(?:to|-|–)\s*(\d+)/)
    if (rangeMatch) {
      guestCountNumber = Math.ceil((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2)
    }
  }

  // Budget
  const budgetMatch =
    body.match(/(?:Budget|Catering\s*Budget|Estimated\s*Budget|Price\s*Range):\s*(.+)/i) ||
    body.match(/(\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?)/i)
  const budgetText = budgetMatch?.[1]?.trim() || null

  // Service type — Catering, Wedding Cake, Bar Services, etc.
  const serviceMatch =
    body.match(/(?:Service|Services?\s*(?:Type|Requested|Needed)):\s*(.+)/i) ||
    body.match(/(?:Category|Looking\s*for):\s*(.+)/i) ||
    body.match(/interested\s+in\s+(?:your\s+)?(.+?)(?:\s+services?)?(?:\.|$)/i)
  const serviceType = serviceMatch?.[1]?.trim() || null

  // CTA link — link to respond on WeddingPro
  const ctaMatch =
    body.match(/href="(https?:\/\/[^"]*(?:weddingpro|theknot|weddingwire)[^"]*)"/i) ||
    body.match(/href="(https?:\/\/[^"]*(?:respond|reply|lead|inquiry|message)[^"]*)"/i) ||
    body.match(/(https?:\/\/[^\s<>"]*(?:weddingpro|theknot|weddingwire)[^\s<>"]*)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      weddingDate,
      location,
      guestCount,
      guestCountNumber,
      budgetText,
      serviceType,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Client Message ───────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: TheKnotParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "New message from Jessica" or "Jessica sent you a message"
  let clientName: string | null = null
  const nameFromSubject =
    subject.match(/message\s+from\s+(.+?)(?:\s*[-–—!.|]|$)/i) ||
    subject.match(/^(.+?)\s+sent\s+you\s+a\s+message/i) ||
    subject.match(/^(.+?)\s+replied/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    // Try body
    const nameFromBody = body.match(/(?:message\s+from|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
    if (nameFromBody) {
      clientName = nameFromBody[1].trim()
    } else {
      warnings.push('Could not extract client name from message notification')
    }
  }

  // CTA link
  const ctaMatch =
    body.match(/href="(https?:\/\/[^"]*(?:weddingpro|theknot|weddingwire)[^"]*)"/i) ||
    body.match(/href="(https?:\/\/[^"]*(?:message|respond|reply)[^"]*)"/i) ||
    body.match(/(https?:\/\/[^\s<>"]*(?:weddingpro|theknot|weddingwire)[^\s<>"]*)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Booking Confirmed ────────────────────────────────

function parseBookingEmail(
  subject: string,
  body: string
): { data: TheKnotParsedBooking; warnings: string[] } {
  const warnings: string[] = []

  // Client name
  let clientName: string | null = null
  const nameFromSubject = subject.match(/booked\s+(?:by\s+)?(.+?)(?:\s*[-–—!.|]|$)/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    const nameFromBody =
      body.match(/(?:Client|Couple|Name|Booked\s*by):\s*(.+)/i) ||
      body.match(/(?:from|by)\s+([A-Z][a-z]+(?:\s+(?:&|and)\s+[A-Z][a-z]+)?)/m)
    if (nameFromBody) {
      clientName = nameFromBody[1].trim()
    } else {
      warnings.push('Could not extract client name from booking confirmation')
    }
  }

  // Wedding date
  const dateMatch =
    body.match(/(?:Wedding|Event|Ceremony)\s*(?:Date|Day):\s*(.+)/i) ||
    body.match(/(?:Date|When):\s*(.+)/i) ||
    body.match(/(\w+\s+\d{1,2},?\s+\d{4})/i)
  const weddingDate = dateMatch?.[1]?.trim() || null

  // Service type
  const serviceMatch = body.match(/(?:Service|Services?\s*(?:Type|Booked)):\s*(.+)/i)
  const serviceType = serviceMatch?.[1]?.trim() || null

  // CTA link
  const ctaMatch =
    body.match(/href="(https?:\/\/[^"]*(?:weddingpro|theknot|weddingwire)[^"]*)"/i) ||
    body.match(/(https?:\/\/[^\s<>"]*(?:weddingpro|theknot|weddingwire)[^\s<>"]*)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      weddingDate,
      serviceType,
      ctaLink,
    },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a The Knot / WeddingWire / WeddingPro email into structured data.
 * Call this ONLY after confirming `isTheKnotEmail(email.from.email)` is true.
 */
export function parseTheKnotEmail(email: ParsedEmail): TheKnotParseResult {
  const emailType = detectTheKnotEmailType(email.subject, email.body)
  const result: TheKnotParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'knot_new_inquiry': {
      const { data, warnings } = parseInquiryEmail(email.subject, email.body)
      result.inquiry = data
      result.parseWarnings = warnings
      break
    }
    case 'knot_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'knot_booking_confirmed': {
      const { data, warnings } = parseBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'knot_administrative':
      // No structured extraction needed — just log the type
      break
  }

  return result
}
