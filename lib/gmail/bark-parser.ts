// Bark.com Lead Generation Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (Bark emails are consistently formatted),
// with Ollama fallback for edge cases.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── Bark Email Types ───────────────────────────────────────────────────

export type BarkEmailType =
  | 'bark_new_lead'
  | 'bark_client_message'
  | 'bark_lead_update'
  | 'bark_administrative'

export interface BarkParsedLead {
  clientName: string
  projectDescription: string | null
  location: string | null
  eventDate: string | null
  guestCount: string | null
  guestCountNumber: number | null
  budgetText: string | null
  ctaLink: string | null
}

export interface BarkParsedMessage {
  clientName: string | null
  messagePreview: string | null
  ctaLink: string | null
}

export interface BarkParsedUpdate {
  clientName: string | null
  updateDetails: string | null
  ctaLink: string | null
}

export interface BarkParseResult {
  emailType: BarkEmailType
  lead?: BarkParsedLead
  message?: BarkParsedMessage
  update?: BarkParsedUpdate
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ───────────────────────────────────────────────────

const BARK_SENDER_DOMAINS = ['bark.com']

const BARK_KNOWN_SENDERS = [
  'noreply@bark.com',
  'leads@bark.com',
  'notifications@bark.com',
  'info@bark.com',
  'support@bark.com',
]

/**
 * Check if an email is from Bark.com.
 * Returns true if the sender domain or address matches known Bark senders.
 */
export function isBarkEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (BARK_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return domain ? BARK_SENDER_DOMAINS.includes(domain) : false
}

// ─── Email Type Detection ───────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: BarkEmailType }> = [
  // New lead patterns — AGGRESSIVE matching
  { pattern: /new (lead|request|opportunity)/i, type: 'bark_new_lead' },
  { pattern: /needs a.*(chef|caterer|cook)/i, type: 'bark_new_lead' },
  { pattern: /looking for.*(chef|caterer|cook)/i, type: 'bark_new_lead' },
  { pattern: /someone.*needs/i, type: 'bark_new_lead' },
  { pattern: /new bark/i, type: 'bark_new_lead' },
  { pattern: /request in your area/i, type: 'bark_new_lead' },
  { pattern: /you have a new lead/i, type: 'bark_new_lead' },
  { pattern: /new request nearby/i, type: 'bark_new_lead' },
  { pattern: /private chef.*request/i, type: 'bark_new_lead' },
  { pattern: /catering.*request/i, type: 'bark_new_lead' },

  // Client message patterns
  { pattern: /new message/i, type: 'bark_client_message' },
  { pattern: /reply from/i, type: 'bark_client_message' },
  { pattern: /responded/i, type: 'bark_client_message' },
  { pattern: /message from/i, type: 'bark_client_message' },

  // Lead update patterns
  { pattern: /lead update/i, type: 'bark_lead_update' },
  { pattern: /more details/i, type: 'bark_lead_update' },
  { pattern: /updated.*request/i, type: 'bark_lead_update' },

  // Administrative patterns (checked last — catch-all before fallback)
  { pattern: /credit/i, type: 'bark_administrative' },
  { pattern: /review/i, type: 'bark_administrative' },
  { pattern: /account/i, type: 'bark_administrative' },
  { pattern: /newsletter/i, type: 'bark_administrative' },
  { pattern: /bark pro/i, type: 'bark_administrative' },
]

/**
 * Detect the Bark email type from the subject line.
 * Optionally accepts body for secondary detection when subject is ambiguous.
 */
export function detectBarkEmailType(subject: string, body?: string): BarkEmailType {
  // Check subject first
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }

  // Fall back to body scan if subject was ambiguous
  if (body) {
    // Look for strong lead indicators in body
    if (/respond to this lead/i.test(body)) return 'bark_new_lead'
    if (/send a quote/i.test(body)) return 'bark_new_lead'
    if (/view this lead/i.test(body)) return 'bark_new_lead'
    if (/new message from/i.test(body)) return 'bark_client_message'
    if (/has updated their request/i.test(body)) return 'bark_lead_update'
  }

  return 'bark_administrative'
}

// ─── Field Extraction — New Lead ────────────────────────────────────────

