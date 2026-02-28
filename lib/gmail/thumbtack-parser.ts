// Thumbtack Lead / Booking Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (Thumbtack emails follow consistent patterns),
// with aggressive matching to avoid missing leads.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── Thumbtack Email Types ──────────────────────────────────────────────

export type ThumbtackEmailType =
  | 'tt_new_lead'
  | 'tt_client_message'
  | 'tt_booking_confirmed'
  | 'tt_payment'
  | 'tt_administrative'

export interface ThumbtackParsedLead {
  clientName: string
  projectDescription: string | null
  location: string | null
  eventDate: string | null
  guestCount: number | null
  guestCountText: string | null
  budgetText: string | null
  budgetMinCents: number | null
  budgetMaxCents: number | null
  contactLink: string | null
}

export interface ThumbtackParsedBooking {
  clientName: string | null
  serviceDescription: string | null
  serviceDate: string | null
  location: string | null
  amountText: string | null
  amountCents: number | null
  contactLink: string | null
}

export interface ThumbtackParsedMessage {
  clientName: string | null
  messagePreview: string | null
  contactLink: string | null
}

export interface ThumbtackParsedPayment {
  amountText: string | null
  amountCents: number | null
  payoutDate: string | null
  clientName: string | null
  contactLink: string | null
}

export interface ThumbtackParseResult {
  emailType: ThumbtackEmailType
  lead?: ThumbtackParsedLead
  booking?: ThumbtackParsedBooking
  message?: ThumbtackParsedMessage
  payment?: ThumbtackParsedPayment
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ───────────────────────────────────────────────────

const TT_SENDER_DOMAINS = ['thumbtack.com']

const TT_KNOWN_SENDERS = ['do-not-reply@thumbtack.com', 'noreply@thumbtack.com']

/**
 * Check if an email is from Thumbtack.
 * Returns true if the sender domain or address matches known Thumbtack senders.
 */
export function isThumbtackEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (TT_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return domain ? TT_SENDER_DOMAINS.includes(domain) : false
}

// ─── Email Type Detection ───────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: ThumbtackEmailType }> = [
  // New lead / request — aggressive matching
  { pattern: /new (lead|request|opportunity|customer)/i, type: 'tt_new_lead' },
  { pattern: /interested in your services/i, type: 'tt_new_lead' },
  { pattern: /wants to hire/i, type: 'tt_new_lead' },
  { pattern: /looking for.*chef/i, type: 'tt_new_lead' },
  { pattern: /needs.*chef/i, type: 'tt_new_lead' },
  { pattern: /is looking for/i, type: 'tt_new_lead' },
  { pattern: /wants.*quote/i, type: 'tt_new_lead' },
  { pattern: /requesting.*quote/i, type: 'tt_new_lead' },
  { pattern: /new project/i, type: 'tt_new_lead' },
  { pattern: /match.*request/i, type: 'tt_new_lead' },
  { pattern: /you('re| are) a match/i, type: 'tt_new_lead' },
  { pattern: /check out this lead/i, type: 'tt_new_lead' },

  // Client messages
  { pattern: /new message from/i, type: 'tt_client_message' },
  { pattern: /sent you a message/i, type: 'tt_client_message' },
  { pattern: /replied/i, type: 'tt_client_message' },
  { pattern: /message from a customer/i, type: 'tt_client_message' },
  { pattern: /customer.*responded/i, type: 'tt_client_message' },

  // Booking confirmed
  { pattern: /booking confirmed/i, type: 'tt_booking_confirmed' },
  { pattern: /hired you/i, type: 'tt_booking_confirmed' },
  { pattern: /you've been hired/i, type: 'tt_booking_confirmed' },
  { pattern: /you'?ve been hired/i, type: 'tt_booking_confirmed' },
  { pattern: /appointment confirmed/i, type: 'tt_booking_confirmed' },
  { pattern: /job confirmed/i, type: 'tt_booking_confirmed' },
  { pattern: /booked you/i, type: 'tt_booking_confirmed' },

  // Payment
  { pattern: /payment received/i, type: 'tt_payment' },
  { pattern: /you earned/i, type: 'tt_payment' },
  { pattern: /payout/i, type: 'tt_payment' },
  { pattern: /direct deposit/i, type: 'tt_payment' },
  { pattern: /payment.*processed/i, type: 'tt_payment' },
  { pattern: /money.*sent/i, type: 'tt_payment' },
  { pattern: /payment.*deposited/i, type: 'tt_payment' },
]

/**
 * Detect the Thumbtack email type from the subject line.
 * Optionally checks body text for additional signals.
 */
export function detectThumbtackEmailType(subject: string, body?: string): ThumbtackEmailType {
  // Check subject first (most reliable)
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }

  // Fall back to body scanning if subject was generic
  if (body) {
    for (const { pattern, type } of TYPE_PATTERNS) {
      if (pattern.test(body)) return type
    }
  }

  return 'tt_administrative'
}

// ─── Field Extraction — New Lead ────────────────────────────────────────

function parseLeadEmail(
  subject: string,
  body: string
): { data: ThumbtackParsedLead; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "New request from John Smith" or "[Name] is interested..."
  let clientName = 'Unknown'
  const nameFromSubject =
    subject.match(/(?:from|request from)\s+(.+?)(?:\s*[-–—!.|]|$)/i) ||
    subject.match(/^(.+?)\s+(?:is interested|wants to hire|is looking)/i) ||
    subject.match(/^(.+?)\s+(?:needs|looking for)/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    // Try body — Thumbtack often has the name near the top
    const nameFromBody =
      body.match(/(?:Customer|Client|Name)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/m) ||
      body.match(/from\s+([A-Z][a-z]+ [A-Z][a-z]+)/m)
    if (nameFromBody) {
      clientName = nameFromBody[1].trim()
    } else {
      warnings.push('Could not extract client name from subject or body')
    }
  }

  // Project description — what they need
  const descMatch =
    body.match(/(?:Project|Service|Request|Looking for|Needs)[:\s]+(.+)/i) ||
    body.match(/(?:Type of (?:service|event|chef))[:\s]+(.+)/i) ||
    body.match(
      /(?:Details|Description)[:\s]+([\s\S]*?)(?=\n\s*\n|Location|Date|Budget|When|Where)/i
    )
  const projectDescription = descMatch?.[1]?.trim() || null

  // Location — city, state, zip
  const locationMatch =
    body.match(/(?:Location|Where|City|Area|Zip(?:\s*code)?)[:\s]+(.+)/i) ||
    body.match(/(?:in|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}(?:\s+\d{5})?)/m) ||
    body.match(/(\d{5}(?:-\d{4})?)/m) // bare zip code
  const location = locationMatch?.[1]?.trim() || null

  // Event date — when they need it
  const dateMatch =
    body.match(/(?:Date|When|Event date|Service date|Day)[:\s]+(.+)/i) ||
    body.match(/(?:on|for)\s+(\w+ \d{1,2}(?:,?\s*\d{4})?)/i) ||
    body.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\w+ \d{1,2},?\s*\d{4})/m)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Guest count — number of guests/people
  const guestMatch =
    body.match(
      /(?:Guests?|Number of (?:guests?|people|attendees)|Party size|Head count|How many)[:\s]+(.+)/i
    ) || body.match(/(\d+)\s*(?:guests?|people|attendees)/i)
  const guestCountText = guestMatch?.[1]?.trim() || null
  let guestCount: number | null = null
  if (guestCountText) {
    // Try single number
    const singleNum = guestCountText.match(/(\d+)/)
    if (singleNum) {
      guestCount = parseInt(singleNum[1], 10)
    }
    // If range like "10-20", take midpoint
    const rangeMatch = guestCountText.match(/(\d+)\s*(?:to|-|–|—)\s*(\d+)/)
    if (rangeMatch) {
      guestCount = Math.ceil((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2)
    }
  }

  // Budget — budget range or amount
  const budgetMatch =
    body.match(/(?:Budget|Price range|Estimated budget|Willing to pay|Budget range)[:\s]+(.+)/i) ||
    body.match(/\$[\d,]+(?:\s*[-–—to]+\s*\$[\d,]+)?/i)
  const budgetText = budgetMatch?.[1]?.trim() || budgetMatch?.[0]?.trim() || null
  let budgetMinCents: number | null = null
  let budgetMaxCents: number | null = null
  if (budgetText) {
    const dollarAmounts = budgetText.match(/\$?([\d,]+(?:\.\d{2})?)/g)
    if (dollarAmounts && dollarAmounts.length >= 2) {
      budgetMinCents = Math.round(parseFloat(dollarAmounts[0].replace(/[$,]/g, '')) * 100)
      budgetMaxCents = Math.round(parseFloat(dollarAmounts[1].replace(/[$,]/g, '')) * 100)
    } else if (dollarAmounts && dollarAmounts.length === 1) {
      budgetMinCents = Math.round(parseFloat(dollarAmounts[0].replace(/[$,]/g, '')) * 100)
      budgetMaxCents = budgetMinCents
    }
  }

  // Contact link — Thumbtack URL to respond
  const linkMatch =
    body.match(/href="(https?:\/\/(?:www\.)?thumbtack\.com\/[^"]+)"/i) ||
    body.match(/(https?:\/\/(?:www\.)?thumbtack\.com\/\S+)/i)
  const contactLink = linkMatch?.[1] || null

