// GigSalad Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (GigSalad emails are consistently formatted),
// with Ollama fallback for edge cases.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// --------- GigSalad Email Types ---------------------------------------------------------------------------------------------------------------------------------------------

export type GigSaladEmailType =
  | 'gs_new_lead'
  | 'gs_client_message'
  | 'gs_booking_confirmed'
  | 'gs_quote_requested'
  | 'gs_administrative'

export interface GigSaladParsedLead {
  clientName: string
  eventType: string | null
  location: string | null
  eventDate: string | null
  guestCount: number | null
  guestCountText: string | null
  budgetText: string | null
  budgetMinCents: number | null
  budgetMaxCents: number | null
  dietaryRestrictions: string | null
  additionalDetails: string | null
  ctaLink: string | null
}

export interface GigSaladParsedMessage {
  clientName: string | null
  messagePreview: string | null
  ctaLink: string | null
}

export interface GigSaladParsedBooking {
  clientName: string | null
  eventType: string | null
  eventDate: string | null
  location: string | null
  amountText: string | null
  amountCents: number | null
  ctaLink: string | null
}

export interface GigSaladParsedQuote {
  clientName: string | null
  eventType: string | null
  eventDate: string | null
  location: string | null
  guestCount: number | null
  budgetText: string | null
  ctaLink: string | null
}