function parseLeadEmail(
  subject: string,
  body: string
): { data: BarkParsedLead; warnings: string[] } {
  const warnings: string[] = []

  // Client name — try multiple patterns
  // Subject: "[Name] needs a Private Chef" or "New lead: [Name]"
  let clientName = 'Unknown'
  const nameFromSubject =
    subject.match(/^(.+?)\s+needs\s+a/i) ||
    subject.match(/new lead[:\s]+(.+?)(?:\s*[-–—]|$)/i) ||
    subject.match(/request from\s+(.+?)(?:\s*[-–—!]|$)/i)
  if (nameFromSubject) {
    clientName = nameFromSubject[1].trim()
  } else {
    // Try body: "Name: John Smith" or "Customer: John Smith" or "From: John Smith"
    const nameFromBody = body.match(
      /(?:Name|Customer|Client|From|Buyer)[\s:]+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/
    )
    if (nameFromBody) {
      clientName = nameFromBody[1].trim()
    } else {
      warnings.push('Could not extract client name from subject or body')
    }
  }

  // Project description — what they need
  const descMatch =
    body.match(/(?:Service|Request|Looking for|They need|Project|Description)[\s:]+(.+)/i) ||
    body.match(/(?:needs?\s+a\s+)(.+?)(?:\s+in\s+|\s+for\s+|\s*\.)/i)
  const projectDescription = descMatch?.[1]?.trim() || null

  // Location — city/area
  const locationMatch =
    body.match(/(?:Location|Area|City|Where|Postcode area)[\s:]+(.+)/i) ||
    body.match(/(?:in|near|around)\s+([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/m)
  const location = locationMatch?.[1]?.trim() || null

  // Event date
  const dateMatch =
    body.match(/(?:Date|When|Event date|Start date)[\s:]+(.+)/i) ||
    body.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Guest count
  const guestMatch =
    body.match(/(?:Guests?|Number of guests?|Party size|People|How many)[\s:]+(.+)/i) ||
    body.match(/(\d+)\s*(?:guests?|people|persons?|diners?)/i)
  const guestCount = guestMatch?.[1]?.trim() || null
  let guestCountNumber: number | null = null
  if (guestCount) {
    // Try to extract a single number
    const singleNum = guestCount.match(/(\d+)/)
    if (singleNum) {
      guestCountNumber = parseInt(singleNum[1], 10)
    }
    // Try range like "10-20" or "10 to 20" — take the midpoint
    const rangeMatch = guestCount.match(/(\d+)\s*(?:to|-)\s*(\d+)/)
    if (rangeMatch) {
      guestCountNumber = Math.ceil((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2)
    }
  }

  // Budget
  const budgetMatch =
    body.match(/(?:Budget|Price range|Willing to spend|Estimated budget)[\s:]+(.+)/i) ||
    body.match(/[£$€]\s*[\d,.]+(?:\s*[-–—to]+\s*[£$€]?\s*[\d,.]+)?/i)
  const budgetText = budgetMatch?.[1]?.trim() || budgetMatch?.[0]?.trim() || null

  // CTA link — Bark URL to respond
  const ctaMatch =
    body.match(
      /href="(https?:\/\/(?:www\.)?bark\.com[^"]*)"[^>]*>(?:[^<]*?)(?:Respond|View|Send|Reply|Contact)/i
    ) || body.match(/(https?:\/\/(?:www\.)?bark\.com\/\S+)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      projectDescription,
      location,
      eventDate,
      guestCount,
      guestCountNumber,
      budgetText,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Client Message ──────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: BarkParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "New message from [Name]" or "Reply from [Name]"
  const nameMatch =
    subject.match(/(?:message|reply) from\s+(.+?)(?:\s*[-–—!]|$)/i) ||
    subject.match(/^(.+?)\s+responded/i)
  const clientName = nameMatch?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from message notification')

  // Message preview — look for quoted or preview text in body
  const previewMatch =
    body.match(/(?:Message|They said|Their message)[\s:]+(.+)/i) || body.match(/"([^"]{5,})"/m)
  const messagePreview = previewMatch?.[1]?.trim() || null

  // CTA link
  const ctaMatch =
    body.match(
      /href="(https?:\/\/(?:www\.)?bark\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View|Reply|Respond|Read)/i
    ) || body.match(/(https?:\/\/(?:www\.)?bark\.com\/\S+)/i)
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

// ─── Field Extraction — Lead Update ─────────────────────────────────────

function parseUpdateEmail(
  subject: string,
  body: string
): { data: BarkParsedUpdate; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "More details from [Name]" or "[Name] updated their request"
  const nameMatch =
    subject.match(/(?:details|update) from\s+(.+?)(?:\s*[-–—!]|$)/i) ||
    subject.match(/^(.+?)\s+updated/i)
  const clientName = nameMatch?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from lead update')

  // Update details — look for "Updated:" or "Changed:" or "Additional details:" blocks
  const detailsMatch =
    body.match(/(?:Updated|Changed|Additional details?|New details?)[\s:]+(.+)/i) ||
    body.match(/(?:has updated|has changed|added more details)[\s\S]*?:\s*(.+)/i)
  const updateDetails = detailsMatch?.[1]?.trim() || null

  // CTA link
  const ctaMatch =
    body.match(
      /href="(https?:\/\/(?:www\.)?bark\.com[^"]*)"[^>]*>(?:[^<]*?)(?:View|See|Check|Respond)/i
    ) || body.match(/(https?:\/\/(?:www\.)?bark\.com\/\S+)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      updateDetails,
      ctaLink,
    },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a Bark.com email into structured data.
 * Call this ONLY after confirming `isBarkEmail(email.from.email)` is true.
 */
export function parseBarkEmail(email: ParsedEmail): BarkParseResult {
  const emailType = detectBarkEmailType(email.subject, email.body)
  const result: BarkParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'bark_new_lead': {
      const { data, warnings } = parseLeadEmail(email.subject, email.body)
      result.lead = data
      result.parseWarnings = warnings
      break
    }
    case 'bark_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'bark_lead_update': {
      const { data, warnings } = parseUpdateEmail(email.subject, email.body)
      result.update = data
      result.parseWarnings = warnings
      break
    }
    case 'bark_administrative':
      // No structured extraction needed — just log the type
      break
  }

  return result
}
