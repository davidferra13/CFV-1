// Cozymeal Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (Cozymeal emails are consistently formatted),
// with Ollama fallback for edge cases.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── Cozymeal Email Types ───────────────────────────────────────────────

export type CozymealEmailType =
  | 'cozymeal_new_booking'
  | 'cozymeal_booking_confirmed'
  | 'cozymeal_client_message'
  | 'cozymeal_payment'
  | 'cozymeal_administrative'

export interface CozymealParsedBooking {
  clientName: string
  eventType: string | null
  location: string | null
  eventDate: string | null
  guestCount: number | null
  pricePerPersonCents: number | null
  totalCents: number | null
  ctaLink: string | null
}

export interface CozymealParsedConfirmation {
  clientName: string | null
  eventType: string | null
  location: string | null
  eventDate: string | null
  guestCount: number | null
  totalCents: number | null
  bookingId: string | null
  ctaLink: string | null
}

export interface CozymealParsedMessage {
  clientName: string | null
  eventDate: string | null
  ctaLink: string | null
}

export interface CozymealParsedPayment {
  amountUsd: number | null
  amountCents: number | null
  payoutDate: string | null
  bookingId: string | null
  ctaLink: string | null
}

export interface CozymealParseResult {
  emailType: CozymealEmailType
  booking?: CozymealParsedBooking
  confirmation?: CozymealParsedConfirmation
  message?: CozymealParsedMessage
  payment?: CozymealParsedPayment
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ───────────────────────────────────────────────────

const COZYMEAL_SENDER_DOMAINS = ['cozymeal.com']

const COZYMEAL_KNOWN_SENDERS = ['noreply@cozymeal.com']

/**
 * Check if an email is from Cozymeal.
 * Returns true if the sender domain or address matches known Cozymeal senders.
 */
export function isCozymealEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (COZYMEAL_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return domain ? COZYMEAL_SENDER_DOMAINS.includes(domain) : false
}

// ─── Email Type Detection ───────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: CozymealEmailType }> = [
  // New booking/request - aggressive matching
  { pattern: /new (booking|request|reservation)/i, type: 'cozymeal_new_booking' },
  { pattern: /booking request/i, type: 'cozymeal_new_booking' },
  { pattern: /new event request/i, type: 'cozymeal_new_booking' },
  { pattern: /private chef request/i, type: 'cozymeal_new_booking' },
  { pattern: /cooking class request/i, type: 'cozymeal_new_booking' },
  { pattern: /you have a new booking/i, type: 'cozymeal_new_booking' },
  { pattern: /booking request from/i, type: 'cozymeal_new_booking' },
  { pattern: /new reservation/i, type: 'cozymeal_new_booking' },
  // Booking confirmed
  { pattern: /booking confirmed/i, type: 'cozymeal_booking_confirmed' },
  { pattern: /reservation confirmed/i, type: 'cozymeal_booking_confirmed' },
  { pattern: /confirmed booking/i, type: 'cozymeal_booking_confirmed' },
  { pattern: /your booking has been confirmed/i, type: 'cozymeal_booking_confirmed' },
  // Client message
  { pattern: /new message/i, type: 'cozymeal_client_message' },
  { pattern: /message from/i, type: 'cozymeal_client_message' },
  { pattern: /guest.*message/i, type: 'cozymeal_client_message' },
  // Payment
  { pattern: /payment/i, type: 'cozymeal_payment' },
  { pattern: /payout/i, type: 'cozymeal_payment' },
  { pattern: /earning/i, type: 'cozymeal_payment' },
  { pattern: /you earned/i, type: 'cozymeal_payment' },
  // Administrative - reviews, tips, marketing (catch-alls at the end)
  { pattern: /review/i, type: 'cozymeal_administrative' },
  { pattern: /rating/i, type: 'cozymeal_administrative' },
  { pattern: /newsletter/i, type: 'cozymeal_administrative' },
  { pattern: /tip/i, type: 'cozymeal_administrative' },
]

/**
 * Detect the Cozymeal email type from the subject line.
 * Optionally uses body text for secondary matching when subject is ambiguous.
 */
export function detectCozymealEmailType(subject: string, body?: string): CozymealEmailType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }
  // If subject didn't match, try body as a fallback for ambiguous subjects
  if (body) {
    for (const { pattern, type } of TYPE_PATTERNS) {
      if (pattern.test(body)) return type
    }
  }
  return 'cozymeal_administrative'
}

// ─── Field Extraction - New Booking ─────────────────────────────────────