export interface GigSaladParseResult {
  emailType: GigSaladEmailType
  lead?: GigSaladParsedLead
  message?: GigSaladParsedMessage
  booking?: GigSaladParsedBooking
  quote?: GigSaladParsedQuote
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// --------- Sender Detection ---------------------------------------------------------------------------------------------------------------------------------------------------------

const GS_SENDER_DOMAINS = ['gigsalad.com']

const GS_KNOWN_SENDERS = [
  'noreply@gigsalad.com',
  'leads@gigsalad.com',
  'info@gigsalad.com',
  'support@gigsalad.com',
  'no-reply@gigsalad.com',
  'notifications@gigsalad.com',
  'bookings@gigsalad.com',
]

/**
 * Check if an email is from GigSalad.
 * Returns true if the sender domain or address matches known GigSalad senders.
 */
export function isGigSaladEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (GS_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return domain ? GS_SENDER_DOMAINS.includes(domain) : false
}

// --------- Email Type Detection ---------------------------------------------------------------------------------------------------------------------------------------------

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: GigSaladEmailType }> = [
  // New lead / gig opportunity - AGGRESSIVE matching
  { pattern: /new\s+(lead|gig|opportunity|request)/i, type: 'gs_new_lead' },
  { pattern: /looking\s+for.*(chef|caterer|cook|catering)/i, type: 'gs_new_lead' },
  { pattern: /someone.*needs/i, type: 'gs_new_lead' },
  { pattern: /booking\s+request/i, type: 'gs_new_lead' },
  { pattern: /new\s+event/i, type: 'gs_new_lead' },
  { pattern: /gig\s+opportunity/i, type: 'gs_new_lead' },
  { pattern: /you\s+have\s+a\s+new\s+lead/i, type: 'gs_new_lead' },
  { pattern: /someone\s+is\s+looking/i, type: 'gs_new_lead' },
  { pattern: /new\s+(?:catering|chef)\s+lead/i, type: 'gs_new_lead' },
  { pattern: /event\s+request/i, type: 'gs_new_lead' },
  { pattern: /lead\s+(?:alert|notification)/i, type: 'gs_new_lead' },
  { pattern: /interested\s+in\s+(?:your|a)\s+(?:service|chef)/i, type: 'gs_new_lead' },

  // Client message
  { pattern: /new\s+message/i, type: 'gs_client_message' },
  { pattern: /message\s+from/i, type: 'gs_client_message' },
  { pattern: /sent\s+(?:you\s+)?(?:a\s+)?message/i, type: 'gs_client_message' },
  { pattern: /unread\s+message/i, type: 'gs_client_message' },
  { pattern: /replied?\s+to\s+(?:your|the)/i, type: 'gs_client_message' },

  // Booking confirmed
  { pattern: /booking\s+confirmed/i, type: 'gs_booking_confirmed' },
  { pattern: /gig\s+confirmed/i, type: 'gs_booking_confirmed' },
  { pattern: /you'?ve\s+been\s+booked/i, type: 'gs_booking_confirmed' },
  { pattern: /booked\s+(?:you|for)/i, type: 'gs_booking_confirmed' },
  { pattern: /confirmed?\s+(?:gig|booking|event)/i, type: 'gs_booking_confirmed' },
  { pattern: /congratulations.*booked/i, type: 'gs_booking_confirmed' },

  // Quote requested
  { pattern: /quote\s+request/i, type: 'gs_quote_requested' },
  { pattern: /request\s+for\s+quote/i, type: 'gs_quote_requested' },
  { pattern: /quote\s+needed/i, type: 'gs_quote_requested' },
  { pattern: /send\s+(?:a\s+)?quote/i, type: 'gs_quote_requested' },
  { pattern: /requesting\s+(?:a\s+)?quote/i, type: 'gs_quote_requested' },
  { pattern: /needs?\s+(?:a\s+)?quote/i, type: 'gs_quote_requested' },

  // Administrative - catch-all patterns for non-actionable emails
  { pattern: /review/i, type: 'gs_administrative' },
  { pattern: /newsletter/i, type: 'gs_administrative' },
  { pattern: /\btip(?:s)?\b/i, type: 'gs_administrative' },
  { pattern: /account\s+(?:update|settings|security)/i, type: 'gs_administrative' },
  { pattern: /gigsalad\s+pro\b/i, type: 'gs_administrative' },
  { pattern: /marketing/i, type: 'gs_administrative' },
  { pattern: /profile\s+(?:views?|stats?|performance)/i, type: 'gs_administrative' },
]

/**
 * Detect the GigSalad email type from the subject line.
 * Optionally checks body for additional signals when subject is ambiguous.
 */
export function detectGigSaladEmailType(subject: string, body?: string): GigSaladEmailType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }

  // If subject didn't match, check body for lead/message signals
  if (body) {
    // Body-level signals for new leads
    if (/event\s+details/i.test(body) && /guest\s*count/i.test(body)) return 'gs_new_lead'
    if (/respond\s+to\s+this\s+lead/i.test(body)) return 'gs_new_lead'
    if (/send\s+(?:a\s+)?quote/i.test(body) && /event\s+(?:date|type)/i.test(body))
      return 'gs_new_lead'

    // Body-level signals for messages
    if (/wrote\s*:/i.test(body) && /reply/i.test(body)) return 'gs_client_message'

    // Body-level signals for booking
    if (/booking\s+(?:details|summary)/i.test(body) && /confirmed/i.test(body))
      return 'gs_booking_confirmed'
  }

  return 'gs_administrative'
}

// --------- Field Extraction - New Lead ------------------------------------------------------------------------------------------------------------------------