  return {
    data: {
      clientName,
      projectDescription,
      location,
      eventDate,
      guestCount,
      guestCountText,
      budgetText,
      budgetMinCents,
      budgetMaxCents,
      contactLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Booking Confirmed ───────────────────────────────

function parseBookingEmail(
  subject: string,
  body: string
): { data: ThumbtackParsedBooking; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "[Name] hired you" or from body
  let clientName: string | null = null
  const nameFromSubject =
    subject.match(/^(.+?)\s+(?:hired you|booked you)/i) ||
    subject.match(/(?:from|with)\s+(.+?)(?:\s*[-–—!.|]|$)/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    const nameFromBody =
      body.match(/(?:Customer|Client|Hired by|Booked by)[:\s]+(.+)/i) ||
      body.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:hired|booked)/i)
    clientName = nameFromBody?.[1]?.trim() || null
  }
  if (!clientName) warnings.push('Could not extract client name from booking email')

  // Service description
  const serviceMatch =
    body.match(/(?:Service|Project|Job|Type)[:\s]+(.+)/i) ||
    body.match(/(?:for|hired for)\s+(.+?)(?:\n|$)/i)
  const serviceDescription = serviceMatch?.[1]?.trim() || null

  // Service date
  const dateMatch =
    body.match(/(?:Date|When|Service date|Appointment)[:\s]+(.+)/i) ||
    body.match(/(?:on|for)\s+(\w+ \d{1,2}(?:,?\s*\d{4})?)/i)
  const serviceDate = dateMatch?.[1]?.trim() || null

  // Location
  const locationMatch = body.match(/(?:Location|Where|Address)[:\s]+(.+)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Amount
  const amountMatch =
    body.match(/(?:Amount|Price|Total|Cost|Rate)[:\s]*\$?([\d,.]+)/i) || body.match(/\$([\d,.]+)/i)
  const amountText = amountMatch?.[0]?.trim() || null
  let amountCents: number | null = null
  if (amountMatch?.[1]) {
    amountCents = Math.round(parseFloat(amountMatch[1].replace(/,/g, '')) * 100)
  }

  // Contact link
  const linkMatch =
    body.match(/href="(https?:\/\/(?:www\.)?thumbtack\.com\/[^"]+)"/i) ||
    body.match(/(https?:\/\/(?:www\.)?thumbtack\.com\/\S+)/i)
  const contactLink = linkMatch?.[1] || null

  return {
    data: {
      clientName,
      serviceDescription,
      serviceDate,
      location,
      amountText,
      amountCents,
      contactLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Client Message ──────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: ThumbtackParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "New message from John Smith"
  let clientName: string | null = null
  const nameFromSubject =
    subject.match(/(?:message from|from)\s+(.+?)(?:\s*[-–—!.|]|$)/i) ||
    subject.match(/^(.+?)\s+(?:sent you|replied)/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    const nameFromBody = body.match(/(?:from|Message from)\s+([A-Z][a-z]+ [A-Z][a-z]+)/m)
    clientName = nameFromBody?.[1]?.trim() || null
  }
  if (!clientName) warnings.push('Could not extract client name from message notification')

  // Message preview — first substantial line of the message body
  const previewMatch =
    body.match(/(?:Message|Says?|Wrote)[:\s]+"?(.+?)"?(?:\n|$)/i) ||
    body.match(/(?:Message preview)[:\s]+(.+)/i)
  const messagePreview = previewMatch?.[1]?.trim() || null

  // Contact link
  const linkMatch =
    body.match(/href="(https?:\/\/(?:www\.)?thumbtack\.com\/[^"]+)"/i) ||
    body.match(/(https?:\/\/(?:www\.)?thumbtack\.com\/\S+)/i)
  const contactLink = linkMatch?.[1] || null

  return {
    data: {
      clientName,
      messagePreview,
      contactLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Payment ─────────────────────────────────────────

function parsePaymentEmail(
  subject: string,
  body: string
): { data: ThumbtackParsedPayment; warnings: string[] } {
  const warnings: string[] = []

  // Amount from subject or body
  const amountMatch =
    subject.match(/\$([\d,.]+)/i) ||
    body.match(/(?:Amount|Earned|Payout|Payment|Total|Deposit)[:\s]*\$?([\d,.]+)/i) ||
    body.match(/\$([\d,.]+)/i)
  const rawAmount = amountMatch?.[1] || amountMatch?.[2] || null
  const amountText = rawAmount ? `$${rawAmount}` : null
  let amountCents: number | null = null
  if (rawAmount) {
    amountCents = Math.round(parseFloat(rawAmount.replace(/,/g, '')) * 100)
  }

  // Payout date
  const dateMatch =
    body.match(/(?:Payout date|Deposit date|Date|Expected by|Arriving)[:\s]+(.+)/i) ||
    body.match(/(\w+ \d{1,2},?\s*\d{4})/m)
  const payoutDate = dateMatch?.[1]?.trim() || null

  // Client name — may or may not be present on payment emails
  const clientMatch =
    body.match(/(?:Customer|Client|From|For)[:\s]+(.+)/i) ||
    body.match(/(?:for|from)\s+([A-Z][a-z]+ [A-Z][a-z]+)/m)
  const clientName = clientMatch?.[1]?.trim() || null

  // Contact link
  const linkMatch =
    body.match(/href="(https?:\/\/(?:www\.)?thumbtack\.com\/[^"]+)"/i) ||
    body.match(/(https?:\/\/(?:www\.)?thumbtack\.com\/\S+)/i)
  const contactLink = linkMatch?.[1] || null

  return {
    data: {
      amountText,
      amountCents,
      payoutDate,
      clientName,
      contactLink,
    },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a Thumbtack email into structured data.
 * Call this ONLY after confirming `isThumbtackEmail(email.from.email)` is true.
 */
export function parseThumbtackEmail(email: ParsedEmail): ThumbtackParseResult {
  const emailType = detectThumbtackEmailType(email.subject, email.body)
  const result: ThumbtackParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'tt_new_lead': {
      const { data, warnings } = parseLeadEmail(email.subject, email.body)
      result.lead = data
      result.parseWarnings = warnings
      break
    }
    case 'tt_booking_confirmed': {
      const { data, warnings } = parseBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'tt_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'tt_payment': {
      const { data, warnings } = parsePaymentEmail(email.subject, email.body)
      result.payment = data
      result.parseWarnings = warnings
      break
    }
    case 'tt_administrative':
      // No structured extraction needed — just log the type
      break
  }

  return result
}