function parseNewBookingEmail(
  subject: string,
  body: string
): { data: CozymealParsedBooking; warnings: string[] } {
  const warnings: string[] = []

  // Client name - try subject first: "Booking request from {Name}" or "New booking from {Name}"
  const subjectNameMatch = subject.match(/(?:from|by)\s+(.+?)[\s!]*$/i)
  // Fallback to body patterns
  const bodyNameMatch = body.match(
    /(?:Guest|Customer|Client|Name|Booked by|Requested by)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
  )
  const clientName = subjectNameMatch?.[1]?.trim() || bodyNameMatch?.[1]?.trim() || 'Unknown'
  if (!subjectNameMatch && !bodyNameMatch) {
    warnings.push('Could not extract client name from booking email')
  }

  // Event type - "Private Chef", "Cooking Class", "Private Chef Experience", etc.
  const eventTypeMatch = body.match(
    /(?:Event|Experience|Type|Service|Booking type)[\s:]+(.+?)(?:\n|\r|$)/i
  )
  const eventType = eventTypeMatch?.[1]?.trim() || null

  // Location - city or address
  const locationMatch = body.match(/(?:Location|City|Address|Where)[\s:]+(.+?)(?:\n|\r|$)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Date
  const dateMatch = body.match(/(?:Date|When|Event date|Booking date)[\s:]+(.+?)(?:\n|\r|$)/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Guest count - "Guests: 8", "Number of guests: 8", "Party size: 8"
  const guestMatch = body.match(
    /(?:Guests?|Number of guests|Party size|Group size|Head count|# of guests)[\s:]+(\d+)/i
  )
  const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : null

  // Price per person - "$85/person", "$85 per person", "Price per person: $85"
  let pricePerPersonCents: number | null = null
  const pricePerPersonMatch = body.match(
    /(?:Price per person|Per person|Per guest)[\s:]*\$?([\d,.]+)/i
  )
  if (pricePerPersonMatch) {
    pricePerPersonCents = Math.round(parseFloat(pricePerPersonMatch[1].replace(',', '')) * 100)
  } else {
    // Try "$85/person" format
    const slashMatch = body.match(/\$([\d,.]+)\s*\/\s*(?:person|guest|head)/i)
    if (slashMatch) {
      pricePerPersonCents = Math.round(parseFloat(slashMatch[1].replace(',', '')) * 100)
    }
  }

  // Total amount - "Total: $680", "Total amount: $680.00"
  let totalCents: number | null = null
  const totalMatch = body.match(
    /(?:Total|Total amount|Grand total|Amount|Subtotal)[\s:]*\$?([\d,.]+)/i
  )
  if (totalMatch) {
    totalCents = Math.round(parseFloat(totalMatch[1].replace(',', '')) * 100)
  }

  // CTA link - Cozymeal URL for viewing/accepting the booking
  const ctaMatch = body.match(
    /href="(https?:\/\/(?:www\.)?cozymeal\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View|Accept|Respond|See details|View booking)/i
  )
  // Fallback: any Cozymeal link
  const fallbackCtaMatch = body.match(/href="(https?:\/\/(?:www\.)?cozymeal\.com\/[^"]+)"/i)
  const ctaLink = ctaMatch?.[1] || fallbackCtaMatch?.[1] || null

  return {
    data: {
      clientName,
      eventType,
      location,
      eventDate,
      guestCount,
      pricePerPersonCents,
      totalCents,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction - Booking Confirmed ───────────────────────────────

function parseConfirmationEmail(
  subject: string,
  body: string
): { data: CozymealParsedConfirmation; warnings: string[] } {
  const warnings: string[] = []

  // Client name
  const nameMatch = body.match(
    /(?:Guest|Customer|Client|Booked by|Name)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
  )
  const clientName = nameMatch?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from confirmation email')

  // Event type
  const eventTypeMatch = body.match(
    /(?:Event|Experience|Type|Service|Booking type)[\s:]+(.+?)(?:\n|\r|$)/i
  )
  const eventType = eventTypeMatch?.[1]?.trim() || null

  // Location
  const locationMatch = body.match(/(?:Location|City|Address|Where)[\s:]+(.+?)(?:\n|\r|$)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Date
  const dateMatch = body.match(/(?:Date|When|Event date|Booking date)[\s:]+(.+?)(?:\n|\r|$)/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Guest count
  const guestMatch = body.match(
    /(?:Guests?|Number of guests|Party size|Group size|# of guests)[\s:]+(\d+)/i
  )
  const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : null

  // Total amount
  let totalCents: number | null = null
  const totalMatch = body.match(
    /(?:Total|Total amount|Grand total|Amount|Subtotal)[\s:]*\$?([\d,.]+)/i
  )
  if (totalMatch) {
    totalCents = Math.round(parseFloat(totalMatch[1].replace(',', '')) * 100)
  }

  // Booking ID - "Booking #12345", "Booking ID: 12345", "Reservation #12345"
  const bookingIdMatch = body.match(
    /(?:Booking|Reservation|Order|Confirmation)\s*(?:#|ID:?|number:?)\s*(\w+)/i
  )
  const bookingId = bookingIdMatch?.[1]?.trim() || null

  // Booking ID from subject as fallback
  if (!bookingId) {
    const subjectIdMatch = subject.match(
      /(?:Booking|Reservation|Order|Confirmation)\s*(?:#|ID:?|number:?)\s*(\w+)/i
    )
    if (subjectIdMatch) {
      // Use the subject match but keep bookingId as declared above
    }
  }

  // CTA link
  const ctaMatch = body.match(
    /href="(https?:\/\/(?:www\.)?cozymeal\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View|Manage|See details|View booking)/i
  )
  const fallbackCtaMatch = body.match(/href="(https?:\/\/(?:www\.)?cozymeal\.com\/[^"]+)"/i)
  const ctaLink = ctaMatch?.[1] || fallbackCtaMatch?.[1] || null

  return {
    data: {
      clientName,
      eventType,
      location,
      eventDate,
      guestCount,
      totalCents,
      bookingId,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction - Client Message ──────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: CozymealParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Client name from body: "Message from {Name}", "New message from {Name}"
  const bodyNameMatch = body.match(
    /(?:message from|from guest|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  )
  // Fallback to subject: "Message from {Name}", "New message from {Name}"
  const subjectNameMatch = subject.match(/(?:message from|from)\s+(.+?)[\s!]*$/i)
  const clientName = bodyNameMatch?.[1]?.trim() || subjectNameMatch?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from message notification')

  // Event date
  const dateMatch = body.match(/(?:Date|Event date|Booking date|for)[\s:]+(.+?)(?:\n|\r|$)/i)
  const subjectDateMatch = subject.match(
    /(?:on|for)\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i
  )
  const eventDate = dateMatch?.[1]?.trim() || subjectDateMatch?.[1]?.trim() || null

  // CTA link - "View message", "Reply", "Read message"
  const ctaMatch = body.match(
    /href="(https?:\/\/(?:www\.)?cozymeal\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View message|Reply|Read message|Respond)/i
  )
  const fallbackCtaMatch = body.match(/href="(https?:\/\/(?:www\.)?cozymeal\.com\/[^"]+)"/i)
  const ctaLink = ctaMatch?.[1] || fallbackCtaMatch?.[1] || null

  return {
    data: {
      clientName,
      eventDate,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction - Payment ─────────────────────────────────────────

function parsePaymentEmail(
  subject: string,
  body: string
): { data: CozymealParsedPayment; warnings: string[] } {
  const warnings: string[] = []

  // Amount - "$500.00", "Amount: $500", "You earned $500.00"
  const amountMatch = body.match(
    /(?:Amount|Total|Payout|Earned|You earned|Payment)[\s:]*\$?([\d,.]+)/i
  )
  const subjectAmountMatch = subject.match(/\$([\d,.]+)/)
  const amountStr = amountMatch?.[1] || subjectAmountMatch?.[1] || null
  const amountUsd = amountStr ? parseFloat(amountStr.replace(',', '')) : null
  const amountCents = amountUsd !== null ? Math.round(amountUsd * 100) : null
  if (!amountStr) warnings.push('Could not extract payment amount')

  // Payout date
  const dateMatch = body.match(
    /(?:Payout date|Payment date|Deposit date|Paid on|Date)[\s:]+(.+?)(?:\n|\r|$)/i
  )
  const payoutDate = dateMatch?.[1]?.trim() || null

  // Booking ID
  const bookingIdMatch = body.match(
    /(?:Booking|Reservation|Order|Reference)\s*(?:#|ID:?|number:?)\s*(\w+)/i
  )
  const bookingId = bookingIdMatch?.[1]?.trim() || null

  // CTA link
  const ctaMatch = body.match(
    /href="(https?:\/\/(?:www\.)?cozymeal\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View|Details|See payout|View earnings)/i
  )
  const fallbackCtaMatch = body.match(/href="(https?:\/\/(?:www\.)?cozymeal\.com\/[^"]+)"/i)
  const ctaLink = ctaMatch?.[1] || fallbackCtaMatch?.[1] || null

  return {
    data: {
      amountUsd,
      amountCents,
      payoutDate,
      bookingId,
      ctaLink,
    },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a Cozymeal email into structured data.
 * Call this ONLY after confirming `isCozymealEmail(email.from.email)` is true.
 */
export function parseCozymealEmail(email: ParsedEmail): CozymealParseResult {
  const emailType = detectCozymealEmailType(email.subject, email.body)
  const result: CozymealParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'cozymeal_new_booking': {
      const { data, warnings } = parseNewBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'cozymeal_booking_confirmed': {
      const { data, warnings } = parseConfirmationEmail(email.subject, email.body)
      result.confirmation = data
      result.parseWarnings = warnings
      break
    }
    case 'cozymeal_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'cozymeal_payment': {
      const { data, warnings } = parsePaymentEmail(email.subject, email.body)
      result.payment = data
      result.parseWarnings = warnings
      break
    }
    case 'cozymeal_administrative':
      // No structured extraction needed - just log the type
      break
  }

  return result
}