function parseLeadEmail(
  subject: string,
  body: string
): { data: GigSaladParsedLead; warnings: string[] } {
  const warnings: string[] = []

  // Client name - try multiple patterns
  // "New lead from John Smith" or "John Smith is looking for" or "Client: John Smith"
  const nameFromSubject = subject.match(
    /(?:lead|request|opportunity)\s+(?:from|by)\s+(.+?)(?:\s*[-------!|]|$)/i
  )
  const nameFromBody =
    body.match(/(?:Client|Customer|Name|From|Contact)[\s:]+([A-Z][a-z]+ [A-Z][a-z]+)/i) ||
    body.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:is looking|needs|wants|is interested)/i)
  const clientName = nameFromSubject?.[1]?.trim() || nameFromBody?.[1]?.trim() || 'Unknown'
  if (!nameFromSubject && !nameFromBody)
    warnings.push('Could not extract client name from lead email')

  // Event type - "Event type: Wedding" or "Category: Birthday Party"
  const eventTypeMatch =
    body.match(/(?:Event\s+type|Category|Service\s+type|Type\s+of\s+event)[\s:]+(.+?)(?:\n|$)/i) ||
    body.match(/(?:looking\s+for\s+(?:a\s+)?)([\w\s]+?)(?:\s+(?:chef|caterer|cook|for))/i)
  const eventType = eventTypeMatch?.[1]?.trim() || null

  // Location - "Location: Boston, MA" or "City: Boston" or "Event location: Boston"
  const locationMatch =
    body.match(/(?:Location|City|Venue|Event\s+location|Where)[\s:]+(.+?)(?:\n|$)/i) ||
    body.match(/(?:in|at)\s+([A-Z][a-z]+(?:[\s,]+[A-Z]{2})?)\s+(?:on|for)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Event date - "Event date: March 15, 2026" or "Date: 3/15/2026" or "When: Saturday, March 15"
  const dateMatch =
    body.match(/(?:Event\s+date|Date|When|Date\s+of\s+event)[\s:]+(.+?)(?:\n|$)/i) ||
    body.match(/(\w+\s+\d{1,2},?\s+\d{4})/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Guest count - "Guest count: 50" or "Number of guests: 50" or "Guests: 40-60"
  const guestMatch = body.match(
    /(?:Guest\s*count|Number\s+of\s+guests?|Guests?|Attendees?|Head\s*count|Party\s+size)[\s:]+(.+?)(?:\n|$)/i
  )
  const guestCountText = guestMatch?.[1]?.trim() || null
  let guestCount: number | null = null
  if (guestCountText) {
    // Try single number
    const singleNum = guestCountText.match(/^(\d+)/)
    if (singleNum) {
      guestCount = parseInt(singleNum[1], 10)
    } else {
      // Try range "40-60" or "40 to 60" - take midpoint
      const rangeMatch = guestCountText.match(/(\d+)\s*(?:to|-|---|---)\s*(\d+)/)
      if (rangeMatch) {
        guestCount = Math.ceil((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2)
      }
    }
  }

  // Budget - "Budget: $500-$1000" or "Budget range: $800" or "Willing to spend: $500-750"
  const budgetMatch = body.match(
    /(?:Budget|Budget\s+range|Willing\s+to\s+(?:spend|pay)|Price\s+range|Estimated\s+budget)[\s:]+(.+?)(?:\n|$)/i
  )
  const budgetText = budgetMatch?.[1]?.trim() || null
  let budgetMinCents: number | null = null
  let budgetMaxCents: number | null = null
  if (budgetText) {
    // "$500-$1000" or "$500 - $1000" or "$500 to $1000"
    const budgetRange = budgetText.match(/\$?([\d,]+)\s*(?:to|-|---|---)\s*\$?([\d,]+)/)
    if (budgetRange) {
      budgetMinCents = Math.round(parseFloat(budgetRange[1].replace(',', '')) * 100)
      budgetMaxCents = Math.round(parseFloat(budgetRange[2].replace(',', '')) * 100)
    } else {
      // Single amount "$800"
      const singleBudget = budgetText.match(/\$?([\d,]+)/)
      if (singleBudget) {
        budgetMinCents = Math.round(parseFloat(singleBudget[1].replace(',', '')) * 100)
        budgetMaxCents = budgetMinCents
      }
    }
  }

  // Dietary restrictions - "Dietary needs: Gluten free, nut allergy"
  const dietaryMatch = body.match(
    /(?:Dietary\s+(?:needs?|restrictions?|requirements?|preferences?)|Allergies?|Food\s+(?:restrictions?|allergies))[\s:]+(.+?)(?:\n|$)/i
  )
  const dietaryRestrictions = dietaryMatch?.[1]?.trim() || null

  // Additional details / notes - "Additional details:" or "Notes:" or "Message:"
  const detailsMatch = body.match(
    /(?:Additional\s+(?:details?|info(?:rmation)?|notes?)|Notes?|Message|Details|Comments?)[\s:]+(.+?)(?:\n\n|\n(?=[A-Z])|$)/is
  )
  const additionalDetails = detailsMatch?.[1]?.trim() || null

  // CTA link - GigSalad URL to respond to the lead
  const ctaMatch =
    body.match(
      /href="(https?:\/\/(?:www\.)?gigsalad\.com[^"]*)"[^>]*>(?:[^<]*?)(?:Respond|View|Reply|Send Quote|View Lead)/i
    ) || body.match(/(https?:\/\/(?:www\.)?gigsalad\.com\/[\w/._?&=-]+)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      eventType,
      location,
      eventDate,
      guestCount,
      guestCountText,
      budgetText,
      budgetMinCents,
      budgetMaxCents,
      dietaryRestrictions,
      additionalDetails,
      ctaLink,
    },
    warnings,
  }
}

