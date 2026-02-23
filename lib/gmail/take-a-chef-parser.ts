// TakeAChef / Private Chef Manager Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (TakeAChef emails are consistently formatted),
// with Ollama fallback for edge cases.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── TakeAChef Email Types ────────────────────────────────────────────────

export type TacEmailType =
  | 'tac_new_inquiry'
  | 'tac_booking_confirmed'
  | 'tac_customer_info'
  | 'tac_client_message'
  | 'tac_payment'
  | 'tac_administrative'

export interface TacParsedInquiry {
  clientName: string
  location: string | null
  mealType: string | null
  eventDate: string | null
  guestCountText: string | null
  guestCountNumber: number | null
  pricePerPersonRange: string | null
  priceMinCents: number | null
  priceMaxCents: number | null
  experienceType: string | null
  foodPreferences: string | null
  dietaryRestrictions: string | null
  occasion: string | null
  clientNotes: string | null
  partnerName: string | null
  ctaLink: string | null
}

export interface TacParsedBooking {
  orderId: string
  amountUsd: number | null
  amountCents: number | null
  paymentGateway: string | null
  requestType: string | null
  address: string | null
  serviceDates: string | null
  occasion: string | null
  clientName: string | null
  partnerName: string | null
  ctaLink: string | null
}

export interface TacParsedCustomerInfo {
  guestName: string | null
  phoneNumber: string | null
  email: string | null
  partnerName: string | null
  bookingLocation: string | null
  bookingDate: string | null
  ctaLink: string | null
}

export interface TacParsedMessage {
  clientName: string | null
  eventDate: string | null
  ctaLink: string | null
}

export interface TacParseResult {
  emailType: TacEmailType
  inquiry?: TacParsedInquiry
  booking?: TacParsedBooking
  customerInfo?: TacParsedCustomerInfo
  message?: TacParsedMessage
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ────────────────────────────────────────────────────

const TAC_SENDER_DOMAINS = ['privatechefmanager.com', 'takeachef.com']

const TAC_KNOWN_SENDERS = ['info@privatechefmanager.com', 'noreply@privatechefmanager.com']

/**
 * Check if an email is from TakeAChef / Private Chef Manager.
 * Returns true if the sender domain or address matches known TakeAChef senders.
 */
export function isTakeAChefEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (TAC_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  return domain ? TAC_SENDER_DOMAINS.includes(domain) : false
}

// ─── Email Type Detection ────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: TacEmailType }> = [
  { pattern: /you just received a new request from/i, type: 'tac_new_inquiry' },
  { pattern: /new booking confirmed\s*\(order id/i, type: 'tac_booking_confirmed' },
  { pattern: /guest contact details for your upcoming booking/i, type: 'tac_customer_info' },
  { pattern: /you have a message for the on/i, type: 'tac_client_message' },
  // Payment patterns (TBD — refine when we get a sample payment email)
  { pattern: /payment (has been|confirmed|processed|sent)/i, type: 'tac_payment' },
  { pattern: /your payout/i, type: 'tac_payment' },
  { pattern: /transfer.*completed/i, type: 'tac_payment' },
]

/**
 * Detect the TakeAChef email type from the subject line.
 */
export function detectTacEmailType(subject: string): TacEmailType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }
  return 'tac_administrative'
}

// ─── Field Extraction — New Inquiry ──────────────────────────────────────

