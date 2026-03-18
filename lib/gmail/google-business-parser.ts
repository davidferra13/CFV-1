// Google Business Profile Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (Google Business emails follow consistent patterns),
// with Ollama fallback for edge cases.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── Google Business Email Types ────────────────────────────────────────

export type GoogleBusinessEmailType =
  | 'gbp_new_message'
  | 'gbp_new_review'
  | 'gbp_booking'
  | 'gbp_administrative'

export interface GbpParsedMessage {
  senderName: string | null
  messageContent: string | null
  businessName: string | null
  ctaLink: string | null
}

export interface GbpParsedReview {
  reviewerName: string | null
  rating: number | null
  reviewText: string | null
  businessName: string | null
  ctaLink: string | null
}

export interface GbpParsedBooking {
  customerName: string | null
  bookingDate: string | null
  bookingTime: string | null
  partySize: number | null
  businessName: string | null
  ctaLink: string | null
}

export interface GoogleBusinessParseResult {
  emailType: GoogleBusinessEmailType
  message?: GbpParsedMessage
  review?: GbpParsedReview
  booking?: GbpParsedBooking
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ───────────────────────────────────────────────────

const GBP_SENDER_DOMAINS = ['google.com']

const GBP_KNOWN_SENDERS = [
  'noreply@google.com',
  'business-noreply@google.com',
  'notifications-noreply@google.com',
]

/**
 * Subject/body keywords that indicate a Google Business Profile email.
 * Used to distinguish GBP notifications from other Google emails
 * (Ads, Workspace, Play, YouTube, security, etc.)
 */
const GBP_SUBJECT_INDICATORS = [
  /new message.*(business|google|profile)/i,
  /messaged your business/i,
  /sent.*message.*google/i,
  /message on google/i,
  /customer.*message/i,
  /someone messaged/i,
  /new review/i,
  /left.*review/i,
  /review on google/i,
  /google review/i,
  /new (booking|reservation).*google/i,
  /google.*reserv/i,
  /business profile/i,
  /google my business/i,
  /your business on google/i,
  /google business/i,
]

/**
 * Check if an email is from Google Business Profile.
 * CRITICAL: More selective than other parsers because google.com sends
 * many non-business emails. Checks BOTH sender domain AND subject/body
 * for business profile indicators.
 *
 * Pass subject and body as extra context for accurate detection.
 * When called with only fromAddress, falls back to known GBP sender
 * addresses only (not generic @google.com).
 */
export function isGoogleBusinessEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()

  // Exact known GBP senders - always match
  if (GBP_KNOWN_SENDERS.includes(lower)) return true

  // Generic @google.com - NOT enough on its own
  // We only match known senders above. For generic @google.com addresses,
  // the caller should use detectGoogleBusinessEmailType to confirm the
  // subject/body match before treating it as a GBP email.
  const domain = lower.split('@')[1]
  if (!domain || !GBP_SENDER_DOMAINS.includes(domain)) return false

  // It's from @google.com but not a known GBP sender.
  // Return false - the caller must additionally check the subject.
  return false
}

/**
 * Enhanced sender check that also considers the email subject.
 * Use this when you have both the sender and subject available.
 * Returns true only if the sender is from google.com AND the subject
 * contains business profile indicators.
 */
export function isGoogleBusinessEmailWithSubject(fromAddress: string, subject: string): boolean {
  // Known GBP senders always match
  if (isGoogleBusinessEmail(fromAddress)) return true

  // For generic @google.com, require subject match
  const lower = fromAddress.toLowerCase().trim()
  const domain = lower.split('@')[1]
  if (!domain || !GBP_SENDER_DOMAINS.includes(domain)) return false

  // Check if subject contains any GBP indicator
  return GBP_SUBJECT_INDICATORS.some((pattern) => pattern.test(subject))
}

// ─── Email Type Detection ───────────────────────────────────────────────