// --------- Field Extraction - Client Message ------------------------------------------------------------------------------------------------------

function parseMessageEmail(
  subject: string,
  body: string
): { data: GigSaladParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Client name - "Message from John Smith" or "John Smith sent a message"
  const nameFromSubject =
    subject.match(/message\s+from\s+(.+?)(?:\s*[-------!|]|$)/i) ||
    subject.match(/(.+?)\s+sent\s+(?:you\s+)?(?:a\s+)?message/i)
  const nameFromBody = body.match(/(?:From|Sender|Client|Customer)[\s:]+([A-Z][a-z]+ [A-Z][a-z]+)/i)
  const clientName = nameFromSubject?.[1]?.trim() || nameFromBody?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from message notification')

  // Message preview - try to grab the actual message content
  const previewMatch =
    body.match(/(?:Message|Wrote|Says?)[\s:]+[""]?(.{10,200}?)[""]?(?:\n|$)/i) ||
    body.match(/[""](.{10,200}?)[""]/)
  const messagePreview = previewMatch?.[1]?.trim() || null

  // CTA link - GigSalad URL to view/reply to message
  const ctaMatch =
    body.match(
      /href="(https?:\/\/(?:www\.)?gigsalad\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View|Reply|Respond|Read)/i
    ) || body.match(/(https?:\/\/(?:www\.)?gigsalad\.com\/[\w/._?&=-]+)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      messagePreview,
      ctaLink,
    },
    warnings,
  }
}

// --------- Field Extraction - Booking Confirmed ---------------------------------------------------------------------------------------------

