// PrivateChefManager.com Lead / Inquiry Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (platform emails follow consistent patterns),
// with aggressive matching to avoid missing leads.
//
// NOTE: Parser skeleton. Regex patterns are based on common platform email
// formats. Will need tuning with real email samples from the developer.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── PrivateChefManager Email Types ─────────────────────────────────────

export type PcmEmailType =
  | 'pcm_new_lead'
  | 'pcm_client_message'
  | 'pcm_booking_confirmed'
  | 'pcm_administrative'

export interface PcmParsedLead {
  clientName: string
  location: string | null
  eventDate: string | null
  guestCount: number | null
  guestCountText: string | null
  occasion: string | null
  budgetText: string | null
  budgetMinCents: number | null
  budgetMaxCents: number | null
  dietaryRestrictions: string | null
  serviceType: string | null
  ctaLink: string | null
  identityKeys: string[]
}

export interface PcmParsedMessage {
  clientName: string | null
  messagePreview: string | null
  ctaLink: string | null
  identityKeys: string[]
}

export interface PcmParsedBooking {
  clientName: string | null
  eventDate: string | null
  location: string | null
  amountText: string | null
  amountCents: number | null
  ctaLink: string | null
  identityKeys: string[]
}

export interface PcmParseResult {
  emailType: PcmEmailType
  lead?: PcmParsedLead
  message?: PcmParsedMessage
  booking?: PcmParsedBooking
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ───────────────────────────────────────────────────

const PCM_SENDER_DOMAINS = ['privatechefmanager.com']

const PCM_KNOWN_SENDERS = [
  'noreply@privatechefmanager.com',
  'no-reply@privatechefmanager.com',
  'notifications@privatechefmanager.com',
  'info@privatechefmanager.com',
]

/**
 * Check if an email is from PrivateChefManager.
 * Returns true if the sender domain or address matches known senders.
 */
export function isPrivateChefManagerEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (PCM_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return domain ? PCM_SENDER_DOMAINS.includes(domain) : false
}

// ─── Email Type Detection ───────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: PcmEmailType }> = [
  // New lead / inquiry
  { pattern: /new (inquiry|request|lead|booking request)/i, type: 'pcm_new_lead' },
  { pattern: /new client (inquiry|request)/i, type: 'pcm_new_lead' },
  { pattern: /interested in your services/i, type: 'pcm_new_lead' },
  { pattern: /looking for a (private )?chef/i, type: 'pcm_new_lead' },
  { pattern: /chef request/i, type: 'pcm_new_lead' },
  { pattern: /event inquiry/i, type: 'pcm_new_lead' },
  { pattern: /service request/i, type: 'pcm_new_lead' },
  { pattern: /wants to book/i, type: 'pcm_new_lead' },

  // Client messages
  { pattern: /new message from/i, type: 'pcm_client_message' },
  { pattern: /sent you a message/i, type: 'pcm_client_message' },
  { pattern: /replied to your/i, type: 'pcm_client_message' },
  { pattern: /client.*responded/i, type: 'pcm_client_message' },

  // Booking confirmed
  { pattern: /booking confirmed/i, type: 'pcm_booking_confirmed' },
  { pattern: /reservation confirmed/i, type: 'pcm_booking_confirmed' },
  { pattern: /has been confirmed/i, type: 'pcm_booking_confirmed' },
  { pattern: /confirmed booking/i, type: 'pcm_booking_confirmed' },
]

/**
 * Detect the PrivateChefManager email type from the subject line.
 * Optionally checks body text for additional signals.
 */
export function detectPcmEmailType(subject: string, body?: string): PcmEmailType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }
  if (body) {
    for (const { pattern, type } of TYPE_PATTERNS) {
      if (pattern.test(body)) return type
    }
  }
  return 'pcm_administrative'
}

// ─── Generic CTA Link Extraction ────────────────────────────────────────

function extractCtaLink(body: string): string | null {
  // Try platform-specific URLs first
  const platformLink =
    body.match(/href="(https?:\/\/(?:www\.)?privatechefmanager\.com\/[^"]+)"/i) ||
    body.match(/(https?:\/\/(?:www\.)?privatechefmanager\.com\/\S+)/i)
  if (platformLink?.[1]) return platformLink[1]

  // Fall back to any "View" or "Respond" CTA link
  const ctaMatch = body.match(
    /href="(https?:\/\/[^"]+)"[^>]*>(?:[^<]*(?:view|respond|reply|open|see|check)[^<]*)<\/a>/i
  )
  return ctaMatch?.[1] || null
}