const MESSAGE_PATTERNS: RegExp[] = [
  /new message.*(business|google|profile)/i,
  /messaged your business/i,
  /sent.*message.*google/i,
  /message on google/i,
  /customer.*message/i,
  /someone messaged/i,
  /you have a new message/i,
  /new message from/i,
]

const REVIEW_PATTERNS: RegExp[] = [
  /new review/i,
  /left.*review/i,
  /review on google/i,
  /google review/i,
  /you have a new review/i,
  /wrote a review/i,
]

const BOOKING_PATTERNS: RegExp[] = [
  /new (booking|reservation).*google/i,
  /google.*reserv/i,
  /new booking/i,
  /new reservation/i,
]

/**
 * Detect the Google Business email type from the subject line.
 * Optionally accepts body text for additional signal.
 */
export function detectGoogleBusinessEmailType(
  subject: string,
  body?: string
): GoogleBusinessEmailType {
  const text = body ? `${subject} ${body}` : subject

  // Check message patterns first (most common)
  for (const pattern of MESSAGE_PATTERNS) {
    if (pattern.test(subject)) return 'gbp_new_message'
  }

  // Check review patterns
  for (const pattern of REVIEW_PATTERNS) {
    if (pattern.test(subject)) return 'gbp_new_review'
  }

  // Check booking patterns
  for (const pattern of BOOKING_PATTERNS) {
    if (pattern.test(subject)) return 'gbp_booking'
  }

  // If subject didn't match, try body for message/review signals
  if (body) {
    for (const pattern of MESSAGE_PATTERNS) {
      if (pattern.test(body)) return 'gbp_new_message'
    }
    for (const pattern of REVIEW_PATTERNS) {
      if (pattern.test(body)) return 'gbp_new_review'
    }
    for (const pattern of BOOKING_PATTERNS) {
      if (pattern.test(body)) return 'gbp_booking'
    }
  }

  return 'gbp_administrative'
}