function parseBookingEmail(
  subject: string,
  body: string
): { data: GigSaladParsedBooking; warnings: string[] } {
  const warnings: string[] = []

  // Client name - "Booking confirmed with John Smith" or body patterns
  const nameFromSubject = subject.match(
    /(?:confirmed|booked)\s+(?:with|by|from)\s+(.+?)(?:\s*[-------!|]|$)/i
  )
  const nameFromBody = body.match(
    /(?:Client|Customer|Booked\s+by|Name)[\s:]+([A-Z][a-z]+ [A-Z][a-z]+)/i
  )
  const clientName = nameFromSubject?.[1]?.trim() || nameFromBody?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from booking confirmation')

  // Event type
  const eventTypeMatch = body.match(
    /(?:Event\s+type|Category|Service\s+type|Type)[\s:]+(.+?)(?:\n|$)/i
  )
  const eventType = eventTypeMatch?.[1]?.trim() || null

  // Event date
  const dateMatch = body.match(/(?:Event\s+date|Date|When)[\s:]+(.+?)(?:\n|$)/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Location
  const locationMatch = body.match(/(?:Location|City|Venue|Where)[\s:]+(.+?)(?:\n|$)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Amount - "$500" or "Amount: $500.00" or "Total: $750"
  const amountMatch = body.match(/(?:Amount|Total|Price|Payment|Fee)[\s:]+\$?([\d,.]+)/i)
  const amountText = amountMatch ? `$${amountMatch[1]}` : null
  const amountCents = amountMatch
    ? Math.round(parseFloat(amountMatch[1].replace(',', '')) * 100)
    : null

  // CTA link - GigSalad URL to view booking details
  const ctaMatch =
    body.match(
      /href="(https?:\/\/(?:www\.)?gigsalad\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View|Manage|Details|Booking)/i
    ) || body.match(/(https?:\/\/(?:www\.)?gigsalad\.com\/[\w/._?&=-]+)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      eventType,
      eventDate,
      location,
      amountText,
      amountCents,
      ctaLink,
    },
    warnings,
  }
}

// --------- Field Extraction - Quote Requested ---------------------------------------------------------------------------------------------------

function parseQuoteEmail(
  subject: string,
  body: string
): { data: GigSaladParsedQuote; warnings: string[] } {
  const warnings: string[] = []

  // Client name
  const nameFromSubject = subject.match(
    /(?:quote\s+(?:request|needed)\s+(?:from|by))\s+(.+?)(?:\s*[-------!|]|$)/i
  )
  const nameFromBody = body.match(
    /(?:Client|Customer|Name|From|Contact)[\s:]+([A-Z][a-z]+ [A-Z][a-z]+)/i
  )
  const clientName = nameFromSubject?.[1]?.trim() || nameFromBody?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from quote request')

  // Event type
  const eventTypeMatch = body.match(
    /(?:Event\s+type|Category|Service\s+type|Type\s+of\s+event)[\s:]+(.+?)(?:\n|$)/i
  )
  const eventType = eventTypeMatch?.[1]?.trim() || null

  // Event date
  const dateMatch = body.match(/(?:Event\s+date|Date|When)[\s:]+(.+?)(?:\n|$)/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Location
  const locationMatch = body.match(/(?:Location|City|Venue|Where)[\s:]+(.+?)(?:\n|$)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Guest count
  const guestMatch = body.match(
    /(?:Guest\s*count|Number\s+of\s+guests?|Guests?|Attendees?)[\s:]+(\d+)/i
  )
  const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : null

  // Budget
  const budgetMatch = body.match(
    /(?:Budget|Budget\s+range|Willing\s+to\s+(?:spend|pay)|Price\s+range)[\s:]+(.+?)(?:\n|$)/i
  )
  const budgetText = budgetMatch?.[1]?.trim() || null

  // CTA link
  const ctaMatch =
    body.match(
      /href="(https?:\/\/(?:www\.)?gigsalad\.com[^"]*)"[^>]*>(?:[^<]*?)(?:Send Quote|Respond|View|Reply)/i
    ) || body.match(/(https?:\/\/(?:www\.)?gigsalad\.com\/[\w/._?&=-]+)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      eventType,
      eventDate,
      location,
      guestCount,
      budgetText,
      ctaLink,
    },
    warnings,
  }
}

// --------- Main Parse Function ------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * Parse a GigSalad email into structured data.
 * Call this ONLY after confirming `isGigSaladEmail(email.from.email)` is true.
 */
export function parseGigSaladEmail(email: ParsedEmail): GigSaladParseResult {
  const emailType = detectGigSaladEmailType(email.subject, email.body)
  const result: GigSaladParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'gs_new_lead': {
      const { data, warnings } = parseLeadEmail(email.subject, email.body)
      result.lead = data
      result.parseWarnings = warnings
      break
    }
    case 'gs_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'gs_booking_confirmed': {
      const { data, warnings } = parseBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'gs_quote_requested': {
      const { data, warnings } = parseQuoteEmail(email.subject, email.body)
      result.quote = data
      result.parseWarnings = warnings
      break
    }
    case 'gs_administrative':
      // No structured extraction needed - just log the type
      break
  }

  return result
}