// ─── Identity Key Collection ────────────────────────────────────────────

function collectIdentityKeys(body: string, ctaLink: string | null): string[] {
  const keys: string[] = []

  // Platform reference/order IDs
  const refMatch =
    body.match(/(?:Reference|Ref|Order|Booking|Request)\s*(?:#|ID|Number)?[:\s]*([A-Z0-9-]+)/i) ||
    body.match(/(?:#|ID)[:\s]*([A-Z0-9-]{4,})/i)
  if (refMatch?.[1]) keys.push(refMatch[1])

  // CTA link contains unique tokens
  if (ctaLink) {
    keys.push(ctaLink)
    // Extract path segments that look like IDs
    const idFromUrl = ctaLink.match(/\/(\d{4,}|[a-f0-9-]{8,})(?:\/|\?|$)/i)
    if (idFromUrl?.[1]) keys.push(idFromUrl[1])
  }

  return [...new Set(keys.filter(Boolean))]
}

// ─── Field Extraction - New Lead ────────────────────────────────────────

function parseLeadEmail(
  subject: string,
  body: string
): { data: PcmParsedLead; warnings: string[] } {
  const warnings: string[] = []
  warnings.push('Parser needs real email samples for tuning')

  // Client name from subject or body
  let clientName = 'Unknown'
  const nameFromSubject =
    subject.match(/(?:from|request from)\s+(.+?)(?:\s*[-!.|]|$)/i) ||
    subject.match(/^(.+?)\s+(?:is interested|wants to|is looking)/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    const nameFromBody =
      body.match(/(?:Client|Name|Customer|Guest)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/m) ||
      body.match(/(?:from|by)\s+([A-Z][a-z]+ [A-Z][a-z]+)/m)
    if (nameFromBody) {
      clientName = nameFromBody[1].trim()
    } else {
      warnings.push('Could not extract client name')
    }
  }

  // Location
  const locationMatch =
    body.match(/(?:Location|City|Area|Where|Address)[:\s]+(.+)/i) ||
    body.match(/(?:in|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/m)
  const location = locationMatch?.[1]?.trim() || null

  // Event date
  const dateMatch =
    body.match(/(?:Date|When|Event date|Service date)[:\s]+(.+)/i) ||
    body.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},?\s*\d{4})/m)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Guest count
  const guestMatch =
    body.match(/(?:Guests?|Number of (?:guests?|people)|Party size|How many)[:\s]+(.+)/i) ||
    body.match(/(\d+)\s*(?:guests?|people|attendees)/i)
  const guestCountText = guestMatch?.[1]?.trim() || null
  let guestCount: number | null = null
  if (guestCountText) {
    const num = guestCountText.match(/(\d+)/)
    if (num) guestCount = parseInt(num[1], 10)
    const range = guestCountText.match(/(\d+)\s*(?:to|-)\s*(\d+)/)
    if (range) guestCount = Math.ceil((parseInt(range[1], 10) + parseInt(range[2], 10)) / 2)
  }

  // Occasion
  const occasionMatch = body.match(/(?:Occasion|Event type|Type of event|Purpose)[:\s]+(.+)/i)
  const occasion = occasionMatch?.[1]?.trim() || null

  // Budget
  const budgetMatch =
    body.match(/(?:Budget|Price range|Estimated budget|Budget range)[:\s]+(.+)/i) ||
    body.match(/\$[\d,]+(?:\s*[-to]+\s*\$[\d,]+)?/i)
  const budgetText = budgetMatch?.[1]?.trim() || budgetMatch?.[0]?.trim() || null
  let budgetMinCents: number | null = null
  let budgetMaxCents: number | null = null
  if (budgetText) {
    const amounts = budgetText.match(/\$?([\d,]+(?:\.\d{2})?)/g)
    if (amounts && amounts.length >= 2) {
      budgetMinCents = Math.round(parseFloat(amounts[0].replace(/[$,]/g, '')) * 100)
      budgetMaxCents = Math.round(parseFloat(amounts[1].replace(/[$,]/g, '')) * 100)
    } else if (amounts && amounts.length === 1) {
      budgetMinCents = Math.round(parseFloat(amounts[0].replace(/[$,]/g, '')) * 100)
      budgetMaxCents = budgetMinCents
    }
  }

  // Dietary restrictions
  const dietaryMatch = body.match(
    /(?:Dietary|Diet|Allergies|Food restrictions|Dietary restrictions)[:\s]+(.+)/i
  )
  const dietaryRestrictions = dietaryMatch?.[1]?.trim() || null

  // Service type
  const serviceMatch = body.match(/(?:Service|Service type|Type of service|Looking for)[:\s]+(.+)/i)
  const serviceType = serviceMatch?.[1]?.trim() || null

  // CTA link and identity keys
  const ctaLink = extractCtaLink(body)
  const identityKeys = collectIdentityKeys(body, ctaLink)

  return {
    data: {
      clientName,
      location,
      eventDate,
      guestCount,
      guestCountText,
      occasion,
      budgetText,
      budgetMinCents,
      budgetMaxCents,
      dietaryRestrictions,
      serviceType,
      ctaLink,
      identityKeys,
    },
    warnings,
  }
}

// ─── Field Extraction - Client Message ──────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: PcmParsedMessage; warnings: string[] } {
  const warnings: string[] = []
  warnings.push('Parser needs real email samples for tuning')

  let clientName: string | null = null
  const nameMatch =
    subject.match(/(?:message from|from)\s+(.+?)(?:\s*[-!.|]|$)/i) ||
    subject.match(/^(.+?)\s+(?:sent you|replied)/i)
  if (nameMatch) clientName = nameMatch[1].trim()

  const previewMatch =
    body.match(/(?:Message|Says?|Wrote)[:\s]+"?(.+?)"?(?:\n|$)/i) ||
    body.match(/(?:Message preview)[:\s]+(.+)/i)
  const messagePreview = previewMatch?.[1]?.trim() || null

  const ctaLink = extractCtaLink(body)
  const identityKeys = collectIdentityKeys(body, ctaLink)

  return {
    data: { clientName, messagePreview, ctaLink, identityKeys },
    warnings,
  }
}

// ─── Field Extraction - Booking Confirmed ───────────────────────────────

function parseBookingEmail(
  subject: string,
  body: string
): { data: PcmParsedBooking; warnings: string[] } {
  const warnings: string[] = []
  warnings.push('Parser needs real email samples for tuning')

  let clientName: string | null = null
  const nameMatch =
    subject.match(/(?:from|with)\s+(.+?)(?:\s*[-!.|]|$)/i) ||
    body.match(/(?:Client|Customer|Booked by)[:\s]+(.+)/i)
  if (nameMatch) clientName = nameMatch[1].trim()

  const dateMatch = body.match(/(?:Date|When|Event date)[:\s]+(.+)/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  const locationMatch = body.match(/(?:Location|Where|Address)[:\s]+(.+)/i)
  const location = locationMatch?.[1]?.trim() || null

  const amountMatch =
    body.match(/(?:Amount|Price|Total|Cost)[:\s]*\$?([\d,.]+)/i) || body.match(/\$([\d,.]+)/i)
  const amountText = amountMatch?.[0]?.trim() || null
  let amountCents: number | null = null
  if (amountMatch?.[1]) {
    amountCents = Math.round(parseFloat(amountMatch[1].replace(/,/g, '')) * 100)
  }

  const ctaLink = extractCtaLink(body)
  const identityKeys = collectIdentityKeys(body, ctaLink)

  return {
    data: { clientName, eventDate, location, amountText, amountCents, ctaLink, identityKeys },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a PrivateChefManager email into structured data.
 * Call this ONLY after confirming `isPrivateChefManagerEmail(email.from.email)` is true.
 */
export function parsePrivateChefManagerEmail(email: ParsedEmail): PcmParseResult {
  const emailType = detectPcmEmailType(email.subject, email.body)
  const result: PcmParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'pcm_new_lead': {
      const { data, warnings } = parseLeadEmail(email.subject, email.body)
      result.lead = data
      result.parseWarnings = warnings
      break
    }
    case 'pcm_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'pcm_booking_confirmed': {
      const { data, warnings } = parseBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'pcm_administrative':
      break
  }

  return result
}