function parseInquiryEmail(
  subject: string,
  body: string
): { data: TacParsedInquiry; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "...request from {Name}!"
  const nameMatch = subject.match(/request from\s+(.+?)[\s!]*$/i)
  const clientName = nameMatch?.[1]?.trim() || 'Unknown'
  if (!nameMatch) warnings.push('Could not extract client name from subject')

  // Location
  const locationMatch = body.match(/Location:\s*(.+)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Meal type
  const mealMatch = body.match(/Meal:\s*(.+)/i)
  const mealType = mealMatch?.[1]?.trim() || null

  // Date
  const dateMatch = body.match(/Date:\s*(.+)/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // Guest count — "No. of guests: Mid-size group (7 to 15 people)" or similar
  const guestMatch = body.match(/No\.\s*of\s*guests?:\s*(.+)/i)
  const guestCountText = guestMatch?.[1]?.trim() || null
  let guestCountNumber: number | null = null
  if (guestCountText) {
    // Try to extract a single number
    const singleNum = guestCountText.match(/(\d+)\s*(?:people|guests|adults)/i)
    if (singleNum) {
      guestCountNumber = parseInt(singleNum[1], 10)
    } else {
      // Try range like "7 to 15" — take the midpoint
      const rangeMatch = guestCountText.match(/(\d+)\s*(?:to|-)\s*(\d+)/)
      if (rangeMatch) {
        guestCountNumber = Math.ceil(
          (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2
        )
      }
    }
  }

  // Price per person — "Price per person: from 101 USD to 174 USD"
  const priceMatch = body.match(/Price per person:\s*(.+)/i)
  const pricePerPersonRange = priceMatch?.[1]?.trim() || null
  let priceMinCents: number | null = null
  let priceMaxCents: number | null = null
  if (pricePerPersonRange) {
    const priceNums = pricePerPersonRange.match(/(\d+)\s*USD/gi)
    if (priceNums && priceNums.length >= 2) {
      priceMinCents = parseInt(priceNums[0].replace(/[^\d]/g, ''), 10) * 100
      priceMaxCents = parseInt(priceNums[1].replace(/[^\d]/g, ''), 10) * 100
    } else if (priceNums && priceNums.length === 1) {
      priceMinCents = parseInt(priceNums[0].replace(/[^\d]/g, ''), 10) * 100
      priceMaxCents = priceMinCents
    }
  }

  // Type of experience
  const experienceMatch = body.match(/Type of experience:\s*(.+)/i)
  const experienceType = experienceMatch?.[1]?.trim() || null

  // Food preferences
  const foodPrefMatch = body.match(/Food preferences:\s*(.+)/i)
  const foodPreferences = foodPrefMatch?.[1]?.trim() || null

  // Dietary restrictions
  const dietaryMatch = body.match(/Dietary (?:restrictions|requirements):\s*(.+)/i)
  const dietaryRestrictions = dietaryMatch?.[1]?.trim() || null

  // Occasion
  const occasionMatch = body.match(/Occasion:\s*(.+)/i)
  const occasion = occasionMatch?.[1]?.trim() || null

  // Client notes — everything between "SOMETHING TO ADD" and "PARTNER"
  const notesMatch = body.match(
    /SOMETHING TO ADD[\s\S]*?Notes?:\s*([\s\S]*?)(?=PARTNER|If you are interested|$)/i
  )
  const clientNotes = notesMatch?.[1]?.trim() || null

  // Partner
  const partnerMatch = body.match(/(?:PARTNER|Partner)[\s\S]*?Name:\s*(.+)/i)
  const partnerName = partnerMatch?.[1]?.trim() || null

  // CTA link — look for "Send proposal" href
  const ctaMatch = body.match(/href="([^"]*)"[^>]*>(?:[^<]*?)(?:Send proposal|View request)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      location,
      mealType,
      eventDate,
      guestCountText,
      guestCountNumber,
      pricePerPersonRange,
      priceMinCents,
      priceMaxCents,
      experienceType,
      foodPreferences,
      dietaryRestrictions,
      occasion,
      clientNotes,
      partnerName,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Booking Confirmed ────────────────────────────────

function parseBookingEmail(
  subject: string,
  body: string
): { data: TacParsedBooking; warnings: string[] } {
  const warnings: string[] = []

  // Order ID from subject: "New booking confirmed (Order ID: 7714634)"
  const orderMatch = subject.match(/Order ID:\s*(\d+)/i)
  const orderId = orderMatch?.[1] || ''
  if (!orderId) warnings.push('Could not extract Order ID from subject')

  // Amount — "Amount: 1000 USD"
  const amountMatch = body.match(/Amount:\s*([\d,.]+)\s*USD/i)
  const amountUsd = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null
  const amountCents = amountUsd !== null ? Math.round(amountUsd * 100) : null

  // Payment gateway — "Payment gateway: Stripe (Domestic)"
  const gatewayMatch = body.match(/Payment gateway:\s*(.+)/i)
  const paymentGateway = gatewayMatch?.[1]?.trim() || null

  // Request type — "Request: Multiple services"
  const requestMatch = body.match(/Request:\s*(.+)/i)
  const requestType = requestMatch?.[1]?.trim() || null

  // Address — "Address: North Conway, Conway, NH"
  const addressMatch = body.match(/Address:\s*(.+)/i)
  const address = addressMatch?.[1]?.trim() || null

  // Service dates — "Service dates: 18 Sept 2025 - 21 Sept 2025"
  const datesMatch = body.match(/Service date[s]?:\s*(.+)/i)
  const serviceDates = datesMatch?.[1]?.trim() || null

  // Occasion — "Occasion: Dinner"
  const occasionMatch = body.match(/Occasion:\s*(.+)/i)
  const occasion = occasionMatch?.[1]?.trim() || null

  // Guests (client name) — "Guests: Jessica Zoll"
  const guestsMatch = body.match(/Guests?:\s*(.+)/i)
  const clientName = guestsMatch?.[1]?.trim() || null

  // Partner — "Partner: Take a Chef"
  const partnerMatch = body.match(/Partner:\s*(.+)/i)
  const partnerName = partnerMatch?.[1]?.trim() || null

  // CTA link — "Manage your guest"
  const ctaMatch = body.match(/href="([^"]*)"[^>]*>(?:[^<]*?)(?:Manage your guest)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      orderId,
      amountUsd,
      amountCents,
      paymentGateway,
      requestType,
      address,
      serviceDates,
      occasion,
      clientName,
      partnerName,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Customer Information ─────────────────────────────

function parseCustomerInfoEmail(
  subject: string,
  body: string
): { data: TacParsedCustomerInfo; warnings: string[] } {
  const warnings: string[] = []

  // Guest name — "Guest name: Jessica Zoll"
  const nameMatch = body.match(/Guest name:\s*(.+)/i)
  const guestName = nameMatch?.[1]?.trim() || null
  if (!guestName) warnings.push('Could not extract guest name from customer info email')

  // Phone number — "Phone number: +1 XXXXXXXXXX"
  const phoneMatch = body.match(/Phone (?:number|#):\s*(\+?[\d\s()-]+)/i)
  const phoneNumber = phoneMatch?.[1]?.trim() || null

  // Email (may not always be present)
  const emailMatch = body.match(/(?:Email|E-mail):\s*([\w.+-]+@[\w.-]+)/i)
  const email = emailMatch?.[1]?.trim() || null

  // Partner
  const partnerMatch = body.match(/Partner:\s*(.+)/i)
  const partnerName = partnerMatch?.[1]?.trim() || null

  // Booking location + date from greeting text
  // "Your upcoming booking in North Conway, Conway, NH on 18 de septiembre de 2025"
  const contextMatch = body.match(/upcoming booking in\s+(.+?)\s+on\s+(.+?)(?:\s+is|\s*\.)/i)
  const bookingLocation = contextMatch?.[1]?.trim() || null
  const bookingDate = contextMatch?.[2]?.trim() || null

  // CTA link — "Manage your guest"
  const ctaMatch = body.match(/href="([^"]*)"[^>]*>(?:[^<]*?)(?:Manage your guest)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      guestName,
      phoneNumber,
      email,
      partnerName,
      bookingLocation,
      bookingDate,
      ctaLink,
    },
    warnings,
  }
}

// ─── Field Extraction — Client Message ───────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: TacParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Client name from body: "Your guest Jessica Zoll has sent you a message"
  const nameMatch = body.match(/Your guest\s+(.+?)\s+has sent you a message/i)
  const clientName = nameMatch?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from message notification')

  // Event date from subject: "You have a message for the on 18 September 2025"
  const dateMatch = subject.match(/for the on\s+(.+?)(?:\s*📬|\s*$)/i)
  const eventDate = dateMatch?.[1]?.trim() || null

  // CTA link — "Guest's message"
  const ctaMatch = body.match(/href="([^"]*)"[^>]*>(?:[^<]*?)(?:Guest's message|View message)/i)
  const ctaLink = ctaMatch?.[1] || null

  return {
    data: {
      clientName,
      eventDate,
      ctaLink,
    },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a TakeAChef email into structured data.
 * Call this ONLY after confirming `isTakeAChefEmail(email.from.email)` is true.
 */
export function parseTakeAChefEmail(email: ParsedEmail): TacParseResult {
  const emailType = detectTacEmailType(email.subject)
  const result: TacParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'tac_new_inquiry': {
      const { data, warnings } = parseInquiryEmail(email.subject, email.body)
      result.inquiry = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_booking_confirmed': {
      const { data, warnings } = parseBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_customer_info': {
      const { data, warnings } = parseCustomerInfoEmail(email.subject, email.body)
      result.customerInfo = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_payment':
    case 'tac_administrative':
      // No structured extraction needed — just log the type
      break
  }

  return result
}