// ─── Field Extraction - New Message ─────────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: GbpParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Sender name from subject: "New message from {Name}" or "{Name} sent you a message"
  let senderName: string | null = null
  const nameFromSubject =
    subject.match(/new message from\s+(.+?)(?:\s+on\s+google|\s*$)/i) ||
    subject.match(/(.+?)\s+sent you a message/i) ||
    subject.match(/(.+?)\s+messaged your business/i)
  if (nameFromSubject) {
    senderName = nameFromSubject[1].trim()
  }

  // Fallback: try body for sender name
  if (!senderName) {
    const nameFromBody =
      body.match(/message from\s+(.+?)(?:\s*[:\n.])/i) ||
      body.match(/(.+?)\s+sent you a message/i) ||
      body.match(/from:\s*(.+?)(?:\s*\n)/i)
    if (nameFromBody) {
      senderName = nameFromBody[1].trim()
    }
  }

  if (!senderName) warnings.push('Could not extract sender name from message notification')

  // Message content - typically in a quoted block or after a label
  let messageContent: string | null = null
  const contentMatch =
    body.match(/(?:message|said|wrote)[:\s]*[""](.+?)[""]/i) ||
    body.match(/(?:message|said|wrote)[:\s]*\n\s*(.+?)(?:\n\n|\n[A-Z])/is) ||
    body.match(/"(.+?)"/i)
  if (contentMatch) {
    messageContent = contentMatch[1].trim()
  }

  // Business name - "on [Business Name]" or "your business [Business Name]"
  let businessName: string | null = null
  const businessMatch =
    body.match(
      /(?:on|for)\s+(?:your business\s+)?[""]?([^"""\n]+?)[""]?\s+(?:on google|profile)/i
    ) ||
    body.match(/business(?:\s+profile)?:\s*(.+?)(?:\n|$)/i) ||
    subject.match(/on\s+(.+?)(?:\s+on google|\s*$)/i)
  if (businessMatch) {
    businessName = businessMatch[1].trim()
  }

  // CTA link - "Reply" or "View message" or "Respond" button
  const ctaMatch = body.match(
    /href="([^"]*)"[^>]*>(?:[^<]*?)(?:Reply|View message|Respond|See message|Open message)/i
  )
  const ctaLink = ctaMatch?.[1] || null

  // Fallback CTA: any Google Business URL
  const fallbackCta = !ctaLink
    ? body.match(/href="(https:\/\/(?:business|maps)\.google\.com[^"]*)"/i)
    : null
  const finalCtaLink = ctaLink || fallbackCta?.[1] || null

  return {
    data: {
      senderName,
      messageContent,
      businessName,
      ctaLink: finalCtaLink,
    },
    warnings,
  }
}

// ─── Field Extraction - New Review ──────────────────────────────────────

function parseReviewEmail(
  subject: string,
  body: string
): { data: GbpParsedReview; warnings: string[] } {
  const warnings: string[] = []

  // Reviewer name from subject: "{Name} left a review" or "New review from {Name}"
  let reviewerName: string | null = null
  const nameMatch =
    subject.match(/(.+?)\s+left\s+(?:a\s+)?review/i) ||
    subject.match(/new review (?:from|by)\s+(.+?)(?:\s+on\s+google|\s*$)/i)
  if (nameMatch) {
    reviewerName = nameMatch[1].trim()
  }

  // Fallback: try body
  if (!reviewerName) {
    const bodyNameMatch =
      body.match(/review (?:from|by)\s+(.+?)(?:\s*[:\n.])/i) ||
      body.match(/(.+?)\s+(?:left|wrote|posted)\s+(?:a\s+)?review/i)
    if (bodyNameMatch) {
      reviewerName = bodyNameMatch[1].trim()
    }
  }

  if (!reviewerName) warnings.push('Could not extract reviewer name from review notification')

  // Rating - look for star count or numeric rating
  let rating: number | null = null
  const ratingMatch =
    body.match(/(\d)\s*(?:star|★|⭐)/i) ||
    body.match(/rating[:\s]*(\d)(?:\s*\/\s*5)?/i) ||
    body.match(/(\d)\s*out of\s*5/i)
  if (ratingMatch) {
    const parsed = parseInt(ratingMatch[1], 10)
    if (parsed >= 1 && parsed <= 5) {
      rating = parsed
    }
  }

  // Count stars in body (e.g., "★★★★☆")
  if (rating === null) {
    const starChars = body.match(/[★⭐]{1,5}/g)
    if (starChars && starChars.length > 0) {
      const longest = starChars.reduce((a, b) => (a.length > b.length ? a : b))
      if (longest.length >= 1 && longest.length <= 5) {
        rating = longest.length
      }
    }
  }

  // Review text - quoted content or after rating
  let reviewText: string | null = null
  const textMatch =
    body.match(/(?:review|said|wrote)[:\s]*[""](.+?)[""]/i) ||
    body.match(/(?:review|said|wrote)[:\s]*\n\s*(.+?)(?:\n\n|\n[A-Z])/is) ||
    body.match(/"(.{10,})"/i) // quoted text at least 10 chars
  if (textMatch) {
    reviewText = textMatch[1].trim()
  }

  // Business name
  let businessName: string | null = null
  const businessMatch =
    body.match(/review (?:on|for)\s+(.+?)(?:\n|$)/i) ||
    subject.match(/review (?:on|for)\s+(.+?)(?:\s*$)/i)
  if (businessMatch) {
    businessName = businessMatch[1].trim()
  }

  // CTA link - "View review" or "Reply to review" or "See review"
  const ctaMatch = body.match(
    /href="([^"]*)"[^>]*>(?:[^<]*?)(?:View review|Reply to review|See review|Read review|Respond)/i
  )
  const ctaLink = ctaMatch?.[1] || null

  // Fallback CTA: Google Business URL
  const fallbackCta = !ctaLink
    ? body.match(/href="(https:\/\/(?:business|maps)\.google\.com[^"]*)"/i)
    : null
  const finalCtaLink = ctaLink || fallbackCta?.[1] || null

  return {
    data: {
      reviewerName,
      rating,
      reviewText,
      businessName,
      ctaLink: finalCtaLink,
    },
    warnings,
  }
}

// ─── Field Extraction - Booking ─────────────────────────────────────────

function parseBookingEmail(
  subject: string,
  body: string
): { data: GbpParsedBooking; warnings: string[] } {
  const warnings: string[] = []

  // Customer name
  let customerName: string | null = null
  const nameMatch =
    body.match(/(?:customer|guest|booked by|name)[:\s]+(.+?)(?:\n|$)/i) ||
    body.match(/(.+?)\s+(?:made a|has a)\s+(?:booking|reservation)/i) ||
    subject.match(/(?:booking|reservation)\s+(?:from|by)\s+(.+?)(?:\s*$)/i)
  if (nameMatch) {
    customerName = nameMatch[1].trim()
  }

  if (!customerName) warnings.push('Could not extract customer name from booking notification')

  // Booking date
  let bookingDate: string | null = null
  const dateMatch =
    body.match(/(?:date|when|on)[:\s]+(\w+ \d{1,2},?\s*\d{4})/i) ||
    body.match(/(?:date|when|on)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    body.match(/(\w+ \d{1,2},?\s*\d{4})\s+at\s+/i)
  if (dateMatch) {
    bookingDate = dateMatch[1].trim()
  }

  // Booking time
  let bookingTime: string | null = null
  const timeMatch =
    body.match(/(?:time|at)[:\s]+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i) ||
    body.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i)
  if (timeMatch) {
    bookingTime = timeMatch[1].trim()
  }

  // Party size
  let partySize: number | null = null
  const sizeMatch =
    body.match(/(?:party size|guests?|people|covers?)[:\s]+(\d+)/i) ||
    body.match(/(\d+)\s+(?:guests?|people|covers?)/i) ||
    body.match(/for\s+(\d+)/i)
  if (sizeMatch) {
    const parsed = parseInt(sizeMatch[1], 10)
    if (parsed > 0 && parsed < 1000) {
      partySize = parsed
    }
  }

  // Business name
  let businessName: string | null = null
  const businessMatch =
    body.match(/(?:booking|reservation)\s+(?:at|for)\s+(.+?)(?:\n|$)/i) ||
    body.match(/business(?:\s+profile)?:\s*(.+?)(?:\n|$)/i)
  if (businessMatch) {
    businessName = businessMatch[1].trim()
  }

  // CTA link - "View booking" or "Manage booking"
  const ctaMatch = body.match(
    /href="([^"]*)"[^>]*>(?:[^<]*?)(?:View booking|Manage booking|See booking|Confirm booking|View reservation)/i
  )
  const ctaLink = ctaMatch?.[1] || null

  // Fallback CTA: Google Business URL
  const fallbackCta = !ctaLink
    ? body.match(/href="(https:\/\/(?:business|maps)\.google\.com[^"]*)"/i)
    : null
  const finalCtaLink = ctaLink || fallbackCta?.[1] || null

  return {
    data: {
      customerName,
      bookingDate,
      bookingTime,
      partySize,
      businessName,
      ctaLink: finalCtaLink,
    },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a Google Business Profile email into structured data.
 * Call this ONLY after confirming `isGoogleBusinessEmail(email.from.email)` or
 * `isGoogleBusinessEmailWithSubject(email.from.email, email.subject)` is true.
 */
export function parseGoogleBusinessEmail(email: ParsedEmail): GoogleBusinessParseResult {
  const emailType = detectGoogleBusinessEmailType(email.subject, email.body)
  const result: GoogleBusinessParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'gbp_new_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'gbp_new_review': {
      const { data, warnings } = parseReviewEmail(email.subject, email.body)
      result.review = data
      result.parseWarnings = warnings
      break
    }
    case 'gbp_booking': {
      const { data, warnings } = parseBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'gbp_administrative':
      // No structured extraction needed - just log the type
      break
  }

  return result
}
